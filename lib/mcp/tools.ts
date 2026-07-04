import { and, desc, eq } from "drizzle-orm";
import { generateAvroraResponse } from "@/lib/ai/sfera-avrora";
import { AVRORA_USER_ID } from "@/lib/constants/system-users";
import { db } from "@/lib/db";
import {
  sfera,
  sferaMember,
  sferaMessage,
  user,
} from "@/lib/db/schema";

/**
 * MCP Tool handlers for Sfera actions
 */

export interface McpToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

/**
 * Create a new Sfera
 */
export async function createSfera(
  userId: string,
  params: {
    title: string;
    description?: string;
    visibility?: "public" | "private" | "dao";
    members?: string[]; // Email addresses or user IDs
  }
): Promise<McpToolResult> {
  try {
    const { title, description, visibility = "private", members = [] } = params;

    if (!title) {
      return {
        success: false,
        error: "Title is required",
      };
    }

    // Create the Sfera
    const [newSfera] = await db
      .insert(sfera)
      .values({
        title,
        description,
        ownerId: userId,
        visibility,
      })
      .returning();

    // Add the creator as owner
    await db.insert(sferaMember).values({
      sferaId: newSfera.id,
      userId,
      role: "owner",
    });

    // Add additional members if specified
    for (const memberIdentifier of members) {
      let memberId: string | null = null;

      // Check if it's a UUID or email
      if (memberIdentifier.includes("@")) {
        // It's an email
        const [userRecord] = await db
          .select()
          .from(user)
          .where(eq(user.email, memberIdentifier))
          .limit(1);

        if (userRecord) {
          memberId = userRecord.id;
        }
      } else {
        // Assume it's a user ID
        memberId = memberIdentifier;
      }

      if (memberId && memberId !== userId) {
        await db
          .insert(sferaMember)
          .values({
            sferaId: newSfera.id,
            userId: memberId,
            role: "member",
          })
          .onConflictDoNothing();
      }
    }

    return {
      success: true,
      data: {
        sfera: newSfera,
        message: `Sfera "${title}" created successfully`,
      },
    };
  } catch (error) {
    console.error("Failed to create Sfera:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create Sfera",
    };
  }
}

/**
 * Send a message to a Sfera
 */
export async function sendMessage(
  userId: string,
  params: {
    sferaId: string;
    content: string;
    parentMessageId?: string;
  }
): Promise<McpToolResult> {
  try {
    const { sferaId, content, parentMessageId } = params;

    if (!content) {
      return {
        success: false,
        error: "Message content is required",
      };
    }

    // Check membership
    const [membership] = await db
      .select()
      .from(sferaMember)
      .where(
        and(eq(sferaMember.sferaId, sferaId), eq(sferaMember.userId, userId))
      )
      .limit(1);

    if (!membership) {
      return {
        success: false,
        error: "You are not a member of this Sfera",
      };
    }

    // Create the message
    const [newMessage] = await db
      .insert(sferaMessage)
      .values({
        sferaId,
        userId,
        content,
        parentMessageId,
        attachments: [],
        toolResults: [],
      })
      .returning();

    // Update Sfera's updatedAt
    await db
      .update(sfera)
      .set({ updatedAt: new Date() })
      .where(eq(sfera.id, sferaId));

    return {
      success: true,
      data: {
        message: newMessage,
      },
    };
  } catch (error) {
    console.error("Failed to send message:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send message",
    };
  }
}

/**
 * Invoke Avrora AI to respond in a Sfera
 */
export async function invokeAvrora(
  userId: string,
  params: {
    sferaId: string;
    prompt?: string; // Optional prompt to guide Avrora
  }
): Promise<McpToolResult> {
  try {
    const { sferaId, prompt } = params;

    // Check membership
    const [membership] = await db
      .select()
      .from(sferaMember)
      .where(
        and(eq(sferaMember.sferaId, sferaId), eq(sferaMember.userId, userId))
      )
      .limit(1);

    if (!membership) {
      return {
        success: false,
        error: "You are not a member of this Sfera",
      };
    }

    // Add Avrora as a member if not already
    await db
      .insert(sferaMember)
      .values({
        sferaId,
        userId: AVRORA_USER_ID,
        role: "member",
      })
      .onConflictDoNothing();

    // Get the last message in the Sfera to use as trigger
    const [lastMessage] = await db
      .select()
      .from(sferaMessage)
      .where(eq(sferaMessage.sferaId, sferaId))
      .orderBy(desc(sferaMessage.createdAt))
      .limit(1);

    if (!lastMessage) {
      // Create a trigger message if no messages exist
      const [triggerMessage] = await db
        .insert(sferaMessage)
        .values({
          sferaId,
          userId,
          content: prompt || "@avrora Please introduce yourself",
          attachments: [],
          toolResults: [],
        })
        .returning();

      // Generate Avrora's response
      const response = await generateAvroraResponse(
        sferaId,
        triggerMessage.id,
        userId
      );

      return {
        success: true,
        data: {
          triggerMessage,
          avroraResponse: response,
        },
      };
    }

    // Generate response for existing conversation
    const response = await generateAvroraResponse(
      sferaId,
      lastMessage.id,
      userId
    );

    return {
      success: true,
      data: {
        avroraResponse: response,
      },
    };
  } catch (error) {
    console.error("Failed to invoke Avrora:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to invoke Avrora",
    };
  }
}

/**
 * Add a member to a Sfera
 */
export async function addMember(
  userId: string,
  params: {
    sferaId: string;
    memberIdentifier: string; // Email or user ID
    role?: "admin" | "member" | "viewer";
  }
): Promise<McpToolResult> {
  try {
    const { sferaId, memberIdentifier, role = "member" } = params;

    // Check if user has permission (owner or admin)
    const [membership] = await db
      .select()
      .from(sferaMember)
      .where(
        and(eq(sferaMember.sferaId, sferaId), eq(sferaMember.userId, userId))
      )
      .limit(1);

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return {
        success: false,
        error: "You don't have permission to add members to this Sfera",
      };
    }

    // Resolve member ID
    let memberId: string | null = null;

    if (memberIdentifier.includes("@")) {
      // It's an email
      const [userRecord] = await db
        .select()
        .from(user)
        .where(eq(user.email, memberIdentifier))
        .limit(1);

      if (userRecord) {
        memberId = userRecord.id;
      } else {
        return {
          success: false,
          error: `User with email ${memberIdentifier} not found`,
        };
      }
    } else {
      // Assume it's a user ID
      memberId = memberIdentifier;
    }

    // Add the member
    await db
      .insert(sferaMember)
      .values({
        sferaId,
        userId: memberId,
        role,
      })
      .onConflictDoUpdate({
        target: [sferaMember.sferaId, sferaMember.userId],
        set: { role },
      });

    return {
      success: true,
      data: {
        message: `Member added successfully with role: ${role}`,
      },
    };
  } catch (error) {
    console.error("Failed to add member:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add member",
    };
  }
}

/**
 * Fork a Sfera or message
 */
export async function forkSfera(
  userId: string,
  params: {
    sferaId: string;
    messageId?: string; // If provided, fork from this message
    title: string;
    description?: string;
  }
): Promise<McpToolResult> {
  try {
    const { sferaId: sourceSferaId, messageId, title, description } = params;

    // Check membership in source Sfera
    const [membership] = await db
      .select()
      .from(sferaMember)
      .where(
        and(
          eq(sferaMember.sferaId, sourceSferaId),
          eq(sferaMember.userId, userId)
        )
      )
      .limit(1);

    if (!membership) {
      return {
        success: false,
        error: "You are not a member of the source Sfera",
      };
    }

    // Create the new forked Sfera
    const [newSfera] = await db
      .insert(sfera)
      .values({
        title,
        description: description || `Продолжение: ${sourceSferaId}`,
        ownerId: userId,
        visibility: "private",
      })
      .returning();

    // Add creator as owner
    await db.insert(sferaMember).values({
      sferaId: newSfera.id,
      userId,
      role: "owner",
    });

    // Copy messages if forking from a specific message
    if (messageId) {
      // Get the message and its ancestors
      const messages = await db
        .select()
        .from(sferaMessage)
        .where(
          and(
            eq(sferaMessage.sferaId, sourceSferaId),
            eq(sferaMessage.id, messageId)
          )
        )
        .limit(1);

      if (messages.length > 0) {
        // Copy the message to the new Sfera
        await db.insert(sferaMessage).values({
          sferaId: newSfera.id,
          userId: messages[0].userId,
          content: messages[0].content,
          attachments: messages[0].attachments,
          toolResults: messages[0].toolResults,
        });

        // Update fork count on original message
        await db
          .update(sferaMessage)
          .set({
            isForked: true,
            forkCount: messages[0].forkCount + 1,
          })
          .where(eq(sferaMessage.id, messageId));
      }
    }

    return {
      success: true,
      data: {
        sfera: newSfera,
        message: `Sfera "${title}" forked successfully`,
      },
    };
  } catch (error) {
    console.error("Failed to fork Sfera:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fork Sfera",
    };
  }
}
