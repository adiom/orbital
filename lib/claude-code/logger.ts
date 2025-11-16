/**
 * Claude Code Logger
 * Sends work updates to Avrora Sfera using GitHub commit message style
 */

import { CLAUDE_CODE_USER_ID } from "@/lib/constants/system-users";

type ClaudeCodeMessageOptions = {
  content: string;
  files?: string[];
};

/**
 * Send a work update message to Sfera as Claude Code
 * Uses GitHub commit message conventions:
 *
 * Format:
 * <type>: <subject>
 *
 * <body>
 *
 * Types: feat, fix, refactor, docs, style, test, chore
 *
 * @example
 * await logClaudeCodeWork({
 *   content: "feat: Add parent message indicators\n\n- Created 5 indicator variants\n- Removed animations and gradients\n- Simplified color scheme",
 *   files: ["components/orbit/orbit-message.tsx"]
 * });
 */
export async function logClaudeCodeWork({
  content,
  files = [],
}: ClaudeCodeMessageOptions): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const sferaId = process.env.CLAUDE_CODE_SFERA_ID;

  if (!appUrl || !sferaId) {
    console.warn(
      "⚠️ NEXT_PUBLIC_APP_URL or CLAUDE_CODE_SFERA_ID not configured, skipping Claude Code log"
    );
    return false;
  }

  try {
    // Format content with file list
    let finalContent = content.trim();
    if (files.length > 0) {
      finalContent += "\n\n**Modified files:**\n";
      for (const file of files) {
        finalContent += `- \`${file}\`\n`;
      }
    }

    const response = await fetch(`${appUrl}/api/sfera/${sferaId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: finalContent,
        userId: CLAUDE_CODE_USER_ID,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("❌ Failed to log Claude Code work:", error);
      return false;
    }

    const data = await response.json();
    console.log("✅ Claude Code work logged:", {
      messageId: data.message?.id,
      sferaId,
    });

    return true;
  } catch (error) {
    console.error("❌ Error logging Claude Code work:", error);
    return false;
  }
}

/**
 * Format a task completion message in commit style
 */
export function formatTaskComplete(
  taskName: string,
  details: string[]
): string {
  return `feat: ${taskName}\n\n${details.map((d) => `- ${d}`).join("\n")}`;
}

/**
 * Format a refactor message
 */
export function formatRefactor(description: string, changes: string[]): string {
  return `refactor: ${description}\n\n${changes.map((c) => `- ${c}`).join("\n")}`;
}

/**
 * Format a fix message
 */
export function formatFix(issue: string, solution: string): string {
  return `fix: ${issue}\n\n${solution}`;
}

/**
 * Format a general update message
 */
export function formatUpdate(summary: string): string {
  return `chore: ${summary}`;
}
