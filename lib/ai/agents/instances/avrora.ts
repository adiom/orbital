/**
 * Avrora AI Agent
 * Creative and enthusiastic AI assistant for Sfera discussions
 */

import { buildSferaPrompt } from "@/lib/ai/prompts/index";
import { getSferaTools } from "@/lib/ai/sfera-tools";
import type { AIAgent } from "../types";

// Avrora's fixed UUID
export const AVRORA_USER_ID = "00000000-0000-0000-0000-000000000001";

/**
 * Avrora AI Agent Configuration
 */
export const avroraAgent: AIAgent = {
  id: "avrora",
  name: "Avrora",
  mentionPatterns: [/@avrora/i, /@аврора/i],
  userId: AVRORA_USER_ID,
  email: "avrora@avrora.click",
  model: "chat-model", // gpt-5-mini
  runtime: "internal",
  temperature: 0.7,
  maxSteps: 5,

  buildSystemPrompt: (context) => {
    return buildSferaPrompt(
      {
        title: context.sfera.title,
        description: context.sfera.description,
      },
      context.userName
    );
  },

  // Tools available to Avrora
  get tools() {
    const tools = getSferaTools();
    const toolsObject: Record<string, (typeof tools)[number]> = {};

    // Map tools by their description patterns
    tools.forEach((tool, index) => {
      const toolConfig = tool as any;
      let toolName = `tool_${index}`;

      if (
        toolConfig.description?.includes("Gemini") &&
        toolConfig.description?.includes("image")
      ) {
        toolName = "generateImage";
      } else if (
        toolConfig.description?.includes("FLUX") ||
        (toolConfig.description?.includes("Replicate") &&
          toolConfig.description?.includes("image"))
      ) {
        toolName = "generateImageReplicate";
      } else if (toolConfig.description?.includes("music")) {
        toolName = "generateMusic";
      } else if (toolConfig.description?.includes("video")) {
        toolName = "generateVideo";
      } else if (
        toolConfig.description?.includes("speech") ||
        toolConfig.description?.includes("transcribe")
      ) {
        toolName = "speechToText";
      } else if (toolConfig.description?.includes("summarize")) {
        toolName = "summarizeDiscussion";
      } else if (
        toolConfig.description?.includes("search") ||
        toolConfig.description?.includes("web")
      ) {
        toolName = "webSearch";
      } else if (
        toolConfig.description?.includes("mini-app") ||
        toolConfig.description?.includes("mini app")
      ) {
        toolName = "createMiniApp";
      } else if (toolConfig.description?.includes("chart")) {
        toolName = "createChart";
      } else if (
        toolConfig.description?.includes("game") ||
        toolConfig.description?.includes("quiz")
      ) {
        toolName = "createGame";
      } else if (
        toolConfig.description?.includes("edit") &&
        toolConfig.description?.includes("mini")
      ) {
        toolName = "editMiniApp";
      }

      toolsObject[toolName] = tool;
    });

    return toolsObject;
  },

  // Rate limiting
  rateLimit: {
    requestsPerMinute: 3,
    requestsPerHour: 20,
    cooldownSeconds: 5,
  },
};
