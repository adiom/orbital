/**
 * AI Agents Client Registry
 * Lightweight registry for client-side use (no server dependencies)
 */

import { AVRORA_USER_ID, CF_KRISTINA_USER_ID } from "@/lib/constants/system-users";

export type AIAgentMetadata = {
  id: string;
  name: string;
  email: string;
  userId: string;
};

/**
 * Client-safe agent metadata (no server dependencies)
 */
export const aiAgentsMetadata: AIAgentMetadata[] = [
  {
    id: "avrora",
    name: "Avrora",
    email: "avrora@avrora.click",
    userId: AVRORA_USER_ID,
  },
  {
    id: "cf-kristina",
    name: "Кристина",
    email: "cf-kristina@avrora.click",
    userId: CF_KRISTINA_USER_ID,
  },
];

/**
 * Get agent metadata by ID
 */
export function getAgentMetadataById(id: string): AIAgentMetadata | undefined {
  return aiAgentsMetadata.find((agent) => agent.id === id);
}

/**
 * Get agent metadata by user ID
 */
export function getAgentMetadataByUserId(
  userId: string
): AIAgentMetadata | undefined {
  return aiAgentsMetadata.find((agent) => agent.userId === userId);
}

/**
 * Check if a user ID belongs to an AI agent
 */
export function isAIAgent(userId: string): boolean {
  return aiAgentsMetadata.some((agent) => agent.userId === userId);
}
