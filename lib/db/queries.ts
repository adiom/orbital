import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNull,
  lt,
  or,
  type SQL,
} from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { ArtifactKind } from "@/components/artifact";
import type { VisibilityType } from "@/components/visibility-selector";
import { ChatSDKError } from "../errors";
import type { AppUsage } from "../usage";
import { generateUUID } from "../utils";
import {
  area,
  areaDocument,
  areaMember,
  areaMergeProposal,
  type Chat,
  chat,
  chatMember,
  type DBMessage,
  document,
  message,
  type Suggestion,
  stream,
  suggestion,
  type User,
  user,
  vote,
} from "./schema";
import { generateHashedPassword } from "./utils";

// Optionally, if not using email/pass login, you can
// use the Drizzle adapter for Auth.js / NextAuth
// https://authjs.dev/reference/adapter/drizzle

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export async function getUser(email: string): Promise<User[]> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get user by email"
    );
  }
}

export async function createUser(email: string, password: string) {
  const hashedPassword = generateHashedPassword(password);

  try {
    return await db.insert(user).values({ email, password: hashedPassword });
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to create user");
  }
}

export async function createGuestUser() {
  const email = `guest-${Date.now()}`;
  const password = generateHashedPassword(generateUUID());

  try {
    return await db.insert(user).values({ email, password }).returning({
      id: user.id,
      email: user.email,
    });
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to create guest user"
    );
  }
}

export async function saveChat({
  id,
  userId,
  title,
  visibility,
}: {
  id: string;
  userId: string;
  title: string;
  visibility: VisibilityType;
}) {
  try {
    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      userId,
      title,
      visibility,
    });
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to save chat");
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    await db.delete(vote).where(eq(vote.chatId, id));
    await db.delete(message).where(eq(message.chatId, id));
    await db.delete(stream).where(eq(stream.chatId, id));

    const [chatsDeleted] = await db
      .delete(chat)
      .where(eq(chat.id, id))
      .returning();
    return chatsDeleted;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete chat by id"
    );
  }
}

export async function deleteAllChatsByUserId({ userId }: { userId: string }) {
  try {
    const userChats = await db
      .select({ id: chat.id })
      .from(chat)
      .where(eq(chat.userId, userId));

    if (userChats.length === 0) {
      return { deletedCount: 0 };
    }

    const chatIds = userChats.map((c) => c.id);

    await db.delete(vote).where(inArray(vote.chatId, chatIds));
    await db.delete(message).where(inArray(message.chatId, chatIds));
    await db.delete(stream).where(inArray(stream.chatId, chatIds));

    const deletedChats = await db
      .delete(chat)
      .where(eq(chat.userId, userId))
      .returning();

    return { deletedCount: deletedChats.length };
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete all chats by user id"
    );
  }
}

export async function getChatsByUserId({
  id,
  limit,
  startingAfter,
  endingBefore,
}: {
  id: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}) {
  try {
    const extendedLimit = limit + 1;

    const query = (whereCondition?: SQL<any>) =>
      db
        .select()
        .from(chat)
        .where(
          whereCondition
            ? and(
                whereCondition,
                eq(chat.userId, id),
                // Exclude group chats from personal history
                or(eq(chat.chatType, "personal"), isNull(chat.chatType))
              )
            : and(
                eq(chat.userId, id),
                // Exclude group chats from personal history
                or(eq(chat.chatType, "personal"), isNull(chat.chatType))
              )
        )
        .orderBy(desc(chat.createdAt))
        .limit(extendedLimit);

    let filteredChats: Chat[] = [];

    if (startingAfter) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, startingAfter))
        .limit(1);

      if (!selectedChat) {
        throw new ChatSDKError(
          "not_found:database",
          `Chat with id ${startingAfter} not found`
        );
      }

      filteredChats = await query(gt(chat.createdAt, selectedChat.createdAt));
    } else if (endingBefore) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, endingBefore))
        .limit(1);

      if (!selectedChat) {
        throw new ChatSDKError(
          "not_found:database",
          `Chat with id ${endingBefore} not found`
        );
      }

      filteredChats = await query(lt(chat.createdAt, selectedChat.createdAt));
    } else {
      filteredChats = await query();
    }

    const hasMore = filteredChats.length > limit;

    return {
      chats: hasMore ? filteredChats.slice(0, limit) : filteredChats,
      hasMore,
    };
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get chats by user id"
    );
  }
}

export async function getChatsByAreaId({
  areaId,
  limit,
  startingAfter,
  endingBefore,
}: {
  areaId: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}) {
  try {
    const extendedLimit = limit + 1;

    const query = (whereCondition?: SQL<any>) =>
      db
        .select()
        .from(chat)
        .where(
          whereCondition
            ? and(
                whereCondition,
                eq(chat.areaId, areaId),
                eq(chat.chatType, "group")
              )
            : and(eq(chat.areaId, areaId), eq(chat.chatType, "group"))
        )
        .orderBy(desc(chat.createdAt))
        .limit(extendedLimit);

    let filteredChats: Chat[] = [];

    if (startingAfter) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, startingAfter))
        .limit(1);

      if (!selectedChat) {
        throw new ChatSDKError(
          "not_found:database",
          `Chat with id ${startingAfter} not found`
        );
      }

      filteredChats = await query(gt(chat.createdAt, selectedChat.createdAt));
    } else if (endingBefore) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, endingBefore))
        .limit(1);

      if (!selectedChat) {
        throw new ChatSDKError(
          "not_found:database",
          `Chat with id ${endingBefore} not found`
        );
      }

      filteredChats = await query(lt(chat.createdAt, selectedChat.createdAt));
    } else {
      filteredChats = await query();
    }

    const hasMore = filteredChats.length > limit;

    return {
      chats: hasMore ? filteredChats.slice(0, limit) : filteredChats,
      hasMore,
    };
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get chats by area id"
    );
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    if (!selectedChat) {
      return null;
    }

    return selectedChat;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get chat by id");
  }
}

export async function saveMessages({ messages }: { messages: DBMessage[] }) {
  try {
    return await db.insert(message).values(messages);
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to save messages");
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get messages by chat id"
    );
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: "up" | "down";
}) {
  try {
    const [existingVote] = await db
      .select()
      .from(vote)
      .where(and(eq(vote.messageId, messageId)));

    if (existingVote) {
      return await db
        .update(vote)
        .set({ isUpvoted: type === "up" })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
    }
    return await db.insert(vote).values({
      chatId,
      messageId,
      isUpvoted: type === "up",
    });
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to vote message");
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    return await db.select().from(vote).where(eq(vote.chatId, id));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get votes by chat id"
    );
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
}) {
  try {
    return await db
      .insert(document)
      .values({
        id,
        title,
        kind,
        content,
        userId,
        createdAt: new Date(),
      })
      .returning();
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to save document");
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));

    return documents;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get documents by id"
    );
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));

    return selectedDocument;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get document by id"
    );
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    await db
      .delete(suggestion)
      .where(
        and(
          eq(suggestion.documentId, id),
          gt(suggestion.documentCreatedAt, timestamp)
        )
      );

    return await db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)))
      .returning();
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete documents by id after timestamp"
    );
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Suggestion[];
}) {
  try {
    return await db.insert(suggestion).values(suggestions);
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to save suggestions"
    );
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    return await db
      .select()
      .from(suggestion)
      .where(eq(suggestion.documentId, documentId));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get suggestions by document id"
    );
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    return await db.select().from(message).where(eq(message.id, id));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get message by id"
    );
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    const messagesToDelete = await db
      .select({ id: message.id })
      .from(message)
      .where(
        and(eq(message.chatId, chatId), gte(message.createdAt, timestamp))
      );

    const messageIds = messagesToDelete.map(
      (currentMessage) => currentMessage.id
    );

    if (messageIds.length > 0) {
      await db
        .delete(vote)
        .where(
          and(eq(vote.chatId, chatId), inArray(vote.messageId, messageIds))
        );

      return await db
        .delete(message)
        .where(
          and(eq(message.chatId, chatId), inArray(message.id, messageIds))
        );
    }
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete messages by chat id after timestamp"
    );
  }
}

export async function updateChatVisibilityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: "private" | "public";
}) {
  try {
    return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to update chat visibility by id"
    );
  }
}

export async function updateChatLastContextById({
  chatId,
  context,
}: {
  chatId: string;
  // Store merged server-enriched usage object
  context: AppUsage;
}) {
  try {
    return await db
      .update(chat)
      .set({ lastContext: context })
      .where(eq(chat.id, chatId));
  } catch (error) {
    console.warn("Failed to update lastContext for chat", chatId, error);
    return;
  }
}

export async function getMessageCountByUserId({
  id,
  differenceInHours,
}: {
  id: string;
  differenceInHours: number;
}) {
  try {
    const twentyFourHoursAgo = new Date(
      Date.now() - differenceInHours * 60 * 60 * 1000
    );

    const [stats] = await db
      .select({ count: count(message.id) })
      .from(message)
      .innerJoin(chat, eq(message.chatId, chat.id))
      .where(
        and(
          eq(chat.userId, id),
          gte(message.createdAt, twentyFourHoursAgo),
          eq(message.role, "user")
        )
      )
      .execute();

    return stats?.count ?? 0;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get message count by user id"
    );
  }
}

export async function createStreamId({
  streamId,
  chatId,
}: {
  streamId: string;
  chatId: string;
}) {
  try {
    await db
      .insert(stream)
      .values({ id: streamId, chatId, createdAt: new Date() });
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to create stream id"
    );
  }
}

export async function getStreamIdsByChatId({ chatId }: { chatId: string }) {
  try {
    const streamIds = await db
      .select({ id: stream.id })
      .from(stream)
      .where(eq(stream.chatId, chatId))
      .orderBy(asc(stream.createdAt))
      .execute();

    return streamIds.map(({ id }) => id);
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get stream ids by chat id"
    );
  }
}

// ============ AVRORA: Area Queries ============

export async function createArea({
  title,
  description,
  ownerId,
  visibility,
  parentAreaId,
  inheritedSummary,
}: {
  title: string;
  description?: string;
  ownerId: string;
  visibility: "public" | "private" | "dao";
  parentAreaId?: string;
  inheritedSummary?: string;
}) {
  try {
    const [newArea] = await db
      .insert(area)
      .values({
        title,
        description,
        ownerId,
        visibility,
        parentAreaId,
        inheritedSummary,
        forkedAt: parentAreaId ? new Date() : null,
        createdAt: new Date(),
      })
      .returning();

    // Automatically add owner as member
    await db.insert(areaMember).values({
      areaId: newArea.id,
      userId: ownerId,
      role: "owner",
      joinedAt: new Date(),
    });

    // Create default group chat for the Area
    const [defaultChat] = await db
      .insert(chat)
      .values({
        title: `${title} - General`,
        chatType: "group",
        userId: ownerId,
        areaId: newArea.id,
        visibility: visibility === "public" ? "public" : "private",
        createdAt: new Date(),
      })
      .returning();

    // Add owner as admin of the default chat
    await db.insert(chatMember).values({
      chatId: defaultChat.id,
      userId: ownerId,
      role: "admin",
      joinedAt: new Date(),
    });

    return newArea;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to create area");
  }
}

export async function getAreaById({ id }: { id: string }) {
  try {
    const [selectedArea] = await db.select().from(area).where(eq(area.id, id));
    return selectedArea || null;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get area by id");
  }
}

export async function getAreasByUserId({ userId }: { userId: string }) {
  try {
    const areas = await db
      .select({
        id: area.id,
        title: area.title,
        description: area.description,
        visibility: area.visibility,
        createdAt: area.createdAt,
        ownerId: area.ownerId,
        parentAreaId: area.parentAreaId,
        forkedAt: area.forkedAt,
        inheritedSummary: area.inheritedSummary,
        mergeStatus: area.mergeStatus,
        role: areaMember.role,
      })
      .from(area)
      .innerJoin(areaMember, eq(area.id, areaMember.areaId))
      .where(eq(areaMember.userId, userId))
      .orderBy(desc(area.createdAt));

    return areas;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get areas by user id"
    );
  }
}

export async function deleteAreaById({ id }: { id: string }) {
  try {
    // Delete members
    await db.delete(areaMember).where(eq(areaMember.areaId, id));
    // Delete area documents
    await db.delete(areaDocument).where(eq(areaDocument.areaId, id));
    // Delete merge proposals
    await db
      .delete(areaMergeProposal)
      .where(
        and(
          or(
            eq(areaMergeProposal.sourceAreaId, id),
            eq(areaMergeProposal.targetAreaId, id)
          )
        )
      );
    // Delete the area
    const [deleted] = await db.delete(area).where(eq(area.id, id)).returning();
    return deleted;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete area by id"
    );
  }
}

export async function updateAreaById({
  id,
  title,
  description,
  visibility,
}: {
  id: string;
  title?: string;
  description?: string;
  visibility?: "public" | "private" | "dao";
}) {
  try {
    const updates: Record<string, any> = {};
    if (title) {
      updates.title = title;
    }
    if (description !== undefined) {
      updates.description = description;
    }
    if (visibility) {
      updates.visibility = visibility;
    }

    const [updated] = await db
      .update(area)
      .set(updates)
      .where(eq(area.id, id))
      .returning();

    return updated;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to update area by id"
    );
  }
}

// ============ AVRORA: Area Members Queries ============

export async function addAreaMember({
  areaId,
  userId,
  role,
}: {
  areaId: string;
  userId: string;
  role: "owner" | "admin" | "member" | "viewer";
}) {
  try {
    // Add to Area
    await db.insert(areaMember).values({
      areaId,
      userId,
      role,
      joinedAt: new Date(),
    });

    // Find default chat for this Area (the first group chat created)
    const [defaultChat] = await db
      .select()
      .from(chat)
      .where(and(eq(chat.areaId, areaId), eq(chat.chatType, "group")))
      .orderBy(asc(chat.createdAt))
      .limit(1);

    // Add member to default chat if it exists
    if (defaultChat) {
      // Check if user is already a member
      const [existingMember] = await db
        .select()
        .from(chatMember)
        .where(
          and(
            eq(chatMember.chatId, defaultChat.id),
            eq(chatMember.userId, userId)
          )
        );

      if (!existingMember) {
        await db.insert(chatMember).values({
          chatId: defaultChat.id,
          userId,
          role: role === "owner" || role === "admin" ? "admin" : "member",
          joinedAt: new Date(),
        });
      }
    }

    return true;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to add area member");
  }
}

export async function removeAreaMember({
  areaId,
  userId,
}: {
  areaId: string;
  userId: string;
}) {
  try {
    return await db
      .delete(areaMember)
      .where(and(eq(areaMember.areaId, areaId), eq(areaMember.userId, userId)));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to remove area member"
    );
  }
}

export async function getAreaMembers({ areaId }: { areaId: string }) {
  try {
    const members = await db
      .select({
        userId: user.id,
        email: user.email,
        role: areaMember.role,
        joinedAt: areaMember.joinedAt,
      })
      .from(areaMember)
      .innerJoin(user, eq(areaMember.userId, user.id))
      .where(eq(areaMember.areaId, areaId))
      .orderBy(asc(areaMember.joinedAt));

    return members;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get area members"
    );
  }
}

export async function updateAreaMemberRole({
  areaId,
  userId,
  role,
}: {
  areaId: string;
  userId: string;
  role: "owner" | "admin" | "member" | "viewer";
}) {
  try {
    return await db
      .update(areaMember)
      .set({ role })
      .where(and(eq(areaMember.areaId, areaId), eq(areaMember.userId, userId)));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to update area member role"
    );
  }
}
