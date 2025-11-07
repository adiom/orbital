/**
 * AVRORA: Summarize Discussion Tool
 *
 * Analyzes Sfera discussion messages and generates a concise summary.
 * Useful for getting quick overview of long discussions.
 */

import { generateText, tool } from "ai";
import { z } from "zod";
import { myProvider } from "../../providers";

/**
 * Summarize a Sfera discussion
 *
 * Example usage in Sfera:
 * "@avrora резюмируй обсуждение"
 * "@avrora подведи итог дискуссии"
 * "@avrora суммируй последние сообщения"
 */
export const summarizeDiscussion = tool({
  description:
    "Summarize a Sfera discussion. " +
    "Analyzes recent messages and creates a concise summary highlighting key points, " +
    "decisions made, and action items. Use this when user asks to summarize or recap discussion.",

  inputSchema: z.object({
    contextMessages: z
      .string()
      .describe(
        "Recent discussion messages as formatted text (e.g., 'user1: message1\\n\\nuser2: message2')"
      ),
    summaryLength: z
      .enum(["brief", "medium", "detailed"])
      .optional()
      .default("medium")
      .describe(
        "Length of the summary: brief (2-3 sentences), medium (1 paragraph), detailed (multiple paragraphs)"
      ),
  }),

  execute: async ({ contextMessages, summaryLength }) => {
    try {
      if (!contextMessages || contextMessages.trim().length === 0) {
        return {
          success: false,
          summary: "Нет сообщений для резюмирования.",
        };
      }

      // Build summary prompt based on parameters
      const lengthGuidance = {
        brief: "очень кратко (2-3 предложения)",
        medium: "средней длины (один абзац)",
        detailed: "подробно (несколько абзацев с детальным анализом)",
      };

      const summaryPrompt = `Проанализируй следующее обсуждение и создай ${lengthGuidance[summaryLength]} резюме.

Сообщения обсуждения:
${contextMessages}

Создай структурированное резюме, которое включает:
- Основные темы обсуждения
- Ключевые моменты и идеи
- Принятые решения (если есть)
- Задачи к выполнению (если упоминались)

Пиши только резюме, без вступлений типа "Вот резюме" или "Обсуждение касалось".`;

      console.log("📊 Generating discussion summary...");

      // Use AI to generate the summary
      const model = myProvider.languageModel("chat-model");
      const { text: summary } = await generateText({
        model,
        prompt: summaryPrompt,
        temperature: 0.5,
        maxOutputTokens:
          summaryLength === "brief"
            ? 150
            : summaryLength === "medium"
              ? 300
              : 600,
      });

      console.log("✅ Summary generated:", summary.substring(0, 100) + "...");

      return {
        success: true,
        summary: summary.trim(),
        summaryLength,
        message: `Резюме обсуждения (${summaryLength}):`,
      };
    } catch (error) {
      console.error("❌ Error in summarizeDiscussion:", error);

      return {
        success: false,
        summary: "Не удалось создать резюме обсуждения.",
        error:
          error instanceof Error
            ? error.message
            : "Failed to summarize discussion.",
      };
    }
  },
});

/**
 * Helper function to extract summarization request from natural language
 */
export function parseSummarizeRequest(content: string): {
  summaryLength?: "brief" | "medium" | "detailed";
  focusAreas?: string[];
} | null {
  const lowerContent = content.toLowerCase();

  // Check if it's a summarization request
  const isSummaryRequest =
    lowerContent.includes("резюмируй") ||
    lowerContent.includes("подведи итог") ||
    lowerContent.includes("суммируй") ||
    lowerContent.includes("summarize") ||
    lowerContent.includes("summary");

  if (!isSummaryRequest) {
    return null;
  }

  // Detect summary length
  let summaryLength: "brief" | "medium" | "detailed" = "medium";
  if (
    lowerContent.includes("кратко") ||
    lowerContent.includes("коротко") ||
    lowerContent.includes("brief")
  ) {
    summaryLength = "brief";
  } else if (
    lowerContent.includes("подробно") ||
    lowerContent.includes("детально") ||
    lowerContent.includes("detailed")
  ) {
    summaryLength = "detailed";
  }

  // Detect focus areas
  const focusAreas: string[] = [];
  if (lowerContent.includes("решен")) {
    focusAreas.push("decisions");
  }
  if (lowerContent.includes("задач") || lowerContent.includes("action")) {
    focusAreas.push("action items");
  }
  if (lowerContent.includes("технич")) {
    focusAreas.push("technical details");
  }

  return {
    summaryLength,
    focusAreas: focusAreas.length > 0 ? focusAreas : undefined,
  };
}
