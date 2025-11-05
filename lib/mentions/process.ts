import { db } from "@/lib/db";
import { messageMention } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { Mention } from "../mentions/parser";
import { parseMentions } from "../mentions/parser";

/**
 * Process mentions in a message and save to database
 */
export async function processMentions(
  messageId: string,
  messageText: string,
  chatId: string
): Promise<Mention[]> {
  const mentions = parseMentions(messageText);

  if (mentions.length === 0) {
    return [];
  }

  // Save mentions to database
  try {
    const mentionRecords = mentions.map((mention) => ({
      messageId,
      mentionedUserId: mention.type === "user" ? mention.userId : null,
      mentionType: mention.type,
      mentionText: mention.text,
      createdAt: new Date(),
    }));

    await db.insert(messageMention).values(mentionRecords);

    console.log(
      `✅ Saved ${mentions.length} mentions for message ${messageId}`
    );
  } catch (error) {
    console.error("Error saving mentions:", error);
  }

  return mentions;
}

/**
 * Get all mentions for a message
 */
export async function getMessageMentions(
  messageId: string
): Promise<Array<{
  id: string;
  mentionType: string;
  mentionText: string;
  mentionedUserId: string | null;
}>> {
  const mentions = await db
    .select({
      id: messageMention.id,
      mentionType: messageMention.mentionType,
      mentionText: messageMention.mentionText,
      mentionedUserId: messageMention.mentionedUserId,
    })
    .from(messageMention)
    .where(eq(messageMention.messageId, messageId));

  return mentions;
}

/**
 * Check if message mentions Avrora
 */
export function messageHasAvroraMention(mentions: Mention[]): boolean {
  return mentions.some((m) => m.type === "avrora");
}
