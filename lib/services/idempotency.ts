import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  idempotencyLog,
  type SferaMessage,
  sferaMessage,
} from "@/lib/db/schema";

/**
 * Idempotency Service for preventing duplicate operations
 * Requirements: 15.2, 15.3, 15.4
 */
export class IdempotencyService {
  private readonly EXPIRATION_HOURS = 24;

  /**
   * Check if idempotency key exists and is valid
   * Requirements: 15.2, 15.3
   *
   * @param key - Idempotency key
   * @returns Existing message if key exists and not expired, null otherwise
   */
  async checkKey(key: string): Promise<SferaMessage | null> {
    // Check if key exists
    const [existing] = await db
      .select()
      .from(idempotencyLog)
      .where(eq(idempotencyLog.key, key))
      .limit(1);

    if (!existing) {
      return null;
    }

    // Check if expired
    if (existing.expiresAt < new Date()) {
      // Delete expired key
      await db.delete(idempotencyLog).where(eq(idempotencyLog.key, key));
      return null;
    }

    // Return existing message
    const [message] = await db
      .select()
      .from(sferaMessage)
      .where(eq(sferaMessage.id, existing.messageId))
      .limit(1);

    return message || null;
  }

  /**
   * Store idempotency key with message reference
   * Requirements: 15.2
   *
   * @param key - Idempotency key
   * @param messageId - Message ID to associate with key
   */
  async storeKey(key: string, messageId: string): Promise<void> {
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + this.EXPIRATION_HOURS * 60 * 60 * 1000
    );

    await db.insert(idempotencyLog).values({
      key,
      messageId,
      createdAt: now,
      expiresAt,
    });
  }

  /**
   * Check and execute operation with idempotency
   * Requirements: 15.2, 15.3, 15.4
   *
   * @param key - Idempotency key
   * @param operation - Operation to execute if key doesn't exist
   * @returns Result of operation or existing message
   */
  async checkAndStore(
    key: string,
    operation: () => Promise<SferaMessage>
  ): Promise<SferaMessage> {
    // Check if key exists
    const existing = await this.checkKey(key);
    if (existing) {
      return existing;
    }

    // Execute operation
    const message = await operation();

    // Store idempotency key
    await this.storeKey(key, message.id);

    return message;
  }

  /**
   * Clean up expired idempotency keys
   * Should be called periodically (e.g., via cron job)
   */
  async cleanupExpired(): Promise<void> {
    await db
      .delete(idempotencyLog)
      .where(eq(idempotencyLog.expiresAt, new Date()));
  }
}

// Export singleton instance
export const idempotencyService = new IdempotencyService();
