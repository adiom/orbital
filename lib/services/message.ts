import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import {
  createPaginatedResponse,
  decodeCursor,
  normalizeLimit,
  type PaginatedResponse,
} from "@/lib/api/pagination";
import { db } from "@/lib/db";
import { type SferaMessage, sferaMessage } from "@/lib/db/schema";

/**
 * Input for creating a message
 * Requirements: 16.1, 16.2, 9.1
 */
export type CreateMessageInput = {
  sferaId: string;
  userId: string;
  content?: string;
  parentMessageId?: string;
  attachments?: Array<{
    name: string;
    url: string;
    contentType: string;
  }>;
  messageType?: "user" | "agent" | "system";
  idempotencyKey?: string;
};

/**
 * Filters for querying messages
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */
export type MessageFilters = {
  userId?: string;
  messageType?: "user" | "agent" | "system";
  hasAttachments?: boolean;
  isForked?: boolean;
  dateFrom?: string;
  dateTo?: string;
};

/**
 * Options for querying messages
 * Requirements: 1.1, 1.2
 */
export type GetMessagesOptions = {
  cursor?: string;
  limit?: number;
  filters?: MessageFilters;
};

/**
 * Message Service for Sfera messages
 * Requirements: 1.1, 1.2, 7.1, 7.2, 7.3, 7.4, 8.1, 16.1, 16.2
 */
export class MessageService {
  /**
   * Create a new message
   * Requirements: 16.1, 16.2
   */
  async createMessage(input: CreateMessageInput): Promise<SferaMessage> {
    // Auto-detect messageType based on userId if not provided
    // This would need agent detection logic
    const messageType = input.messageType || "user";

    const [message] = await db
      .insert(sferaMessage)
      .values({
        sferaId: input.sferaId,
        userId: input.userId,
        content: input.content || "",
        parentMessageId: input.parentMessageId,
        attachments: input.attachments || [],
        messageType,
        idempotencyKey: input.idempotencyKey,
      })
      .returning();

    return message;
  }

  /**
   * Get messages with pagination and filtering
   * Requirements: 1.1, 1.2, 7.1, 7.2, 7.3, 7.4, 8.1
   */
  async getMessages(
    sferaId: string,
    options: GetMessagesOptions = {}
  ): Promise<PaginatedResponse<SferaMessage>> {
    const limit = normalizeLimit(options.limit);
    const filters = options.filters || {};

    // Build WHERE conditions
    const conditions = [eq(sferaMessage.sferaId, sferaId)];

    // Apply cursor for pagination
    if (options.cursor) {
      const decoded = decodeCursor(options.cursor);
      if (decoded) {
        conditions.push(
          sql`(${sferaMessage.createdAt}, ${sferaMessage.id}) < (${decoded.createdAt}, ${decoded.id})`
        );
      }
    }

    // Apply filters
    if (filters.userId) {
      conditions.push(eq(sferaMessage.userId, filters.userId));
    }

    if (filters.messageType) {
      conditions.push(eq(sferaMessage.messageType, filters.messageType));
    }

    if (filters.hasAttachments !== undefined) {
      if (filters.hasAttachments) {
        conditions.push(
          sql`jsonb_array_length(${sferaMessage.attachments}) > 0`
        );
      } else {
        conditions.push(
          sql`jsonb_array_length(${sferaMessage.attachments}) = 0`
        );
      }
    }

    if (filters.isForked !== undefined) {
      conditions.push(eq(sferaMessage.isForked, filters.isForked));
    }

    if (filters.dateFrom) {
      conditions.push(gte(sferaMessage.createdAt, new Date(filters.dateFrom)));
    }

    if (filters.dateTo) {
      conditions.push(lte(sferaMessage.createdAt, new Date(filters.dateTo)));
    }

    // Fetch limit + 1 to determine if there are more results
    const messages = await db
      .select()
      .from(sferaMessage)
      .where(and(...conditions))
      .orderBy(desc(sferaMessage.createdAt), desc(sferaMessage.id))
      .limit(limit + 1);

    return createPaginatedResponse(messages, limit);
  }

  /**
   * Search messages with full-text search
   * Requirements: 6.1, 6.2, 6.3, 6.4
   */
  async searchMessages(
    sferaId: string,
    query: string,
    options: { cursor?: string; limit?: number } = {}
  ): Promise<PaginatedResponse<SferaMessage>> {
    const limit = normalizeLimit(options.limit);

    // Build WHERE conditions
    const conditions = [
      eq(sferaMessage.sferaId, sferaId),
      sql`to_tsvector('russian', ${sferaMessage.content}) @@ plainto_tsquery('russian', ${query})`,
    ];

    // Apply cursor for pagination
    if (options.cursor) {
      const decoded = decodeCursor(options.cursor);
      if (decoded) {
        conditions.push(
          sql`(${sferaMessage.createdAt}, ${sferaMessage.id}) < (${decoded.createdAt}, ${decoded.id})`
        );
      }
    }

    // Fetch limit + 1 to determine if there are more results
    const messages = await db
      .select()
      .from(sferaMessage)
      .where(and(...conditions))
      .orderBy(desc(sferaMessage.createdAt), desc(sferaMessage.id))
      .limit(limit + 1);

    return createPaginatedResponse(messages, limit);
  }

  /**
   * Update a message
   * Requirements: 11.3, 11.4, 11.5
   */
  async updateMessage(
    messageId: string,
    updates: {
      content?: string;
      isGenerating?: boolean;
      toolResults?: Array<{
        toolName: string;
        success: boolean;
        [key: string]: unknown;
      }>;
    }
  ): Promise<SferaMessage> {
    const [message] = await db
      .update(sferaMessage)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(sferaMessage.id, messageId))
      .returning();

    return message;
  }

  /**
   * Get a single message by ID
   */
  async getMessage(messageId: string): Promise<SferaMessage | null> {
    const [message] = await db
      .select()
      .from(sferaMessage)
      .where(eq(sferaMessage.id, messageId))
      .limit(1);

    return message || null;
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageId: string): Promise<void> {
    await db.delete(sferaMessage).where(eq(sferaMessage.id, messageId));
  }
}

// Export singleton instance
export const messageService = new MessageService();
