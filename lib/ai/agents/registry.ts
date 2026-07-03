/**
 * AI Agents Registry
 * Central registry for all available AI agents
 */

import { avroraAgent } from "./instances/avrora";
import { kristinaAgent } from "./instances/kristina";
import { cfKristinaAgent } from "./instances/cf-kristina";
import type { AIAgent } from "./types";

/**
 * All registered AI agents
 */
export const aiAgents: AIAgent[] = [avroraAgent, kristinaAgent, cfKristinaAgent];

/**
 * Get agent by ID
 */
export function getAgentById(id: string): AIAgent | undefined {
  return aiAgents.find((agent) => agent.id === id);
}

/**
 * Get agent by user ID
 */
export function getAgentByUserId(userId: string): AIAgent | undefined {
  return aiAgents.find((agent) => agent.userId === userId);
}

/**
 * Get all agent user IDs
 */
export function getAllAgentUserIds(): string[] {
  return aiAgents.map((agent) => agent.userId);
}

/**
 * Check if a user ID belongs to an AI agent
 */
export function isAIAgent(userId: string): boolean {
  return aiAgents.some((agent) => agent.userId === userId);
}
