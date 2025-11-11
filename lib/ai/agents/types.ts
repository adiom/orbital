/**
 * Types and interfaces for AI agents system
 */

import type { Tool } from "ai";

/**
 * AI Agent configuration
 */
export type AIAgent = {
  /** Unique identifier for the agent */
  id: string;

  /** Display name of the agent */
  name: string;

  /** Mention patterns to trigger the agent (e.g., @avrora, @аврора) */
  mentionPatterns: (string | RegExp)[];

  /** User ID in the database for this agent */
  userId: string;

  /** Email address for the agent */
  email: string;

  /** Model to use for this agent (e.g., "chat-model", "gpt-5-mini") */
  model: string;

  /** Build system prompt for this agent */
  buildSystemPrompt: (context: AgentPromptContext) => string;

  /** Tools available to this agent */
  tools?: Record<string, Tool>;

  /** Temperature for text generation (0-1) */
  temperature?: number;

  /** Maximum number of tool call steps */
  maxSteps?: number;

  /** Rate limit configuration (optional) */
  rateLimit?: {
    requestsPerMinute: number;
    requestsPerHour: number;
    cooldownSeconds: number;
  };
};

/**
 * Context for building agent prompts
 */
export type AgentPromptContext = {
  /** Sfera information */
  sfera: {
    title: string;
    description: string | null;
  };

  /** User name for personalization */
  userName?: string;
};

/**
 * Context for agent response generation
 */
export type AgentResponseContext = {
  /** ID of the Sfera */
  sferaId: string;

  /** ID of the message that triggered the agent */
  triggerMessageId: string;

  /** ID of the empty message to stream into */
  targetMessageId: string;

  /** ID of the user who requested the agent */
  requestingUserId: string;

  /** Agent configuration */
  agent: AIAgent;
};

/**
 * Result of agent response generation
 */
export type AgentResponseResult = {
  /** Generated text */
  text: string;

  /** Tool execution results */
  toolResults?: any[];

  /** Token usage */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };

  /** Success status */
  success: boolean;

  /** Error message if failed */
  error?: string;
};
