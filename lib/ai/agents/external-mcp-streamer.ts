/**
 * External MCP Agent Streamer
 *
 * Calls external agents (like cf-kristina) via MCP and saves
 * their response into a Sfera message.
 */

import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sfera, sferaMessage, user } from "@/lib/db/schema";
import { resolveAgent, silenceAgent } from "./resolve";
import { emitAgentResponseEvent } from "./stream-events";
import type { AIAgent, ExternalMcpConfig } from "./types";
import type { AgentResponseContext, AgentResponseResult } from "./types";

/**
 * Strip LLM thinking/reasoning blocks from response text.
 * Handles common formats: <think>...</think>, <think>...</think>,
 * and Qwen-style "Okay, the user is asking..." preamble.
 */
function stripThinking(text: string): string {
  let result = text;

  // Remove <think>...</think> blocks (deepseek/qwen thinking)
  result = result.replace(/<think>[\s\S]*?<\/think>/gi, "");

  // Remove <think>...</think> blocks
  result = result.replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "");

  // Remove Qwen-style preamble: starts with "Okay," or "Let me" or "The user"
  // and ends before the first actual paragraph (double newline or Cyrillic text)
  const preamblePattern =
    /^(?:Okay,?\s|Let me\s|The user|I need to|I should|Looking at|Checking|From the|Based on)[\s\S]{20,}?(?=\n\n|\n(?=[А-Яа-яЁё]))/;
  result = result.replace(preamblePattern, "");

  return result.trim();
}

/**
 * Select recent messages for context sent to the external agent.
 * Reuses the same logic as the internal streamer.
 */
function selectContext(
  messages: Array<{
    id: string;
    content: string;
    userId: string;
    userEmail: string;
    createdAt: Date;
  }>,
  _triggerMessageId: string
): typeof messages {
  const TARGET_TOKENS = 2000;
  const RECENT_COUNT = 5;

  if (messages.length === 0) {
    return [];
  }

  const recentMessages = messages.slice(-RECENT_COUNT);
  const selectedIds = new Set<string>();
  const selected: typeof messages = [];

  for (const msg of recentMessages) {
    if (!selectedIds.has(msg.id)) {
      selected.push(msg);
      selectedIds.add(msg.id);
    }
  }

  let currentTokens = selected.reduce(
    (sum, msg) => sum + Math.ceil(`${msg.userEmail}: ${msg.content}`.length / 4),
    0
  );

  for (
    let i = messages.length - 1;
    i >= 0 && currentTokens < TARGET_TOKENS;
    i--
  ) {
    const msg = messages[i];
    if (!selectedIds.has(msg.id)) {
      const msgTokens = Math.ceil(`${msg.userEmail}: ${msg.content}`.length / 4);
      if (currentTokens + msgTokens <= TARGET_TOKENS) {
        selected.push(msg);
        selectedIds.add(msg.id);
        currentTokens += msgTokens;
      }
    }
  }

  return selected.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

/**
 * Call the external MCP endpoint and return the raw JSON result.
 */
async function callMcpTool(
  config: ExternalMcpConfig,
  prompt: string,
  contextPayload: Record<string, unknown>,
  abortSignal?: AbortSignal
): Promise<string> {
  const body = {
    jsonrpc: "2.0",
    id: Date.now(),
    method: "tools/call",
    params: {
      name: "agent_message",
      arguments: { prompt, context: contextPayload },
    },
  };

  console.log(`🔗 Calling external MCP agent at ${config.endpoint}`);

  const response = await fetch(config.endpoint, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream",
    },
    body: JSON.stringify(body),
    signal: abortSignal,
  });

  if (!response.ok) {
    throw new Error(`MCP endpoint returned HTTP ${response.status}`);
  }

  const json = await response.json();

  if (json.error) {
    throw new Error(`MCP error: ${json.error.message || JSON.stringify(json.error)}`);
  }

  // MCP result.content[0].text is a JSON string containing AgentResult
  const contentText = json.result?.content?.[0]?.text;
  if (!contentText) {
    throw new Error("MCP response missing result.content[0].text");
  }

  return contentText;
}

/**
 * Generate agent response by calling an external MCP agent.
 * The external agent runs outside avrora-area (e.g. cf-kristina).
 */
export async function streamExternalMcpAgentResponse(
  context: AgentResponseContext
): Promise<AgentResponseResult> {
  const { sferaId, triggerMessageId, targetMessageId, requestingUserId } =
    context;
  let sequence = 0;
  let currentText = "";

  // Same resolution point as the internal streamer — see resolve.ts. For MCP
  // agents this is also where a console-supplied endpoint takes effect.
  const agent = await resolveAgent(context.agent);

  emitAgentResponseEvent(context, {
    phase: "started",
    agentId: agent.id,
    messageId: targetMessageId,
    content: "",
    sequence: sequence++,
  });

  if (agent.enabled === false) {
    const result = await silenceAgent({
      agent,
      targetMessageId,
      reason: "выключен на пульте",
    });
    emitAgentResponseEvent(context, {
      phase: "completed",
      agentId: agent.id,
      messageId: targetMessageId,
      content: "",
      sequence: sequence++,
    });
    return result;
  }

  console.log(`📝 ${agent.name} (external MCP) generating response:`, {
    sferaId,
    triggerMessageId,
    targetMessageId,
  });

  try {
    const externalMcp = agent.externalMcp;
    if (!externalMcp) {
      throw new Error(`Agent ${agent.id} has no externalMcp config`);
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

    // Get recent messages for context
    const messages = await db
      .select({
        id: sferaMessage.id,
        content: sferaMessage.content,
        userId: sferaMessage.userId,
        userEmail: user.email,
        createdAt: sferaMessage.createdAt,
      })
      .from(sferaMessage)
      .innerJoin(user, eq(sferaMessage.userId, user.id))
      .where(eq(sferaMessage.sferaId, sferaId))
      .orderBy(desc(sferaMessage.createdAt))
      .limit(30);

    const allMessages = messages.reverse();
    const contextMessages = selectContext(allMessages, triggerMessageId);

    console.log(
      `🧠 ${agent.name}: Selected ${contextMessages.length} messages for context`
    );

    // Build conversation history for the external agent
    const conversationHistory = contextMessages.map((msg) => ({
      role: (msg.userId === requestingUserId ? "user" : "assistant") as "user" | "assistant",
      author: msg.userEmail.split("@")[0],
      content: msg.content,
    }));

    // Get trigger message
    const triggerMessage = contextMessages.find(
      (m) => m.id === triggerMessageId
    );
    if (!triggerMessage) {
      throw new Error("Trigger message not found");
    }

    const userName = triggerMessage.userEmail.split("@")[0];

    // Build the AgentContext payload for cf-kristina
    const contextPayload = {
      source: "sfera",
      serviceId: "avrora-area",
      serviceName: "Avrora Area",
      spaceId: sferaId,
      spaceName: sferaData.title,
      userId: requestingUserId,
      userName,
      trigger: "mention",
      responseMode: "public",
      conversationHistory,
      memoryAccess: {
        own: true,
        user: true,
        space: true,
        service: true,
        write: true,
      },
    };

    // Call the external MCP agent
    const rawResultText = await callMcpTool(
      externalMcp,
      triggerMessage.content,
      contextPayload,
      context.abortSignal
    );

    // Parse AgentResult from the MCP response
    let agentResultText: string;
    try {
      const agentResult = JSON.parse(rawResultText);
      agentResultText = agentResult.text || rawResultText;
    } catch {
      // If JSON parse fails, use raw text as fallback
      agentResultText = rawResultText;
    }

    // Strip thinking/reasoning blocks from the response
    agentResultText = stripThinking(agentResultText);
    currentText = agentResultText.trim();

    // Save the response into the placeholder message
    await db
      .update(sferaMessage)
      .set({
        content: currentText,
        isGenerating: false,
      })
      .where(eq(sferaMessage.id, targetMessageId));

    // Update Sfera's updatedAt
    await db
      .update(sfera)
      .set({ updatedAt: new Date() })
      .where(eq(sfera.id, sferaId));

    emitAgentResponseEvent(context, {
      phase: "completed",
      agentId: agent.id,
      messageId: targetMessageId,
      content: currentText,
      sequence: sequence++,
    });

    console.log(
      `✅ ${agent.name} (external MCP): Response saved (${agentResultText.length} chars)`
    );

    return {
      text: currentText,
      success: true,
    };
  } catch (error) {
    console.error(`❌ ${agent.name} (external MCP) error:`, error);

    const wasAborted = context.abortSignal?.aborted === true;
    const errorMessage =
      error instanceof Error ? error.message : "External agent failed";

    // Save error into the placeholder message
    await db
      .update(sferaMessage)
      .set({
        content: wasAborted ? currentText : `Error: ${errorMessage}`,
        isGenerating: false,
      })
      .where(eq(sferaMessage.id, targetMessageId));

    emitAgentResponseEvent(context, {
      phase: wasAborted ? "aborted" : "failed",
      agentId: agent.id,
      messageId: targetMessageId,
      content: currentText,
      sequence: sequence++,
      error: wasAborted ? undefined : errorMessage,
    });

    return {
      text: "",
      success: false,
      error: errorMessage,
    };
  }
}
