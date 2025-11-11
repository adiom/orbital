/**
 * AVRORA: Sfera Tools Integration
 *
 * This file provides tools specifically designed for use in Sfera collaborative discussions.
 * These tools extend Avrora AI's capabilities beyond simple conversation.
 */

import type { Tool } from "ai";
import { summarizeDiscussion } from "./tools/analytics";
import {
  generateImage,
  generateImageReplicate,
  generateMusic,
  generateVideo,
  speechToText,
} from "./tools/generative";
import { webSearch } from "./tools/integrations";
import { createMiniApp, createChart, createGame } from "./tools/mini-apps";

/**
 * Registry of all available Sfera tools
 * Tools are organized by category for easy management
 */
export type SferaToolsRegistry = {
  generative: Record<string, Tool<any, any>>;
  miniApps: Record<string, Tool<any, any>>;
  analytics: Record<string, Tool<any, any>>;
  integrations: Record<string, Tool<any, any>>;
};

/**
 * Get all tools available for Sfera
 * This function will be extended as we add more tools
 */
export function getSferaTools(): Tool<any, any>[] {
  const tools: Tool<any, any>[] = [];

  // Generative tools
  tools.push(generateImage); // Gemini image generation
  tools.push(generateImageReplicate); // Replicate FLUX image generation
  tools.push(generateMusic); // Replicate music generation
  tools.push(generateVideo); // Replicate video generation
  tools.push(speechToText); // Speech-to-text transcription
  // Note: TTS is still placeholder (needs ElevenLabs API)
  // tools.push(textToSpeech);

  // Analytics tools
  tools.push(summarizeDiscussion);
  // TODO: Add more analytics tools (extract-topics, find-connections, sentiment)

  // Integration tools
  tools.push(webSearch);

  // Mini-app tools
  tools.push(createMiniApp);
  tools.push(createChart);
  tools.push(createGame);

  return tools;
}

/**
 * Check if a message content contains a tool invocation request
 * Examples:
 * - "@avrora сгенерируй картинку: космический корабль"
 * - "@avrora создай приложение для подсчета калорий"
 * - "@avrora резюмируй обсуждение"
 */
export function detectToolRequest(content: string): {
  hasToolRequest: boolean;
  toolName?: string;
  toolInput?: string;
} {
  const lowerContent = content.toLowerCase();

  // Generative tools patterns
  if (
    lowerContent.includes("сгенерируй картинку") ||
    lowerContent.includes("создай картинку") ||
    lowerContent.includes("нарисуй")
  ) {
    return {
      hasToolRequest: true,
      toolName: "generate-image",
      toolInput: content,
    };
  }

  // Mini-app patterns
  if (
    lowerContent.includes("создай приложение") ||
    lowerContent.includes("сделай приложение") ||
    lowerContent.includes("создай react") ||
    lowerContent.includes("создай web app") ||
    lowerContent.includes("создай web-app") ||
    lowerContent.includes("создай мини-приложение") ||
    lowerContent.includes("создай компонент")
  ) {
    return {
      hasToolRequest: true,
      toolName: "create-mini-app",
      toolInput: content,
    };
  }

  if (
    lowerContent.includes("построй график") ||
    lowerContent.includes("создай график")
  ) {
    return {
      hasToolRequest: true,
      toolName: "create-chart",
      toolInput: content,
    };
  }

  if (
    lowerContent.includes("создай викторину") ||
    lowerContent.includes("сделай игру")
  ) {
    return {
      hasToolRequest: true,
      toolName: "create-game",
      toolInput: content,
    };
  }

  // Analytics patterns
  if (
    lowerContent.includes("резюмируй") ||
    lowerContent.includes("подведи итог") ||
    lowerContent.includes("суммируй")
  ) {
    return {
      hasToolRequest: true,
      toolName: "summarize-discussion",
      toolInput: content,
    };
  }

  if (
    lowerContent.includes("какие темы") ||
    lowerContent.includes("основные темы")
  ) {
    return {
      hasToolRequest: true,
      toolName: "extract-topics",
      toolInput: content,
    };
  }

  if (
    lowerContent.includes("тональность") ||
    lowerContent.includes("настроение")
  ) {
    return {
      hasToolRequest: true,
      toolName: "analyze-sentiment",
      toolInput: content,
    };
  }

  // Integration patterns
  if (
    lowerContent.includes("найди в интернете") ||
    lowerContent.includes("поищи информацию")
  ) {
    return {
      hasToolRequest: true,
      toolName: "web-search",
      toolInput: content,
    };
  }

  // Speech-to-text patterns
  if (
    lowerContent.includes("преобразуй в текст") ||
    lowerContent.includes("транскрибируй") ||
    lowerContent.includes("расшифруй аудио") ||
    lowerContent.includes("transcribe")
  ) {
    return {
      hasToolRequest: true,
      toolName: "speech-to-text",
      toolInput: content,
    };
  }

  return {
    hasToolRequest: false,
  };
}

/**
 * Placeholder for tool execution tracking
 * Will log tool executions to the ToolExecution table
 */
export function trackToolExecution(params: {
  toolName: string;
  sferaId: string;
  userId: string;
  input: unknown;
  output?: unknown;
  status: "pending" | "success" | "error";
  errorMessage?: string;
}) {
  // TODO: Implement database logging
  console.log("Tool execution tracked:", params);
}
