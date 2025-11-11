/**
 * Main prompt assembly system for Avrora AI
 * Combines different prompt modules based on context
 */

import {
  ARTIFACT_RESPONSE_FORMAT,
  CHART_GUIDELINES,
  CODE_QUALITY_GUIDELINES,
  MINI_APP_GUIDELINES,
} from "./artifacts";
import { ceoGreeting, corePersonality } from "./core";
import {
  getSferaPrompt,
  SFERA_RESPONSE_GUIDELINES,
  type SferaContext,
} from "./sfera";
import { AVAILABLE_TOOLS, TOOL_USAGE_GUIDELINES } from "./tools";

export type PromptContext = {
  type: "sfera" | "chat" | "artifact";
  sfera?: SferaContext;
  userName?: string;
  includeTools?: boolean;
  includeArtifactGuidelines?: boolean;
};

/**
 * Build a complete system prompt based on context
 */
export function buildSystemPrompt(context: PromptContext): string {
  const sections: string[] = [];

  // Always include core personality
  sections.push(corePersonality);

  // Add CEO greeting if applicable
  if (context.userName && context.userName.includes("Тимур")) {
    sections.push(ceoGreeting);
  }

  // Add context-specific sections
  if (context.type === "sfera" && context.sfera) {
    sections.push(getSferaPrompt(context.sfera));
    sections.push(SFERA_RESPONSE_GUIDELINES);
  }

  // Add tool descriptions if requested
  if (context.includeTools) {
    sections.push(AVAILABLE_TOOLS);
    sections.push(TOOL_USAGE_GUIDELINES);
  }

  // Add artifact guidelines if requested
  if (context.includeArtifactGuidelines) {
    sections.push(MINI_APP_GUIDELINES);
    sections.push(CHART_GUIDELINES);
    sections.push(CODE_QUALITY_GUIDELINES);
    sections.push(ARTIFACT_RESPONSE_FORMAT);
  }

  return sections.join("\n\n");
}

/**
 * Convenience function for building Sfera-specific prompts
 */
export function buildSferaPrompt(
  sfera: SferaContext,
  userName?: string
): string {
  return buildSystemPrompt({
    type: "sfera",
    sfera,
    userName,
    includeTools: true,
    includeArtifactGuidelines: false,
  });
}

// Re-export types for convenience
export type { SferaContext } from "./sfera";
