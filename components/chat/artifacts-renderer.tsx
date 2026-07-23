"use client";

import { FileText, Code2, Table, Image, AppWindow, BarChart3, Gamepad2 } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { DocumentArtifact } from "./shared-message-type";

const RENDERABLE_KINDS: DocumentArtifact["kind"][] = ["text", "code", "sheet"];

type ArtifactsRendererProps = {
  artifacts: DocumentArtifact[];
  className?: string;
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

const ARTIFACT_ICONS: Record<DocumentArtifact["kind"], React.ComponentType<{ className?: string }>> = {
  text: FileText,
  code: Code2,
  sheet: Table,
  image: Image,
  "mini-app": AppWindow,
  chart: BarChart3,
  game: Gamepad2,
};

/**
 * Single Artifact Card
 */
function ArtifactCard({
  artifact,
  className,
  onOpen,
}: {
  artifact: DocumentArtifact;
  className?: string;
  onOpen: (artifact: DocumentArtifact) => void;
}) {
  const Icon = ARTIFACT_ICONS[artifact.kind] ?? FileText;
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
          onClick={() => onOpen(artifact)}
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
  const [openArtifact, setOpenArtifact] = useState<DocumentArtifact | null>(
    null
  );

  if (!artifacts || artifacts.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-2", className)}>
      {artifacts.map((artifact) => (
        <ArtifactCard
          artifact={artifact}
          key={artifact.id}
          onOpen={setOpenArtifact}
        />
      ))}

      <Dialog
        onOpenChange={(open) => !open && setOpenArtifact(null)}
        open={openArtifact !== null}
      >
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{openArtifact?.title}</DialogTitle>
          </DialogHeader>
          {openArtifact && RENDERABLE_KINDS.includes(openArtifact.kind) ? (
            <pre className="whitespace-pre-wrap break-words text-gray-800 text-sm">
              {openArtifact.content || "Нет содержимого"}
            </pre>
          ) : (
            <p className="text-gray-500 text-sm">
              Предпросмотр для этого типа артефакта пока недоступен.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
