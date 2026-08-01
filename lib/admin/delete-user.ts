import "server-only";

import { and, inArray, notInArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  agentRegistry,
  aiUsageLog,
  apiKey,
  chat,
  chatMember,
  document,
  magicToken,
  message,
  messageDeprecated,
  messageMention,
  sfera,
  sferaArtifact,
  sferaForkedSfera,
  sferaMessage,
  stream,
  suggestion,
  toolExecution,
  user,
} from "@/lib/db/schema";

/**
 * What disappears when these accounts go. Shown before the delete is
 * confirmed, because most of these rows are reachable only through cascades
 * and would otherwise vanish silently.
 */
export type DeleteImpact = {
  people: number;
  cells: number;
  messages: number;
  /** Messages written by OTHER accounts inside the doomed cells. */
  foreignMessages: number;
  chats: number;
  documents: number;
  aiLogs: number;
  keys: number;
  agents: number;
};

export type DeleteResult = {
  deleted: number;
  impact: DeleteImpact;
};

const EMPTY_IMPACT: DeleteImpact = {
  people: 0,
  cells: 0,
  messages: 0,
  foreignMessages: 0,
  chats: 0,
  documents: 0,
  aiLogs: 0,
  keys: 0,
  agents: 0,
};

type Counted = Promise<Array<{ n: number }>>;

async function scalar(query: Counted): Promise<number> {
  const [row] = await query;
  return row?.n ?? 0;
}

const N = sql<number>`count(*)::int`;

/** Ids of the cells these accounts own. */
async function ownedCellIds(ids: string[]): Promise<string[]> {
  const rows = await db
    .select({ id: sfera.id })
    .from(sfera)
    .where(inArray(sfera.ownerId, ids));
  return rows.map((row) => row.id);
}

/** Counts only — nothing is written. */
export async function previewDelete(ids: string[]): Promise<DeleteImpact> {
  if (ids.length === 0) {
    return EMPTY_IMPACT;
  }

  const cellIds = await ownedCellIds(ids);

  const messagesWhere =
    cellIds.length > 0
      ? sql`${inArray(sferaMessage.userId, ids)} or ${inArray(sferaMessage.sferaId, cellIds)}`
      : inArray(sferaMessage.userId, ids);

  const [people, messages, foreignMessages, chats, documents, aiLogs, keys, agents] =
    await Promise.all([
      scalar(db.select({ n: N }).from(user).where(inArray(user.id, ids))),
      scalar(db.select({ n: N }).from(sferaMessage).where(messagesWhere)),
      cellIds.length > 0
        ? scalar(
            db
              .select({ n: N })
              .from(sferaMessage)
              .where(
                and(
                  inArray(sferaMessage.sferaId, cellIds),
                  notInArray(sferaMessage.userId, ids)
                )
              )
          )
        : Promise.resolve(0),
      scalar(db.select({ n: N }).from(chat).where(inArray(chat.userId, ids))),
      scalar(
        db.select({ n: N }).from(document).where(inArray(document.userId, ids))
      ),
      scalar(
        db.select({ n: N }).from(aiUsageLog).where(inArray(aiUsageLog.userId, ids))
      ),
      scalar(db.select({ n: N }).from(apiKey).where(inArray(apiKey.userId, ids))),
      scalar(
        db
          .select({ n: N })
          .from(agentRegistry)
          .where(inArray(agentRegistry.userId, ids))
      ),
    ]);

  return {
    people,
    cells: cellIds.length,
    messages,
    foreignMessages,
    chats,
    documents,
    aiLogs,
    keys,
    agents,
  };
}

/**
 * Removes accounts and everything hanging off them, in one transaction.
 *
 * Half the FKs into User are ON DELETE NO ACTION (Sfera.ownerId,
 * SferaMessage.userId, Chat.userId, Document.userId, ToolExecution.userId,
 * SferaForkedSfera.createdById, ...), so a bare `delete from "User"` fails on
 * a constraint. Those rows are cleared by hand, deepest first; deleting a cell
 * then cascades to its members, messages, artifacts, forks and usage logs.
 */
export async function deleteUsers(ids: string[]): Promise<DeleteResult> {
  const impact = await previewDelete(ids);

  if (ids.length === 0) {
    return { deleted: 0, impact };
  }

  const deleted = await db.transaction(async (tx) => {
    const emails = (
      await tx
        .select({ email: user.email })
        .from(user)
        .where(inArray(user.id, ids))
    ).map((row) => row.email);

    const chatIds = (
      await tx.select({ id: chat.id }).from(chat).where(inArray(chat.userId, ids))
    ).map((row) => row.id);

    // Messages to clear: everything in their chats, plus anything they wrote
    // in someone else's chat.
    const messageIds = (
      await tx
        .select({ id: message.id })
        .from(message)
        .where(
          chatIds.length > 0
            ? sql`${inArray(message.chatId, chatIds)} or ${inArray(message.userId, ids)}`
            : inArray(message.userId, ids)
        )
    ).map((row) => row.id);

    // --- chat side -----------------------------------------------------
    // MessageMention -> Message_v2 is NO ACTION, so mentions go first.
    await tx
      .delete(messageMention)
      .where(inArray(messageMention.mentionedUserId, ids));

    if (messageIds.length > 0) {
      await tx
        .delete(messageMention)
        .where(inArray(messageMention.messageId, messageIds));
      await tx.delete(message).where(inArray(message.id, messageIds));
    }

    if (chatIds.length > 0) {
      await tx
        .delete(messageDeprecated)
        .where(inArray(messageDeprecated.chatId, chatIds));
      await tx.delete(stream).where(inArray(stream.chatId, chatIds));
      await tx.delete(chatMember).where(inArray(chatMember.chatId, chatIds));
    }

    await tx.delete(chatMember).where(inArray(chatMember.userId, ids));
    await tx.delete(chat).where(inArray(chat.userId, ids));

    // --- documents -----------------------------------------------------
    // Suggestion -> Document is a composite FK, so clear suggestions on their
    // documents as well as the ones they left elsewhere.
    const docIds = (
      await tx
        .select({ id: document.id })
        .from(document)
        .where(inArray(document.userId, ids))
    ).map((row) => row.id);

    await tx.delete(suggestion).where(inArray(suggestion.userId, ids));

    if (docIds.length > 0) {
      await tx.delete(suggestion).where(inArray(suggestion.documentId, docIds));
      // SferaArtifact also points at Document by (id, createdAt) — an artifact
      // living in someone else's cell would otherwise block the delete.
      await tx
        .delete(sferaArtifact)
        .where(inArray(sferaArtifact.documentId, docIds));
    }

    await tx.delete(document).where(inArray(document.userId, ids));

    // --- cells ---------------------------------------------------------
    await tx
      .delete(sferaForkedSfera)
      .where(inArray(sferaForkedSfera.createdById, ids));

    // Cascades: members, messages, artifacts, forks, tool runs, usage logs.
    await tx.delete(sfera).where(inArray(sfera.ownerId, ids));

    // Whatever they left in cells owned by someone else.
    await tx.delete(sferaMessage).where(inArray(sferaMessage.userId, ids));
    await tx.delete(toolExecution).where(inArray(toolExecution.userId, ids));

    if (emails.length > 0) {
      await tx.delete(magicToken).where(inArray(magicToken.email, emails));
    }

    // Cascades the rest: SferaMember, AiUsageLog, ApiKey, AgentRegistry,
    // McpAuditLog.
    const rows = await tx
      .delete(user)
      .where(inArray(user.id, ids))
      .returning({ id: user.id });

    return rows.length;
  });

  return { deleted, impact };
}

/** Ids that exist and are safe to remove, plus why the others were spared. */
export async function resolveDeletable(
  requested: string[],
  selfId: string,
  isProtected: (email: string) => boolean
): Promise<{ ids: string[]; skipped: Array<{ id: string; reason: string }> }> {
  const rows = await db
    .select({ id: user.id, email: user.email })
    .from(user)
    .where(inArray(user.id, requested));

  const found = new Map(rows.map((row) => [row.id, row.email]));
  const ids: string[] = [];
  const skipped: Array<{ id: string; reason: string }> = [];

  for (const id of requested) {
    const email = found.get(id);

    if (!email) {
      skipped.push({ id, reason: "уже удалён" });
    } else if (id === selfId) {
      skipped.push({ id, reason: "это вы" });
    } else if (isProtected(email)) {
      skipped.push({ id, reason: "администратор" });
    } else {
      ids.push(id);
    }
  }

  return { ids, skipped };
}
