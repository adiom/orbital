import type { AgentResponseContext, AgentResponseEvent } from "./types";

/**
 * Notify the optional UI stream without allowing a client transport failure
 * to interrupt generation or database persistence.
 */
export function emitAgentResponseEvent(
  context: AgentResponseContext,
  event: AgentResponseEvent
): void {
  if (!context.onEvent) {
    return;
  }

  try {
    Promise.resolve(context.onEvent(event)).catch((error) => {
      console.error("Failed to publish agent response event:", error);
    });
  } catch (error) {
    console.error("Failed to publish agent response event:", error);
  }
}
