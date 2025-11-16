import { and, desc, eq, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import type { ApiKey, User } from "@/lib/db/schema";
import { sfera, sferaMember, sferaMessage, user } from "@/lib/db/schema";

/**
 * MCP Resource handlers for Sfera data
 */

export interface McpResource {
  uri: string;
  mimeType: string;
  content: any;
}

/**
 * List all Sferas accessible to the user
 */
export async function listSferas(userId: string): Promise<McpResource> {
  try {
    // Get all Sferas where user is a member or owner
    const userSferas = await db
      .select({
        id: sfera.id,
        title: sfera.title,
        description: sfera.description,
        visibility: sfera.visibility,
        role: sferaMember.role,
        createdAt: sfera.createdAt,
        updatedAt: sfera.updatedAt,
      })
      .from(sfera)
      .innerJoin(sferaMember, eq(sferaMember.sferaId, sfera.id))
      .where(eq(sferaMember.userId, userId))
      .orderBy(desc(sfera.updatedAt));

    return {
      uri: "sfera://list",
      mimeType: "application/json",
      content: {
        sferas: userSferas,
        count: userSferas.length,
      },
    };
  } catch (error) {
    console.error("Failed to list Sferas:", error);
    throw new Error("Failed to list Sferas");
  }
}

/**
 * Get details of a specific Sfera
 */
export async function getSfera(
  sferaId: string,
  userId: string
): Promise<McpResource> {
  try {
    // Check membership
    const [membership] = await db
      .select()
      .from(sferaMember)
      .where(
        and(eq(sferaMember.sferaId, sferaId), eq(sferaMember.userId, userId))
      )
      .limit(1);

    if (!membership) {
      throw new Error("Access denied to this Sfera");
    }

    // Get Sfera details
    const [sferaData] = await db
      .select()
      .from(sfera)
      .where(eq(sfera.id, sferaId))
      .limit(1);

    if (!sferaData) {
      throw new Error("Sfera not found");
    }

    // Get members
    const members = await db
      .select({
        userId: sferaMember.userId,
        role: sferaMember.role,
        joinedAt: sferaMember.joinedAt,
        email: user.email,
        name: user.name,
      })
      .from(sferaMember)
      .innerJoin(user, eq(sferaMember.userId, user.id))
      .where(eq(sferaMember.sferaId, sferaId));

    return {
      uri: `sfera://${sferaId}`,
      mimeType: "application/json",
      content: {
        sfera: sferaData,
        members,
        userRole: membership.role,
      },
    };
  } catch (error) {
    console.error("Failed to get Sfera:", error);
    throw error;
  }
}

/**
 * Get messages from a Sfera
 */
export async function getSferaMessages(
  sferaId: string,
  userId: string,
  limit = 50,
  offset = 0
): Promise<McpResource> {
  try {
    // Check membership
    const [membership] = await db
      .select()
      .from(sferaMember)
      .where(
        and(eq(sferaMember.sferaId, sferaId), eq(sferaMember.userId, userId))
      )
      .limit(1);

    if (!membership) {
      throw new Error("Access denied to this Sfera");
    }

    // Get messages
    const messages = await db
      .select({
        id: sferaMessage.id,
        content: sferaMessage.content,
        userId: sferaMessage.userId,
        userEmail: user.email,
        userName: user.name,
        attachments: sferaMessage.attachments,
        toolResults: sferaMessage.toolResults,
        parentMessageId: sferaMessage.parentMessageId,
        isForked: sferaMessage.isForked,
        forkCount: sferaMessage.forkCount,
        createdAt: sferaMessage.createdAt,
      })
      .from(sferaMessage)
      .innerJoin(user, eq(sferaMessage.userId, user.id))
      .where(eq(sferaMessage.sferaId, sferaId))
      .orderBy(desc(sferaMessage.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      uri: `sfera://${sferaId}/messages`,
      mimeType: "application/json",
      content: {
        messages,
        count: messages.length,
        limit,
        offset,
      },
    };
  } catch (error) {
    console.error("Failed to get Sfera messages:", error);
    throw error;
  }
}

/**
 * Search Sferas and messages
 */
export async function searchSferas(
  userId: string,
  query: string
): Promise<McpResource> {
  try {
    // Search in Sferas user has access to
    const sferaResults = await db
      .select({
        id: sfera.id,
        title: sfera.title,
        description: sfera.description,
        type: sql<string>`'sfera'`,
      })
      .from(sfera)
      .innerJoin(sferaMember, eq(sferaMember.sferaId, sfera.id))
      .where(
        and(
          eq(sferaMember.userId, userId),
          or(
            sql`${sfera.title} ILIKE ${`%${query}%`}`,
            sql`${sfera.description} ILIKE ${`%${query}%`}`
          )
        )
      )
      .limit(20);

    // Search in messages
    const messageResults = await db
      .select({
        id: sferaMessage.id,
        content: sferaMessage.content,
        sferaId: sferaMessage.sferaId,
        sferaTitle: sfera.title,
        type: sql<string>`'message'`,
      })
      .from(sferaMessage)
      .innerJoin(sfera, eq(sferaMessage.sferaId, sfera.id))
      .innerJoin(sferaMember, eq(sferaMember.sferaId, sfera.id))
      .where(
        and(
          eq(sferaMember.userId, userId),
          sql`${sferaMessage.content} ILIKE ${`%${query}%`}`
        )
      )
      .limit(30);

    return {
      uri: `sfera://search?q=${encodeURIComponent(query)}`,
      mimeType: "application/json",
      content: {
        query,
        sferas: sferaResults,
        messages: messageResults,
        totalResults: sferaResults.length + messageResults.length,
      },
    };
  } catch (error) {
    console.error("Failed to search Sferas:", error);
    throw error;
  }
}

/**
 * Get user's profile and settings
 */
export async function getUserProfile(userId: string): Promise<McpResource> {
  try {
    const [userProfile] = await db
      .select({
        id: user.id,
        email: user.email,
        name: user.name,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        mcpEnabled: user.mcpEnabled,
        mcpQuota: user.mcpQuota,
        createdAt: user.createdAt,
      })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!userProfile) {
      throw new Error("User not found");
    }

    return {
      uri: "user://profile",
      mimeType: "application/json",
      content: {
        profile: userProfile,
      },
    };
  } catch (error) {
    console.error("Failed to get user profile:", error);
    throw error;
  }
}
