/**
 * AVRORA: Sfera Tools Integration
 *
 * This file provides tools specifically designed for use in Sfera collaborative discussions.
 * These tools extend Avrora AI's capabilities beyond simple conversation.
 *
 * Tools are automatically invoked by the AI SDK based on user requests.
 * No manual pattern matching is needed - the AI decides when to use tools.
 */

import type { Tool } from "ai";
import { summarizeDiscussion } from "./tools/analytics";
import {
  generateImage,
  generateMusic,
  generateVideo,
  speechToText,
} from "./tools/generative";
import { webSearch } from "./tools/integrations";
import {
  createChart,
  createGame,
  createMiniApp,
  editMiniApp,
} from "./tools/mini-apps";

/**
 * Tool categories for organization
 */
export const TOOL_CATEGORIES = {
  GENERATIVE: "generative",
  ANALYTICS: "analytics",
  INTEGRATIONS: "integrations",
  MINI_APPS: "mini_apps",
} as const;

/** Stable tool names are part of the model contract; do not infer them from descriptions. */
export function getSferaToolMap(): Record<string, Tool<any, any>> {
  return {
    generateImage,
    generateMusic,
    generateVideo,
    speechToText,
    summarizeDiscussion,
    webSearch,
    createMiniApp,
    createChart,
    createGame,
    editMiniApp,
  };
}

/**
 * Get all tools available for Sfera
 * Returns an array of tools that the AI can use based on context
 */
export function getSferaTools(): Tool<any, any>[] {
  return Object.values(getSferaToolMap());
}

/**
 * Get tool metadata for a specific tool by name
 * Useful for analytics and debugging
 */
export function getToolMetadata(toolName: string) {
  const tools = getSferaTools();
  const tool = tools.find((t: any) => {
    // Check various possible tool identifiers
    return (
      t.name === toolName ||
      t.description?.toLowerCase().includes(toolName.toLowerCase())
    );
  });

  return tool
    ? {
        name: (tool as any).name || "unknown",
        description: (tool as any).description || "No description",
        category: determineToolCategory(toolName),
      }
    : null;
}

/**
 * Determine tool category based on tool name
 */
function determineToolCategory(
  toolName: string
): keyof typeof TOOL_CATEGORIES | "unknown" {
  const name = toolName.toLowerCase();

  if (
    name.includes("image") ||
    name.includes("music") ||
    name.includes("video") ||
    name.includes("speech")
  ) {
    return "GENERATIVE";
  }

  if (name.includes("summarize") || name.includes("analytics")) {
    return "ANALYTICS";
  }

  if (name.includes("search") || name.includes("web")) {
    return "INTEGRATIONS";
  }

  if (
    name.includes("app") ||
    name.includes("chart") ||
    name.includes("game") ||
    name.includes("edit")
  ) {
    return "MINI_APPS";
  }

  return "unknown";
}
