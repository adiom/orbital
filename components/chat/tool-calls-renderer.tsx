"use client";

import { Loader2, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ToolCallPart } from "./shared-message-type";

type ToolCallsRendererProps = {
  toolCalls: ToolCallPart[];
  onApprove?: (approvalId: string) => void;
  onDeny?: (approvalId: string) => void;
  className?: string;
};

/**
 * Get display name for tool
 */
const getToolDisplayName = (toolName: string): string => {
  const names: Record<string, string> = {
    "create-mini-app": "Mini-App",
    createMiniApp: "Mini-App",
    "edit-mini-app": "Edit Mini-App",
    editMiniApp: "Edit Mini-App",
    "create-chart": "Chart",
    createChart: "Chart",
    "create-game": "Game",
    createGame: "Game",
    "generate-image": "Image",
    generateImage: "Image",
    "generate-video": "Video",
    generateVideo: "Video",
    "generate-music": "Music",
    generateMusic: "Music",
    "create-document": "Document",
    createDocument: "Document",
    "update-document": "Document",
    updateDocument: "Document",
    "web-search": "Web Search",
    webSearch: "Web Search",
    "summarize-discussion": "Summary",
    summarizeDiscussion: "Summary",
    "speech-to-text": "Speech-to-Text",
    speechToText: "Speech-to-Text",
  };
  return names[toolName] || toolName;
};

/**
 * Get icon color class for tool
 */
const getToolColor = (toolName: string): string => {
  if (
    toolName.includes("image") ||
    toolName.includes("Image") ||
    toolName.includes("video") ||
    toolName.includes("Video")
  ) {
    return "text-blue-600 bg-blue-100";
  }
  if (toolName.includes("music") || toolName.includes("Music")) {
    return "text-purple-600 bg-purple-100";
  }
  if (toolName.includes("chart") || toolName.includes("Chart")) {
    return "text-emerald-600 bg-emerald-100";
  }
  if (toolName.includes("mini-app") || toolName.includes("MiniApp")) {
    return "text-violet-600 bg-violet-100";
  }
  if (toolName.includes("game") || toolName.includes("Game")) {
    return "text-orange-600 bg-orange-100";
  }
  if (toolName.includes("search") || toolName.includes("Search")) {
    return "text-teal-600 bg-teal-100";
  }
  if (toolName.includes("document") || toolName.includes("Document")) {
    return "text-indigo-600 bg-indigo-100";
  }
  return "text-gray-600 bg-gray-100";
};

/**
 * Tool Streaming Indicator - shown while tool input is being generated
 */
function ToolStreamingIndicator({
  toolName,
  input,
}: {
  toolName: string;
  input?: Record<string, unknown>;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
      <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
      <span className="text-gray-600 text-xs">
        Генерация {getToolDisplayName(toolName)}...
      </span>
      {input && Object.keys(input).length > 0 && (
        <span className="ml-auto text-gray-400 text-xs">
          {Object.keys(input).length} параметров
        </span>
      )}
    </div>
  );
}

/**
 * Tool Input Preview - shown when tool input is complete
 */
function ToolInputPreview({
  toolName,
  input,
}: {
  toolName: string;
  input?: Record<string, unknown>;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
      <div className={cn("rounded-full p-1.5", getToolColor(toolName))}>
        <CheckCircle2 className="h-3 w-3" />
      </div>
      <span className="text-gray-600 text-xs">
        {getToolDisplayName(toolName)}
      </span>
      {input && Object.keys(input).length > 0 && (
        <span className="ml-auto text-gray-400 text-xs">
          {Object.keys(input)
            .slice(0, 3)
            .map((k) => k)
            .join(", ")}
          {Object.keys(input).length > 3 && "..."}
        </span>
      )}
    </div>
  );
}

/**
 * Tool Approval Status - shown after approval decision
 */
function ToolApprovalStatus({
  approval,
}: {
  approval?: {
    isAutomatic: boolean;
    approved?: boolean;
    reason?: string;
  };
}) {
  if (!approval) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2",
        approval.approved
          ? "border border-green-200 bg-green-50"
          : "border border-red-200 bg-red-50"
      )}
    >
      {approval.approved ? (
        <CheckCircle2 className="h-4 w-4 text-green-600" />
      ) : (
        <XCircle className="h-4 w-4 text-red-600" />
      )}
      <span
        className={cn(
          "text-xs",
          approval.approved ? "text-green-700" : "text-red-700"
        )}
      >
        {approval.approved ? "Одобрено" : "Отклонено"}
        {approval.isAutomatic && " (автоматически)"}
      </span>
      {approval.reason && (
        <span className="ml-auto text-gray-500 text-xs">{approval.reason}</span>
      )}
    </div>
  );
}

/**
 * Tool Output Preview - shown when tool execution completes
 */
function ToolOutputPreview({
  toolName,
  output,
}: {
  toolName: string;
  output?: unknown;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
      <div className="rounded-full bg-green-100 p-1.5">
        <CheckCircle2 className="h-3 w-3 text-green-600" />
      </div>
      <span className="text-green-700 text-xs">
        {getToolDisplayName(toolName)} выполнен
      </span>
    </div>
  );
}

/**
 * Tool Denied Message - shown when tool was denied
 */
function ToolDeniedMessage({ reason }: { reason?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
      <XCircle className="h-4 w-4 text-red-600" />
      <span className="text-red-700 text-xs">
        Выполнение отклонено
        {reason && `: ${reason}`}
      </span>
    </div>
  );
}

/**
 * Tool Error Message - shown when tool execution fails
 */
function ToolErrorMessage({ error }: { error?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
      <AlertTriangle className="h-4 w-4 text-red-600" />
      <span className="text-red-700 text-xs">
        Ошибка: {error || "Неизвестная ошибка"}
      </span>
    </div>
  );
}

/**
 * Main ToolCallsRenderer component
 */
export function ToolCallsRenderer({
  toolCalls,
  onApprove,
  onDeny,
  className,
}: ToolCallsRendererProps) {
  if (!toolCalls || toolCalls.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-2", className)}>
      {toolCalls.map((part) => {
        switch (part.state) {
          case "input-streaming":
            return (
              <ToolStreamingIndicator
                input={part.input}
                key={part.toolCallId}
                toolName={part.toolName}
              />
            );

          case "input-available":
            return (
              <ToolInputPreview
                input={part.input}
                key={part.toolCallId}
                toolName={part.toolName}
              />
            );

          case "approval-requested":
            if (part.approval?.isAutomatic) {
              return (
                <ToolApprovalStatus
                  approval={part.approval}
                  key={part.toolCallId}
                />
              );
            }
            return (
              <div
                className="overflow-hidden rounded-lg border border-amber-200 bg-amber-50"
                key={part.toolCallId}
              >
                <div className="border-b border-amber-200 bg-amber-100 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span className="font-medium text-amber-800 text-xs">
                      Требуется подтверждение
                    </span>
                  </div>
                </div>
                <div className="p-3">
                  <p className="mb-2 text-amber-900 text-sm">
                    Avrora хочет создать{" "}
                    <span className="font-medium">
                      {getToolDisplayName(part.toolName)}
                    </span>
                  </p>
                  {part.input && Object.keys(part.input).length > 0 && (
                    <div className="mb-3 rounded bg-white p-2 text-gray-600 text-xs">
                      {Object.entries(part.input)
                        .slice(0, 5)
                        .map(([key, value]) => (
                          <div key={key}>
                            <span className="font-medium">{key}:</span>{" "}
                            {typeof value === "string"
                              ? value
                              : JSON.stringify(value)}
                          </div>
                        ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      className="flex items-center gap-1.5 rounded-full bg-gray-700 px-3 py-1.5 text-white text-xs transition-colors hover:bg-gray-800"
                      onClick={() => onApprove?.(part.approval!.id)}
                      type="button"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      Разрешить
                    </button>
                    <button
                      className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-gray-600 text-xs transition-colors hover:bg-gray-200"
                      onClick={() => onDeny?.(part.approval!.id)}
                      type="button"
                    >
                      <XCircle className="h-3 w-3" />
                      Отклонить
                    </button>
                  </div>
                </div>
              </div>
            );

          case "approval-responded":
            return (
              <ToolApprovalStatus
                approval={part.approval}
                key={part.toolCallId}
              />
            );

          case "output-available":
            return (
              <ToolOutputPreview
                key={part.toolCallId}
                output={part.output}
                toolName={part.toolName}
              />
            );

          case "output-denied":
            return (
              <ToolDeniedMessage
                key={part.toolCallId}
                reason={part.approval?.reason}
              />
            );

          case "output-error":
            return (
              <ToolErrorMessage
                error={part.errorText}
                key={part.toolCallId}
              />
            );

          default:
            return null;
        }
      })}
    </div>
  );
}
