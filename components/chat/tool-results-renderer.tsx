"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  Download,
  ExternalLink,
  FileAudio,
  Maximize2,
  Music,
  Search,
  Sparkles,
  Video,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChartArtifact } from "../orbit/chart-artifact";
import { MiniAppArtifact } from "../orbit/mini-app-artifact";
import type { ToolResult } from "./shared-message-type";

type ToolResultsRendererProps = {
  results: ToolResult[];
  messageId?: string;
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
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            animate={{ scale: 1 }}
            className="relative max-h-[90vh] max-w-[90vw]"
            exit={{ scale: 0.9 }}
            initial={{ scale: 0.9 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              alt={alt}
              className="h-auto max-h-[90vh] w-auto max-w-[90vw] object-contain"
              height={1200}
              src={src}
              unoptimized
              width={1200}
            />
            <button
              className="absolute top-2 right-2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
              onClick={onClose}
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

/**
 * Single Tool Result Display
 */
function ToolResultDisplay({
  result,
  messageId,
  className,
}: {
  result: ToolResult;
  messageId?: string;
  className?: string;
}) {
  const [isImageZoomed, setIsImageZoomed] = useState(false);

  // Handle legacy format: { toolName, result: {...} } -> unwrap
  const normalizedResult =
    "result" in result && typeof result.result === "object"
      ? { toolName: result.toolName, ...(result.result as Record<string, unknown>) }
      : "output" in result && typeof result.output === "object"
        ? { toolName: result.toolName, ...(result.output as Record<string, unknown>) }
        : result;

  // Error state
  if (!normalizedResult.success && normalizedResult.error) {
    return (
      <div
        className={cn(
          "flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm",
          className
        )}
      >
        <XCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
        <div>
          <p className="font-medium text-red-900">Tool execution failed</p>
          <p className="mt-1 text-red-700">{normalizedResult.error}</p>
        </div>
      </div>
    );
  }

  // Image generation result
  if (
    (normalizedResult.toolName === "generate-image" ||
      normalizedResult.toolName === "generateImage" ||
      normalizedResult.toolName === "generateImageReplicate") &&
    normalizedResult.imageUrl
  ) {
    return (
      <>
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "group overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm",
            className
          )}
          initial={{ opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
            }
          }}
          role="presentation"
          transition={{ duration: 0.3 }}
        >
          <div className="relative aspect-square w-full max-w-md">
            <Image
              alt={normalizedResult.prompt || "Generated image"}
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              fill
              src={normalizedResult.imageUrl}
              unoptimized
            />
            <button
              className="absolute top-2 right-2 rounded-full bg-black/50 p-2 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                setIsImageZoomed(true);
              }}
              title="Zoom image"
              type="button"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>
          {normalizedResult.prompt && (
            <div className="border-t border-gray-100 bg-gradient-to-br from-blue-50 to-purple-50 p-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-600" />
                <p className="text-xs">
                  <span className="font-medium text-blue-700">Prompt:</span>{" "}
                  <span className="text-gray-700">
                    {normalizedResult.prompt}
                  </span>
                </p>
              </div>
              {normalizedResult.aspectRatio && (
                <p className="mt-1 text-gray-500 text-xs">
                  Aspect ratio: {normalizedResult.aspectRatio}
                </p>
              )}
            </div>
          )}
        </motion.div>

        <ImageZoomModal
          alt={normalizedResult.prompt || "Generated image"}
          isOpen={isImageZoomed}
          onClose={() => setIsImageZoomed(false)}
          src={normalizedResult.imageUrl}
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
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "rounded-lg border border-gray-200 bg-gradient-to-br from-purple-50 to-pink-50 p-4 shadow-sm",
          className
        )}
        initial={{ opacity: 0, y: 20 }}
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
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "rounded-lg border border-gray-200 bg-gradient-to-br from-blue-50 to-cyan-50 p-4 shadow-sm",
          className
        )}
        initial={{ opacity: 0, y: 20 }}
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
      <div
        className={cn(
          "rounded-lg border border-gray-200 bg-blue-50 p-4",
          className
        )}
      >
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

  // Speech-to-text transcription result
  if (
    (normalizedResult.toolName === "speech-to-text" ||
      normalizedResult.toolName === "speechToText") &&
    normalizedResult.text
  ) {
    return (
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "rounded-lg border border-gray-200 bg-gradient-to-br from-green-50 to-emerald-50 p-4 shadow-sm",
          className
        )}
        initial={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.3 }}
      >
        <div className="mb-3 flex items-center gap-3">
          <div className="rounded-full bg-green-100 p-3">
            <FileAudio className="h-6 w-6 text-green-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium text-green-900">Audio Transcription</p>
              <Sparkles className="h-4 w-4 text-green-600" />
            </div>
            <div className="mt-1 flex items-center gap-2 text-green-700 text-xs">
              {Boolean(normalizedResult.fileName) && (
                <span>File: {String(normalizedResult.fileName)}</span>
              )}
              {Boolean(normalizedResult.language) && (
                <span className="rounded-full bg-green-200 px-2 py-0.5">
                  {String(normalizedResult.language) === "ru"
                    ? "Russian"
                    : String(normalizedResult.language) === "en"
                      ? "English"
                      : String(normalizedResult.language)}
                </span>
              )}
              {Boolean(normalizedResult.confidence) && (
                <span>
                  Confidence: {Math.round(Number(normalizedResult.confidence) * 100)}%
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="rounded-md bg-white p-3 shadow-sm">
          <p className="whitespace-pre-wrap text-gray-900 text-sm leading-relaxed">
            {String(normalizedResult.text)}
          </p>
        </div>
        {normalizedResult.audioUrl && (
          <div className="mt-3">
            <p className="mb-2 font-medium text-green-800 text-xs">
              Original audio:
            </p>
            <audio className="w-full" controls preload="metadata">
              <source src={normalizedResult.audioUrl} type="audio/mpeg" />
            </audio>
          </div>
        )}
      </motion.div>
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
        className={className}
        data={normalizedResult.chartData}
        title={normalizedResult.chartTitle}
        xKey={normalizedResult.xKey}
        yKey={normalizedResult.yKey}
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
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "overflow-hidden rounded-lg border border-gray-200 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-sm",
          className
        )}
        initial={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.3 }}
      >
        <div className="border-b border-emerald-200 bg-gradient-to-r from-emerald-100 to-teal-100 p-3">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-emerald-600" />
            <p className="font-semibold text-emerald-900">Web Search Results</p>
          </div>
          {normalizedResult.query && (
            <p className="mt-1 text-emerald-700 text-sm">
              Query:{" "}
              <span className="font-medium">{normalizedResult.query}</span>
            </p>
          )}
        </div>

        {normalizedResult.answer && (
          <div className="border-b border-emerald-100 bg-emerald-50/50 p-4">
            <div className="mb-1.5 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              <p className="font-medium text-emerald-900 text-sm">AI Answer</p>
            </div>
            <p className="text-emerald-800 text-sm leading-relaxed">
              {normalizedResult.answer}
            </p>
          </div>
        )}

        <div className="space-y-3 p-4">
          {Array.isArray(normalizedResult.results) &&
            normalizedResult.results.map(
              (
                searchResult: NonNullable<ToolResult["results"]>[number],
                resultIndex: number
              ) => {
                const key =
                  searchResult.url ??
                  (searchResult.title
                    ? `${searchResult.title}-${resultIndex}`
                    : `search-result-${resultIndex}`);

                return (
                  <a
                    className="block rounded-lg border border-emerald-200 bg-white p-3 transition-all hover:border-emerald-300 hover:shadow-md"
                    href={searchResult.url ? searchResult.url : "#"}
                    key={key}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <div className="mb-1.5 flex items-start justify-between gap-2">
                      <h4 className="line-clamp-1 font-medium text-emerald-900 text-sm">
                        {searchResult.title}
                      </h4>
                      <ExternalLink className="h-4 w-4 flex-shrink-0 text-emerald-600" />
                    </div>
                    <p className="line-clamp-2 text-emerald-700 text-xs leading-relaxed">
                      {searchResult.content}
                    </p>
                    <p className="mt-1.5 truncate text-emerald-600 text-xs">
                      {searchResult.url}
                    </p>
                  </a>
                );
              }
            )}
        </div>

        <div className="border-t border-emerald-100 bg-emerald-50/30 px-4 py-2">
          <p className="text-center text-emerald-600 text-xs">
            Found {normalizedResult.results.length} results
            {normalizedResult.searchDepth &&
              ` • ${normalizedResult.searchDepth} search`}
          </p>
        </div>
      </motion.div>
    );
  }

  // Mini-app creation result
  if (
    (normalizedResult.toolName === "create-mini-app" ||
      normalizedResult.toolName === "createMiniApp") &&
    normalizedResult.id &&
    normalizedResult.title
  ) {
    return (
      <MiniAppArtifact
        className={className}
        componentInfo={normalizedResult.componentInfo}
        features={normalizedResult.features || []}
        id={normalizedResult.id}
        layout={normalizedResult.layout as Array<{ id: string; type: string; text?: string; name?: string }>}
        messageId={messageId}
        purpose={normalizedResult.purpose || normalizedResult.title}
        reactCode={normalizedResult.reactCode}
        specVersion={normalizedResult.specVersion}
        title={normalizedResult.title}
      />
    );
  }

  // Generic success message
  if (normalizedResult.success && normalizedResult.message) {
    return (
      <div
        className={cn(
          "flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm",
          className
        )}
      >
        <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-600" />
        <div>
          <p className="font-medium text-green-900">
            {normalizedResult.toolName}
          </p>
          <p className="mt-1 text-green-700">{normalizedResult.message}</p>
        </div>
      </div>
    );
  }

  // Fallback for unknown tool results
  return (
    <div
      className={cn(
        "rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm",
        className
      )}
    >
      <p className="font-medium text-gray-700">
        Tool result: {normalizedResult.toolName}
      </p>
      <pre className="mt-2 overflow-x-auto text-gray-600 text-xs">
        {JSON.stringify(normalizedResult, null, 2)}
      </pre>
    </div>
  );
}

/**
 * Tool Results Renderer - displays multiple tool results
 */
export function ToolResultsRenderer({
  results,
  messageId,
  className,
}: ToolResultsRendererProps) {
  if (!results || results.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-3", className)}>
      {results.map((result, index) => {
        const resultKey =
          result.imageUrl ??
          result.audioUrl ??
          result.videoUrl ??
          result.text ??
          `result-${index}`;
        return (
          <ToolResultDisplay
            key={String(resultKey)}
            messageId={messageId}
            result={result}
          />
        );
      })}
    </div>
  );
}
