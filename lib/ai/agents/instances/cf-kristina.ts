/**
 * Kristina - External AI Agent connected via MCP
 *
 * This agent runs outside avrora-area at http://localhost:3000/api/mcp.
 * It is triggered by @kristina or @кристина mentions in Sfera.
 */

import { CF_KRISTINA_USER_ID } from "@/lib/constants/system-users";
import type { AIAgent } from "../types";

/**
 * cf-kristina external agent configuration
 */
export const cfKristinaAgent: AIAgent = {
  id: "cf-kristina",
  name: "Кристина",
  mentionPatterns: [/@kristina/i, /@кристина/i, /@cf-kristina/i],
  userId: CF_KRISTINA_USER_ID,
  email: "cf-kristina@avrora.click",
  runtime: "external-mcp",
  model: "", // not used for external agents
  buildSystemPrompt: () => "", // not used for external agents

  externalMcp: {
    endpoint: "http://localhost:31337/api/mcp",
  },

  rateLimit: {
    requestsPerMinute: 3,
    requestsPerHour: 20,
    cooldownSeconds: 5,
  },
};
