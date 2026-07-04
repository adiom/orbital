"use client";

import { FileText, Code2, Table, Image, AppWindow, BarChart3, Gamepad2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DocumentArtifact } from "./shared-message-type";

type ArtifactsRendererProps = {
  artifacts: DocumentArtifact[];
  className?: string;
};

/**
 * Get icon for artifact kind
 */
const getArtifactIcon = (kind: DocumentArtifact["kind"]) => {
  switch (kind) {
    case "text":
      return FileText;
    case "code":
      return Code2;
    case "sheet":
      return Table;
    case "image":
      return Image;
    case "mini-app":
      return AppWindow;
    case "chart":
      return BarChart3;
    case "game":
      return Gamepad2;
    default:
      return FileText;
  }
};

/**
 * Get color class for artifact kind
 */
const getArtifactColor = (kind: DocumentArtifact["kind"]): string => {
  switch (kind) {
    case "text":
      return "text-blue-600 bg-blue-100";
    case "code":
      return "text-green-600 bg-green-100";
    case "sheet":
      return "text-emerald-600 bg-emerald-100";
    case "image":
      return "text-purple-600 bg-purple-100";
    case "mini-app":
      return "text-violet-600 bg-violet-100";
    case "chart":
      return "text-teal-600 bg-teal-100";
    case "game":
      return "text-orange-600 bg-orange-100";
    default:
      return "text-gray-600 bg-gray-100";
  }
};

/**
 * Get display name for artifact kind
 */
const getArtifactName = (kind: DocumentArtifact["kind"]): string => {
  switch (kind) {
    case "text":
      return "Document";
    case "code":
      return "Code";
    case "sheet":
      return "Spreadsheet";
    case "image":
      return "Image";
    case "mini-app":
      return "Mini-App";
    case "chart":
      return "Chart";
    case "game":
      return "Game";
    default:
      return "Artifact";
  }
};

/**
 * Single Artifact Card
 */
function ArtifactCard({
  artifact,
  className,
}: {
  artifact: DocumentArtifact;
  className?: string;
}) {
  const Icon = getArtifactIcon(artifact.kind);
  const colorClass = getArtifactColor(artifact.kind);
  const displayName = getArtifactName(artifact.kind);

  return (
    <div
      className={cn(
        "group overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md",
        className
      )}
    >
      <div className="flex items-center gap-3 p-3">
        <div className={cn("rounded-lg p-2", colorClass)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-gray-900 text-sm">
            {artifact.title}
          </p>
          <p className="text-gray-500 text-xs">{displayName}</p>
        </div>
        <button
          className="rounded-lg bg-gray-100 px-3 py-1.5 text-gray-600 text-xs transition-colors hover:bg-gray-200"
          type="button"
        >
          Открыть
        </button>
      </div>
    </div>
  );
}

/**
 * Artifacts Renderer - displays document artifacts
 */
export function ArtifactsRenderer({
  artifacts,
  className,
}: ArtifactsRendererProps) {
  if (!artifacts || artifacts.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-2", className)}>
      {artifacts.map((artifact) => (
        <ArtifactCard artifact={artifact} key={artifact.id} />
      ))}
    </div>
  );
}
