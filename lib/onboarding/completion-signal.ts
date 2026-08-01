/**
 * Onboarding completion signal
 *
 * One place that decides whether a message carries the "onboarding is
 * finished" event. Both the renderer (which swaps the generic tool
 * plaque for the completion card) and the chat container (which starts
 * the closing animation) read it from here, so they can never disagree.
 */

import type { Message, ToolResult } from "@/components/chat/shared-message-type";

export const ONBOARDING_TOOL_NAME = "saveOnboardingProfile";

/**
 * Tool results are persisted in more than one shape depending on which
 * SDK version wrote them: flat, or with the payload nested under
 * `result` / `output`. Flatten to a single view before reading fields.
 */
export function normalizeToolResult(
  result: ToolResult
): Record<string, unknown> & { toolName?: string } {
  if ("result" in result && result.result && typeof result.result === "object") {
    return {
      toolName: result.toolName,
      ...(result.result as Record<string, unknown>),
    };
  }

  if ("output" in result && result.output && typeof result.output === "object") {
    return {
      toolName: result.toolName,
      ...(result.output as Record<string, unknown>),
    };
  }

  return result;
}

/** True for a saveOnboardingProfile result that actually succeeded. */
export function isOnboardingCompletionResult(result: ToolResult): boolean {
  const normalized = normalizeToolResult(result);
  return (
    normalized.toolName === ONBOARDING_TOOL_NAME && normalized.success === true
  );
}

/**
 * The success message written by the tool, when present — used as the
 * card's headline so the copy lives with the tool, not the UI.
 */
export function getOnboardingCompletionMessage(
  result: ToolResult
): string | undefined {
  const normalized = normalizeToolResult(result);
  return typeof normalized.message === "string" ? normalized.message : undefined;
}

/**
 * True once any message in the conversation reports a completed
 * onboarding. Still generating messages are ignored — a tool result only
 * lands on a message after the stream has finished writing it.
 */
export function hasOnboardingCompleted(messages: Message[]): boolean {
  return messages.some((message) =>
    message.toolResults?.some((result) => isOnboardingCompletionResult(result))
  );
}
