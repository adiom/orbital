/**
 * AI Agent Mention Detector
 * Detects @mentions of AI agents in messages
 */

import { aiAgents } from "./registry";
import type { AIAgent } from "./types";

/**
 * Detect all AI agents mentioned in a message
 */
export function detectMentionedAgents(content: string): AIAgent[] {
  const mentionedAgents: AIAgent[] = [];
  const lowerContent = content.toLowerCase();

  for (const agent of aiAgents) {
    // Check each mention pattern for this agent
    const isMentioned = agent.mentionPatterns.some((pattern) => {
      if (pattern instanceof RegExp) {
        return pattern.test(content);
      }
      return lowerContent.includes(pattern.toLowerCase());
    });

    if (isMentioned && !mentionedAgents.includes(agent)) {
      mentionedAgents.push(agent);
    }
  }

  return mentionedAgents;
}

/**
 * Check if any AI agent is mentioned
 */
export function hasAgentMention(content: string): boolean {
  return detectMentionedAgents(content).length > 0;
}

/**
 * Check if a specific agent is mentioned
 */
export function isAgentMentioned(content: string, agentId: string): boolean {
  const agent = aiAgents.find((a) => a.id === agentId);
  if (!agent) {
    return false;
  }

  const lowerContent = content.toLowerCase();
  return agent.mentionPatterns.some((pattern) => {
    if (pattern instanceof RegExp) {
      return pattern.test(content);
    }
    return lowerContent.includes(pattern.toLowerCase());
  });
}
