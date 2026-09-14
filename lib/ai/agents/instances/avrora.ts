/**
 * Avrora AI Agent
 * Creative and enthusiastic AI assistant for Sfera discussions
 */

import { getSferaTools } from "@/lib/ai/sfera-tools";
import { buildSferaPrompt } from "@/lib/ai/prompts/index";
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
  maxSteps: 3,

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
    return getSferaTools();
  },

  // Rate limiting
  rateLimit: {
    requestsPerMinute: 3,
    requestsPerHour: 20,
    cooldownSeconds: 5,
  },
};
