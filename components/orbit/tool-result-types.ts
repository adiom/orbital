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
  // Speech-to-text results
  text?: string;
  fileName?: string;
  language?: string;
  confidence?: number;
  // Summarize discussion results
  summary?: string;
  summaryLength?: string;
  // Chart generation results
  chartType?: "line" | "bar" | "pie" | "area";
  chartData?: Record<string, string | number>[];
  chartTitle?: string;
  xKey?: string;
  yKey?: string;
  // Web search results
  query?: string;
  answer?: string;
  results?: Array<{
    title: string;
    url: string;
    content: string;
    score?: number;
  }>;
  searchDepth?: "basic" | "advanced";
  // Mini-app generation results
  id?: string;
  title?: string;
  purpose?: string;
  features?: string[];
  layout?: Array<{
    id: string;
    type: string;
    text?: string;
    name?: string;
  }>;
  reactCode?: string;
  componentInfo?: {
    name: string;
    imports: string[];
    dependencies: Record<string, string>;
    hasState: boolean;
    hasEffects: boolean;
  };
  instructions?: {
    setup: string[];
    customization: string[];
  };
  specVersion?: number;
  // Generic results
  message?: string;
  [key: string]: unknown;
};
