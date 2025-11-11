import { and, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import { aiUsageLog } from "@/lib/db/schema";

// Model pricing (per 1M tokens) in USD
const MODEL_PRICING = {
  "gpt-5": {
    input: 1.25,
    output: 10.0,
  },
  "gpt-5-nano": {
    input: 0.05,
    output: 0.4,
  },
  "gpt-5-mini": {
    input: 0.25,
    output: 2,
  },
} as const;

// Tool costs (approximate, in USD)
const TOOL_COSTS = {
  generateImage: 0.02, // Gemini Imagen
  generateImageReplicate: 0.08, // Replicate FLUX
  generateMusic: 0.15, // Replicate music
  generateVideo: 0.3, // Replicate video
  webSearch: 0.005, // Tavily
  speechToText: 0.01, // Whisper
  summarizeDiscussion: 0.0, // Just LLM tokens
  createMiniApp: 0.0, // Just LLM tokens
  createChart: 0.0, // Just LLM tokens
  createGame: 0.0, // Just LLM tokens
  editMiniApp: 0.0, // Just LLM tokens
} as const;

export type UsageLogParams = {
  userId: string;
  sferaId?: string;
  messageId?: string;
  modelUsed: string;
  provider?: string;
  inputTokens: number;
  outputTokens: number;
  toolName?: string;
  toolParameters?: Record<string, unknown>;
  toolExecutionTimeMs?: number;
  contextSize?: number;
  status?: "success" | "error" | "rate_limited";
  errorMessage?: string;
};

/**
 * Calculate cost in USD cents based on model and tokens
 */
export function calculateCost(
  modelUsed: string,
  inputTokens: number,
  outputTokens: number,
  toolName?: string
): number {
  let cost = 0;

  // Get model pricing
  const modelKey = modelUsed.toLowerCase() as keyof typeof MODEL_PRICING;
  const pricing = MODEL_PRICING[modelKey];

  if (pricing) {
    // Calculate LLM cost
    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;
    cost += inputCost + outputCost;
  }

  // Add tool cost
  if (toolName && toolName in TOOL_COSTS) {
    const toolKey = toolName as keyof typeof TOOL_COSTS;
    cost += TOOL_COSTS[toolKey];
  }

  // Convert to cents
  return Math.round(cost * 100);
}

/**
 * Log AI usage to database
 */
export async function logAiUsage(params: UsageLogParams): Promise<void> {
  try {
    const totalTokens = params.inputTokens + params.outputTokens;
    const estimatedCost = calculateCost(
      params.modelUsed,
      params.inputTokens,
      params.outputTokens,
      params.toolName
    );

    await db.insert(aiUsageLog).values({
      userId: params.userId,
      sferaId: params.sferaId,
      messageId: params.messageId,
      modelUsed: params.modelUsed,
      provider: params.provider || "openai",
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      totalTokens,
      toolName: params.toolName,
      toolParameters: params.toolParameters,
      toolExecutionTimeMs: params.toolExecutionTimeMs,
      estimatedCost,
      status: params.status || "success",
      errorMessage: params.errorMessage,
      contextSize: params.contextSize || 0,
      createdAt: new Date(),
    });

    console.log("📊 AI usage logged:", {
      userId: params.userId,
      model: params.modelUsed,
      tokens: totalTokens,
      tool: params.toolName,
      cost: `$${(estimatedCost / 100).toFixed(4)}`,
    });
  } catch (error) {
    console.error("Failed to log AI usage:", error);
    // Don't throw - logging failure shouldn't break the main flow
  }
}

/**
 * Get user's daily AI spending
 */
export async function getUserDailySpending(userId: string): Promise<number> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await db
      .select({
        totalCost: aiUsageLog.estimatedCost,
      })
      .from(aiUsageLog)
      .where(
        and(
          eq(aiUsageLog.userId, userId),
          gte(aiUsageLog.createdAt, today),
          eq(aiUsageLog.status, "success")
        )
      );

    const totalCents = result.reduce(
      (sum, row) => sum + (row.totalCost || 0),
      0
    );
    return totalCents / 100; // Convert to dollars
  } catch (error) {
    console.error("Failed to get daily spending:", error);
    return 0;
  }
}

/**
 * Check if user is within budget
 */
export async function checkUserBudget(
  userId: string,
  dailyLimitUsd = 10.0
): Promise<{ allowed: boolean; spent: number; limit: number }> {
  const spent = await getUserDailySpending(userId);

  return {
    allowed: spent < dailyLimitUsd,
    spent,
    limit: dailyLimitUsd,
  };
}
