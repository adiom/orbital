/**
 * Base streaming functionality for AI agents
 */

import { smoothStream, stepCountIs, streamText } from "ai";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sfera, sferaMessage, user } from "@/lib/db/schema";
import { myProvider } from "../providers";
import { logAiUsage } from "../usage-logger";
import { resolveAgent, silenceAgent } from "./resolve";
import { emitAgentResponseEvent } from "./stream-events";
import type { AgentResponseContext, AgentResponseResult } from "./types";

/**
 * Estimate token count for a message (rough estimate: 1 token ≈ 4 characters)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Smart context selection to keep within ~2000 token budget
 */
function selectSmartContext(
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

  // Add recent messages first
  for (const msg of recentMessages) {
    if (!selectedIds.has(msg.id)) {
      selected.push(msg);
      selectedIds.add(msg.id);
    }
  }

  // Calculate current token count
  let currentTokens = selected.reduce(
    (sum, msg) => sum + estimateTokens(`${msg.userEmail}: ${msg.content}`),
    0
  );

  // Fill remaining budget with recent messages
  for (
    let i = messages.length - 1;
    i >= 0 && currentTokens < TARGET_TOKENS;
    i--
  ) {
    const msg = messages[i];
    if (!selectedIds.has(msg.id)) {
      const msgTokens = estimateTokens(`${msg.userEmail}: ${msg.content}`);
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
 * Generate agent response with streaming
 */
export async function streamAgentResponse(
  context: AgentResponseContext
): Promise<AgentResponseResult> {
  const { sferaId, triggerMessageId, targetMessageId, requestingUserId } =
    context;
  let sequence = 0;
  let currentText = "";
  let pendingPersistence: Promise<void> = Promise.resolve();

  // Operator overrides from the console are applied here rather than at the
  // call sites: eight places look an agent up, but every reply passes through
  // this function, so no route can bypass the settings.
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

  console.log(`📝 ${agent.name} generating response:`, {
    sferaId,
    triggerMessageId,
    targetMessageId,
  });

  try {
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
    const contextMessages = selectSmartContext(allMessages, triggerMessageId);

    console.log(
      `🧠 ${agent.name}: Selected ${contextMessages.length} messages for context`
    );

    // Build conversation context
    const conversationContext = contextMessages
      .map((msg) => `${msg.userEmail}: ${msg.content}`)
      .join("\n\n");

    // Get trigger message
    const triggerMessage = contextMessages.find(
      (m) => m.id === triggerMessageId
    );
    if (!triggerMessage) {
      throw new Error("Trigger message not found");
    }

    // Get user name
    const userName = triggerMessage.userEmail.split("@")[0];

    // Build system prompt
    const systemPrompt = agent.buildSystemPrompt({
      sfera: {
        title: sferaData.title,
        description: sferaData.description,
      },
      userName,
      requestingUserId: context.requestingUserId,
    });

    console.log(`🧠 ${agent.name}: Generating with model ${agent.model}...`);
    console.log(`🧠 ${agent.name}: System prompt (first 500 chars):`, systemPrompt.substring(0, 500));
    const model = myProvider.languageModel(agent.model);

    // Track streaming state
    let lastUpdateTime = Date.now();
    const UPDATE_THROTTLE_MS = 500;

    const toolResults: any[] = [];
    const executedToolNames: string[] = [];

    // Start streaming
    const result = await streamText({
      model,
      system: systemPrompt,
      prompt: `Context of recent discussion:
${conversationContext}

Respond to the message from ${triggerMessage.userEmail}:
${triggerMessage.content}`,
      temperature: agent.temperature ?? 0.7,
      tools: agent.tools,
      stopWhen: agent.maxSteps ? stepCountIs(agent.maxSteps) : undefined,
      abortSignal: context.abortSignal,
      experimental_transform: smoothStream({
        chunking: "word",
        delayInMs: null,
      }),
      onChunk: async ({ chunk }) => {
        // Handle text deltas
        if (chunk.type === "text-delta") {
          currentText += chunk.text;

          emitAgentResponseEvent(context, {
            phase: "streaming",
            agentId: agent.id,
            messageId: targetMessageId,
            content: currentText,
            sequence: sequence++,
          });

          // Throttle DB updates to avoid too many writes
          const now = Date.now();
          if (now - lastUpdateTime >= UPDATE_THROTTLE_MS) {
            const snapshot = currentText;
            lastUpdateTime = now;
            pendingPersistence = pendingPersistence
              .then(async () => {
                await db
                  .update(sferaMessage)
                  .set({ content: snapshot })
                  .where(eq(sferaMessage.id, targetMessageId));
              })
              .catch((error) => {
                console.error(
                  `❌ ${agent.name}: Failed to update message:`,
                  error
                );
              });
          }
        }
      },
    });

    // Wait for completion
    const { text, usage, steps } = await result;

    // Process tool calls
    const resolvedSteps = await steps;
    if (resolvedSteps && resolvedSteps.length > 0) {
      console.log(`🔧 ${agent.name}: Executed ${resolvedSteps.length} steps`);

      for (const step of resolvedSteps) {
        if (step.toolCalls && step.toolCalls.length > 0) {
          for (const toolCall of step.toolCalls) {
            console.log(`✅ ${agent.name} used tool: ${toolCall.toolName}`);
            executedToolNames.push(toolCall.toolName);

            if (step.toolResults) {
              const toolResult = step.toolResults.find(
                (r) => r.toolCallId === toolCall.toolCallId
              );
              if (toolResult) {
                // toolResult is already the result object in AI SDK 5.0
                const resultData =
                  typeof toolResult === "object" && toolResult !== null
                    ? toolResult
                    : {};
                // Remove toolName from resultData if it exists to avoid conflict
                const { toolName: _, ...restResultData } = resultData as Record<
                  string,
                  unknown
                >;
                toolResults.push({
                  toolName: toolCall.toolName,
                  ...restResultData,
                });
              }
            }
          }
        }
      }
    }

    const resolvedText = await text;
    const resolvedUsage = await usage;
    console.log(
      `✅ ${agent.name}: Response generated (${resolvedText.length} chars)`
    );

    await pendingPersistence;

    // Final update with tool results
    await db
      .update(sferaMessage)
      .set({
        content: resolvedText?.trim() || "",
        toolResults: toolResults.length > 0 ? (toolResults as any) : undefined,
        isGenerating: false,
      })
      .where(eq(sferaMessage.id, targetMessageId));

    emitAgentResponseEvent(context, {
      phase: "completed",
      agentId: agent.id,
      messageId: targetMessageId,
      content: resolvedText.trim(),
      sequence: sequence++,
      toolResults,
    });

    // Log AI usage
    await logAiUsage({
      userId: requestingUserId,
      sferaId,
      messageId: triggerMessageId,
      modelUsed: agent.model,
      provider: "openai", // TODO: detect from model
      inputTokens: resolvedUsage?.inputTokens || 0,
      outputTokens: resolvedUsage?.outputTokens || 0,
      toolName: executedToolNames.length > 0 ? executedToolNames[0] : undefined,
      toolParameters:
        executedToolNames.length > 0 ? { tools: executedToolNames } : undefined,
      contextSize: contextMessages.length,
      status: "success",
    });

    // Update Sfera's updatedAt
    await db
      .update(sfera)
      .set({ updatedAt: new Date() })
      .where(eq(sfera.id, sferaId));

    return {
      text: resolvedText.trim(),
      toolResults,
      usage: {
        promptTokens: resolvedUsage?.inputTokens || 0,
        completionTokens: resolvedUsage?.outputTokens || 0,
        totalTokens: resolvedUsage?.totalTokens || 0,
      },
      success: true,
    };
  } catch (error) {
    console.error(`❌ ${agent.name}: Error generating response:`, error);

    await pendingPersistence;

    const wasAborted = context.abortSignal?.aborted === true;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Update message to mark as failed
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

    // Log error
    await logAiUsage({
      userId: requestingUserId,
      sferaId,
      messageId: triggerMessageId,
      modelUsed: agent.model,
      provider: "openai",
      inputTokens: 0,
      outputTokens: 0,
      status: "error",
      errorMessage,
    });

    return {
      text: "",
      success: false,
      error: errorMessage,
    };
  }
}
