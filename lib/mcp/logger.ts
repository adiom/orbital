import { AVRORA_USER_ID } from "@/lib/constants/system-users";
import { db } from "@/lib/db";
import { sferaMessage } from "@/lib/db/schema";

/**
 * Log a Claude Code action to the AVRORA DEV Sfera
 */
export async function logToAvraaDevSfera(params: {
  toolName: string;
  arguments?: any;
  success: boolean;
  result?: any;
  error?: string;
  responseTimeMs?: number;
}): Promise<void> {
  try {
    const sferaId = process.env.SFERA_CLAUDE_UUID;

    if (!sferaId) {
      console.warn("⚠️ SFERA_CLAUDE_UUID not configured - skipping log");
      return;
    }

    // Format the log message
    const timestamp = new Date().toISOString();
    const status = params.success ? "✅" : "❌";
    const timing =
      params.responseTimeMs !== undefined
        ? ` (${params.responseTimeMs}ms)`
        : "";

    const argsSummary =
      params.arguments && Object.keys(params.arguments).length > 0
        ? `\n**Arguments:** ${JSON.stringify(params.arguments, null, 2)}`
        : "";

    const resultSummary = params.success
      ? `\n**Result:** ${
          typeof params.result === "string"
            ? params.result
            : JSON.stringify(params.result, null, 2)
        }`
      : `\n**Error:** ${params.error || "Unknown error"}`;

    const content = `${status} **${params.toolName}**${timing}

**Time:** ${timestamp}
${argsSummary}
${resultSummary}`;

    // Insert the log message
    await db.insert(sferaMessage).values({
      sferaId,
      userId: AVRORA_USER_ID,
      content,
      attachments: [],
      toolResults: [],
      parentMessageId: null,
      isForked: false,
      forkCount: 0,
      isGenerating: false,
    });

    console.log(`📝 Logged to AVRORA DEV: ${params.toolName}`);
  } catch (error) {
    // Don't throw - logging failure shouldn't break the API call
    console.error("⚠️ Failed to log to AVRORA DEV:", error);
  }
}
