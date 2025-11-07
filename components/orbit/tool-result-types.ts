/**
 * AVRORA: Common types for Sfera tool results
 */

export type ToolResult = {
  toolName: string;
  success: boolean;
  error?: string;
  // Image generation results
  imageUrl?: string;
  prompt?: string;
  aspectRatio?: string;
  // Music generation results
  audioUrl?: string;
  duration?: number;
  // Video generation results
  videoUrl?: string;
  fps?: number;
  // Summarize discussion results
  summary?: string;
  summaryLength?: string;
  // Chart generation results
  chartType?: "line" | "bar" | "pie" | "area";
  chartData?: Array<Record<string, string | number>>;
  chartTitle?: string;
  xKey?: string;
  yKey?: string;
  // Generic results
  message?: string;
  [key: string]: unknown;
};
