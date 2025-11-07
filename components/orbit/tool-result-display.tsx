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
  Maximize2,
  Sparkles,
  Search,
  ExternalLink,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ChartArtifact } from "./chart-artifact";

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
  // Chart generation results
  chartType?: "line" | "bar" | "pie" | "area";
  chartData?: Array<Record<string, string | number>>;
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
  // Generic results
  message?: string;
  [key: string]: unknown;
};

type ToolResultDisplayProps = {
  result: ToolResult;
  className?: string;
};

/**
 * Image Zoom Modal Component
 */
function ImageZoomModal({
  src,
  alt,
  isOpen,
  onClose,
}: {
  src: string;
  alt: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative max-h-[90vh] max-w-[90vw]"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.9 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={src}
              alt={alt}
              width={1200}
              height={1200}
              className="h-auto w-auto max-h-[90vh] max-w-[90vw] object-contain"
              unoptimized
            />
            <button
              onClick={onClose}
              className="absolute top-2 right-2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
              type="button"
            >
              ✕
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ToolResultDisplay({
  result,
  className,
}: ToolResultDisplayProps) {
  const [isImageZoomed, setIsImageZoomed] = useState(false);

  // Debug logging
  console.log("🔍 [ToolResultDisplay] Received result:", result);

  // Handle legacy format: { toolName, result: {...} } -> unwrap to { toolName, ...result }
  const normalizedResult =
    "result" in result && typeof result.result === "object"
      ? { toolName: result.toolName, ...(result.result as any) }
      : result;

  console.log("✅ [ToolResultDisplay] Normalized result:", normalizedResult);

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
      <>
        <motion.div
          className={cn("group overflow-hidden rounded-lg border shadow-sm", className)}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="relative aspect-square w-full max-w-md">
            <Image
              alt={normalizedResult.prompt || "Generated image"}
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              fill
              src={normalizedResult.imageUrl}
              unoptimized // External URLs may not work with Next.js Image optimization
            />
            {/* Zoom button overlay */}
            <button
              onClick={() => setIsImageZoomed(true)}
              className="absolute top-2 right-2 rounded-full bg-black/50 p-2 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
              type="button"
              title="Zoom image"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>
          {normalizedResult.prompt && (
            <div className="border-t bg-gradient-to-br from-blue-50 to-purple-50 p-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-600" />
                <p className="text-muted-foreground text-xs">
                  <span className="font-medium text-blue-700">Prompt:</span>{" "}
                  <span className="text-foreground">{normalizedResult.prompt}</span>
                </p>
              </div>
              {normalizedResult.aspectRatio && (
                <p className="mt-1 text-muted-foreground text-xs">
                  Aspect ratio: {normalizedResult.aspectRatio}
                </p>
              )}
            </div>
          )}
        </motion.div>

        <ImageZoomModal
          src={normalizedResult.imageUrl}
          alt={normalizedResult.prompt || "Generated image"}
          isOpen={isImageZoomed}
          onClose={() => setIsImageZoomed(false)}
        />
      </>
    );
  }

  // Music generation result
  if (
    (normalizedResult.toolName === "generate-music" ||
      normalizedResult.toolName === "generateMusic") &&
    normalizedResult.audioUrl
  ) {
    return (
      <motion.div
        className={cn("rounded-lg border bg-gradient-to-br from-purple-50 to-pink-50 p-4 shadow-sm", className)}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-purple-100 p-3">
            <Music className="h-6 w-6 text-purple-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium text-purple-900">Generated Music</p>
              <Sparkles className="h-4 w-4 text-purple-600" />
            </div>
            {normalizedResult.duration && (
              <p className="text-purple-700 text-sm">
                Duration: {normalizedResult.duration}s
              </p>
            )}
          </div>
          <a
            className="rounded-md bg-purple-600 p-2 text-white transition-colors hover:bg-purple-700"
            download
            href={normalizedResult.audioUrl}
            title="Download audio"
          >
            <Download className="h-4 w-4" />
          </a>
        </div>
        <audio className="mt-3 w-full" controls>
          <source src={normalizedResult.audioUrl} type="audio/mpeg" />
        </audio>
      </motion.div>
    );
  }

  // Video generation result
  if (
    (normalizedResult.toolName === "generate-video" ||
      normalizedResult.toolName === "generateVideo") &&
    normalizedResult.videoUrl
  ) {
    return (
      <motion.div
        className={cn("rounded-lg border bg-gradient-to-br from-blue-50 to-cyan-50 p-4 shadow-sm", className)}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="mb-3 flex items-center gap-3">
          <div className="rounded-full bg-blue-100 p-3">
            <Video className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium text-blue-900">Generated Video</p>
              <Sparkles className="h-4 w-4 text-blue-600" />
            </div>
            {normalizedResult.duration && normalizedResult.fps && (
              <p className="text-blue-700 text-sm">
                {normalizedResult.duration}s @ {normalizedResult.fps}fps
              </p>
            )}
          </div>
        </div>
        <video className="w-full rounded" controls>
          <source src={normalizedResult.videoUrl} type="video/mp4" />
        </video>
      </motion.div>
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

  // Chart generation result
  if (
    (normalizedResult.toolName === "generate-chart" ||
      normalizedResult.toolName === "generateChart" ||
      normalizedResult.toolName === "createChart") &&
    normalizedResult.chartData &&
    normalizedResult.chartType
  ) {
    return (
      <ChartArtifact
        chartType={normalizedResult.chartType}
        data={normalizedResult.chartData}
        title={normalizedResult.chartTitle}
        xKey={normalizedResult.xKey}
        yKey={normalizedResult.yKey}
        className={className}
      />
    );
  }

  // Web search result
  if (
    (normalizedResult.toolName === "web-search" ||
      normalizedResult.toolName === "webSearch") &&
    normalizedResult.results
  ) {
    return (
      <motion.div
        className={cn("overflow-hidden rounded-lg border bg-gradient-to-br from-emerald-50 to-teal-50 shadow-sm", className)}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="border-b bg-gradient-to-r from-emerald-100 to-teal-100 p-3">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-emerald-600" />
            <p className="font-semibold text-emerald-900">Web Search Results</p>
          </div>
          {normalizedResult.query && (
            <p className="mt-1 text-emerald-700 text-sm">
              Query: <span className="font-medium">{normalizedResult.query}</span>
            </p>
          )}
        </div>

        {normalizedResult.answer && (
          <div className="border-b bg-emerald-50/50 p-4">
            <div className="mb-1.5 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              <p className="font-medium text-emerald-900 text-sm">AI Answer</p>
            </div>
            <p className="text-emerald-800 text-sm leading-relaxed">
              {normalizedResult.answer}
            </p>
          </div>
        )}

        <div className="p-4 space-y-3">
          {normalizedResult.results.map((result, index) => (
            <a
              key={`search-result-${index}`}
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg border border-emerald-200 bg-white p-3 transition-all hover:border-emerald-300 hover:shadow-md"
            >
              <div className="mb-1.5 flex items-start justify-between gap-2">
                <h4 className="line-clamp-1 font-medium text-emerald-900 text-sm">
                  {result.title}
                </h4>
                <ExternalLink className="h-4 w-4 flex-shrink-0 text-emerald-600" />
              </div>
              <p className="line-clamp-2 text-emerald-700 text-xs leading-relaxed">
                {result.content}
              </p>
              <p className="mt-1.5 text-emerald-600 text-xs truncate">
                {result.url}
              </p>
            </a>
          ))}
        </div>

        <div className="border-t bg-emerald-50/30 px-4 py-2">
          <p className="text-center text-emerald-600 text-xs">
            Found {normalizedResult.results.length} results
            {normalizedResult.searchDepth && ` • ${normalizedResult.searchDepth} search`}
          </p>
        </div>
      </motion.div>
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
  results: Array<Record<string, unknown>>;
  className?: string;
};

export function ToolResultsList({ results, className }: ToolResultsListProps) {
  if (!results || results.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-3", className)}>
      {results.map((result, index) => (
        <ToolResultDisplay key={index} result={result as ToolResult} />
      ))}
    </div>
  );
}
