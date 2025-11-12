"use client";

import { Download, ExternalLink, Maximize2, Music, Video } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type ToolResult = {
  toolName: string;
  success?: boolean;
  error?: string;
  imageUrl?: string;
  prompt?: string;
  audioUrl?: string;
  videoUrl?: string;
  duration?: number;
  message?: string;
  results?: Array<{
    title: string;
    url: string;
    content: string;
  }>;
  [key: string]: unknown;
};

export function ToolResultRenderer({ result }: { result: ToolResult }) {
  const [isImageZoomed, setIsImageZoomed] = useState(false);

  // Error state
  if (!result.success && result.error) {
    return (
      <div className="mt-2 rounded-lg border border-destructive bg-destructive/10 p-3">
        <p className="font-medium text-destructive text-sm">Tool Error</p>
        <p className="mt-1 text-destructive/80 text-xs">{result.error}</p>
      </div>
    );
  }

  // Image generation result
  if (
    (result.toolName === "generateImage" ||
      result.toolName === "generateImageReplicate") &&
    result.imageUrl
  ) {
    return (
      <>
        <div className="mt-2 overflow-hidden rounded-lg border bg-card">
          <div className="relative aspect-square w-full max-w-sm">
            <Image
              alt={result.prompt || "Generated image"}
              className="object-cover"
              fill
              src={result.imageUrl}
              unoptimized
            />
            <button
              className="absolute top-2 right-2 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
              onClick={() => setIsImageZoomed(true)}
              type="button"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>
          {result.prompt && (
            <div className="border-t bg-muted/50 p-3">
              <p className="text-muted-foreground text-xs">
                <span className="font-medium">Prompt:</span> {result.prompt}
              </p>
            </div>
          )}
        </div>

        {/* Image zoom modal */}
        {isImageZoomed && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={() => setIsImageZoomed(false)}
          >
            <div
              className="relative max-h-[90vh] max-w-[90vw]"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                alt={result.prompt || "Generated image"}
                className="h-auto max-h-[90vh] w-auto max-w-[90vw] object-contain"
                height={1200}
                src={result.imageUrl}
                unoptimized
                width={1200}
              />
              <button
                className="absolute top-2 right-2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
                onClick={() => setIsImageZoomed(false)}
                type="button"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Music generation result
  if (result.toolName === "generateMusic" && result.audioUrl) {
    return (
      <div className="mt-2 rounded-lg border bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-primary/10 p-3">
            <Music className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm">Generated Music</p>
            {result.duration && (
              <p className="text-muted-foreground text-xs">
                Duration: {result.duration}s
              </p>
            )}
          </div>
          <Button asChild size="sm" variant="outline">
            <a download href={result.audioUrl}>
              <Download className="h-4 w-4" />
            </a>
          </Button>
        </div>
        <audio className="mt-3 w-full" controls src={result.audioUrl} />
      </div>
    );
  }

  // Video generation result
  if (result.toolName === "generateVideo" && result.videoUrl) {
    return (
      <div className="mt-2 rounded-lg border bg-card p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="rounded-full bg-primary/10 p-3">
            <Video className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm">Generated Video</p>
            {result.duration && (
              <p className="text-muted-foreground text-xs">
                Duration: {result.duration}s
              </p>
            )}
          </div>
          <Button asChild size="sm" variant="outline">
            <a download href={result.videoUrl}>
              <Download className="h-4 w-4" />
            </a>
          </Button>
        </div>
        <video className="w-full rounded-lg" controls src={result.videoUrl} />
      </div>
    );
  }

  // Web search result
  if (result.toolName === "webSearch" && result.results) {
    return (
      <div className="mt-2 rounded-lg border bg-card p-4">
        <p className="mb-2 font-medium text-sm">Search Results</p>
        <div className="space-y-2">
          {result.results.slice(0, 3).map((item) => (
            <a
              className="block rounded-md border p-2 transition-colors hover:bg-accent"
              href={item.url}
              key={item.url}
              rel="noopener noreferrer"
              target="_blank"
            >
              <div className="flex items-start gap-2">
                <ExternalLink className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-sm">{item.title}</p>
                  <p className="line-clamp-2 text-muted-foreground text-xs">
                    {item.content}
                  </p>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    );
  }

  // Summary result
  if (result.toolName === "summarizeDiscussion" && result.message) {
    return (
      <div className="mt-2 rounded-lg border bg-card p-4">
        <p className="mb-2 font-medium text-sm">Discussion Summary</p>
        <p className="whitespace-pre-wrap text-muted-foreground text-sm">
          {result.message}
        </p>
      </div>
    );
  }

  // Chart, Mini-app, Game creation
  if (
    result.toolName === "createChart" ||
    result.toolName === "createMiniApp" ||
    result.toolName === "createGame"
  ) {
    return (
      <div className="mt-2 rounded-lg border bg-card p-4">
        <p className="font-medium text-sm">
          {result.toolName === "createChart" && "Chart Created"}
          {result.toolName === "createMiniApp" && "Mini-App Created"}
          {result.toolName === "createGame" && "Game Created"}
        </p>
        {result.message && (
          <p className="mt-1 text-muted-foreground text-xs">{result.message}</p>
        )}
      </div>
    );
  }

  // Generic message result
  if (result.message) {
    return (
      <div className="mt-2 rounded-lg border bg-card p-3">
        <p className="text-muted-foreground text-sm">{result.message}</p>
      </div>
    );
  }

  // Fallback: show raw result
  return (
    <div className="mt-2 rounded-lg border bg-card p-3">
      <p className="font-mono text-muted-foreground text-xs">
        Tool: {result.toolName}
      </p>
    </div>
  );
}
