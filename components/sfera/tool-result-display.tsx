/**
 * AVRORA: Tool Result Display Component
 *
 * Displays the results from AI tool executions in Sfera messages
 * Supports: generated images, music, videos, charts, mini-apps, etc.
 */

"use client";

import {
  CheckCircle2,
  Download,
  Image as ImageIcon,
  Music,
  Video,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

type ToolResult = {
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
  // Generic results
  message?: string;
  [key: string]: unknown;
};

type ToolResultDisplayProps = {
  result: ToolResult;
  className?: string;
};

export function ToolResultDisplay({
  result,
  className,
}: ToolResultDisplayProps) {
  // Handle legacy format: { toolName, result: {...} } -> unwrap to { toolName, ...result }
  const normalizedResult =
    "result" in result && typeof result.result === "object"
      ? { toolName: result.toolName, ...(result.result as any) }
      : result;

  // Error state
  if (!normalizedResult.success && normalizedResult.error) {
    return (
      <div
        className={cn(
          "flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm dark:border-red-900 dark:bg-red-950",
          className
        )}
      >
        <XCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
        <div>
          <p className="font-medium text-red-900 dark:text-red-100">
            Tool execution failed
          </p>
          <p className="mt-1 text-red-700 dark:text-red-300">{normalizedResult.error}</p>
        </div>
      </div>
    );
  }

  // Image generation result (supports both Gemini and Replicate)
  if (
    (normalizedResult.toolName === "generate-image" ||
      normalizedResult.toolName === "generateImage" ||
      normalizedResult.toolName === "generateImageReplicate") &&
    normalizedResult.imageUrl
  ) {
    return (
      <div className={cn("overflow-hidden rounded-lg border", className)}>
        <div className="relative aspect-square w-full max-w-md">
          <Image
            alt={normalizedResult.prompt || "Generated image"}
            className="object-cover"
            fill
            src={normalizedResult.imageUrl}
            unoptimized // External URLs may not work with Next.js Image optimization
          />
        </div>
        {normalizedResult.prompt && (
          <div className="border-t bg-muted/30 p-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <p className="text-muted-foreground text-xs">
                Prompt: <span className="text-foreground">{normalizedResult.prompt}</span>
              </p>
            </div>
            {normalizedResult.aspectRatio && (
              <p className="mt-1 text-muted-foreground text-xs">
                Aspect ratio: {normalizedResult.aspectRatio}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  // Music generation result
  if (
    (normalizedResult.toolName === "generate-music" ||
      normalizedResult.toolName === "generateMusic") &&
    normalizedResult.audioUrl
  ) {
    return (
      <div className={cn("rounded-lg border p-4", className)}>
        <div className="flex items-center gap-3">
          <Music className="h-8 w-8 text-purple-500" />
          <div className="flex-1">
            <p className="font-medium">Generated Music</p>
            {normalizedResult.duration && (
              <p className="text-muted-foreground text-sm">
                {normalizedResult.duration}s
              </p>
            )}
          </div>
          <a
            className="rounded-md bg-purple-100 p-2 hover:bg-purple-200 dark:bg-purple-900 dark:hover:bg-purple-800"
            download
            href={normalizedResult.audioUrl}
          >
            <Download className="h-4 w-4" />
          </a>
        </div>
        <audio className="mt-3 w-full" controls>
          <source src={normalizedResult.audioUrl} type="audio/mpeg" />
        </audio>
      </div>
    );
  }

  // Video generation result
  if (
    (normalizedResult.toolName === "generate-video" ||
      normalizedResult.toolName === "generateVideo") &&
    normalizedResult.videoUrl
  ) {
    return (
      <div className={cn("rounded-lg border p-4", className)}>
        <div className="mb-3 flex items-center gap-3">
          <Video className="h-8 w-8 text-blue-500" />
          <div className="flex-1">
            <p className="font-medium">Generated Video</p>
            {normalizedResult.duration && normalizedResult.fps && (
              <p className="text-muted-foreground text-sm">
                {normalizedResult.duration}s @ {normalizedResult.fps}fps
              </p>
            )}
          </div>
        </div>
        <video className="w-full rounded" controls>
          <source src={normalizedResult.videoUrl} type="video/mp4" />
        </video>
      </div>
    );
  }

  // Summarize discussion result
  if (
    (normalizedResult.toolName === "summarize-discussion" ||
      normalizedResult.toolName === "summarizeDiscussion") &&
    normalizedResult.summary
  ) {
    return (
      <div className={cn("rounded-lg border bg-blue-50 p-4", className)}>
        <div className="mb-2 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-blue-600" />
          <p className="font-medium text-blue-900">Discussion Summary</p>
        </div>
        <div className="whitespace-pre-wrap text-blue-900 text-sm leading-relaxed">
          {normalizedResult.summary}
        </div>
        {normalizedResult.summaryLength && (
          <p className="mt-2 text-blue-700 text-xs">
            Length: {normalizedResult.summaryLength}
          </p>
        )}
      </div>
    );
  }

  // Generic success message
  if (normalizedResult.success && normalizedResult.message) {
    return (
      <div
        className={cn(
          "flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm dark:border-green-900 dark:bg-green-950",
          className
        )}
      >
        <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-600" />
        <div>
          <p className="font-medium text-green-900 dark:text-green-100">
            {normalizedResult.toolName}
          </p>
          <p className="mt-1 text-green-700 dark:text-green-300">
            {normalizedResult.message}
          </p>
        </div>
      </div>
    );
  }

  // Fallback for unknown tool results
  return (
    <div className={cn("rounded-lg border bg-muted/30 p-4 text-sm", className)}>
      <p className="font-medium">Tool result: {normalizedResult.toolName}</p>
      <pre className="mt-2 overflow-x-auto text-xs">
        {JSON.stringify(normalizedResult, null, 2)}
      </pre>
    </div>
  );
}

/**
 * Display multiple tool results
 */
type ToolResultsListProps = {
  results: ToolResult[];
  className?: string;
};

export function ToolResultsList({ results, className }: ToolResultsListProps) {
  if (!results || results.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-3", className)}>
      {results.map((result, index) => (
        <ToolResultDisplay key={index} result={result} />
      ))}
    </div>
  );
}
