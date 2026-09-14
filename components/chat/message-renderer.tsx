"use client";

import {
  Bot,
  Code2,
  Copy,
  GitBranch,
  Loader2,
  LogIn,
  Music,
  PenSquare,
  Reply,
  Sparkles,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { memo, useState } from "react";
import { toast } from "sonner";
import { Response } from "@/components/elements/response";
import {
  AVRORA_USER_ID,
  BANITA_EMAIL,
  BANITA_USER_ID,
  BANITA_DISPLAY_NAME,
  CLAUDE_CODE_USER_ID,
  CF_KRISTINA_USER_ID,
} from "@/lib/constants/system-users";
import { cn } from "@/lib/utils";
import { ParentIndicators } from "../orbit/parent-message-indicators";
import { ArtifactsRenderer } from "./artifacts-renderer";
import { ToolCallsRenderer } from "./tool-calls-renderer";
import { ToolResultsRenderer } from "./tool-results-renderer";
import type { Message } from "./shared-message-type";

type MessageRendererProps = {
  message: Message;
  parentMessage?: {
    id: string;
    content: string;
    userId: string;
    userEmail: string;
    createdAt: Date;
  } | null;
  orbitId: string;
  currentUserId?: string;
  canModerate?: boolean;
  onFork?: (messageId: string) => void;
  onReply?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onApproveTool?: (approvalId: string) => void;
  onDenyTool?: (approvalId: string) => void;
  indicatorVariant?: 1 | 2 | 3 | 4 | 5;
  /**
   * Passed to the onboarding completion card so the surrounding chat can
   * animate itself closed before leaving. Omit where staying put is the
   * right behaviour (message permalinks, an already-finished onboarding).
   */
  onOnboardingExit?: () => void;
};

const TRANSCRIPTION_TRUNCATE_LENGTH = 200;

function TranscriptionBlock({
  message,
  isOwner,
}: {
  message: Message;
  isOwner: boolean;
}) {
  const [state, setState] = useState<"idle" | "transcribing" | "done" | "error">(
    () => {
      const cached = (message.toolResults as any[])?.find(
        (r: any) => r.toolName === "speechToText" && r.success
      );
      return cached ? "done" : "idle";
    }
  );

  const [result, setResult] = useState<string | null>(() => {
    const cached = (message.toolResults as any[])?.find(
      (r: any) => r.toolName === "speechToText" && r.success
    );
    return cached?.text || null;
  });

  const [expanded, setExpanded] = useState(false);

  if (!isOwner) return null;

  if (state === "done" && result) {
    const isTruncated = result.length > TRANSCRIPTION_TRUNCATE_LENGTH && !expanded;
    const displayText = isTruncated
      ? result.slice(0, TRANSCRIPTION_TRUNCATE_LENGTH) + "..."
      : result;

    return (
      <div className="mt-3 rounded-xl border border-gray-200 bg-white p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-500">Транскрипция</span>
          <button
            onClick={() => {
              navigator.clipboard.writeText(result);
              toast.success("Скопировано");
            }}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
            type="button"
          >
            <Copy className="h-3 w-3" />
            Копировать
          </button>
        </div>
        <p className="text-sm leading-relaxed text-gray-900">{displayText}</p>
        {isTruncated && (
          <button
            onClick={() => setExpanded(true)}
            className="mt-1 text-xs text-gray-500 hover:text-gray-700"
            type="button"
          >
            Показать ещё
          </button>
        )}
      </div>
    );
  }

  if (state === "transcribing") {
    return (
      <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Транскрибирую...</span>
      </div>
    );
  }

  const handleTranscribe = async () => {
    setState("transcribing");
    try {
      const res = await fetch("/api/sfera/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: message.id }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.text);
        setState("done");
      } else {
        toast.error(data.error || "Транскрипция не удалась");
        setState("error");
      }
    } catch {
      toast.error("Ошибка при транскрипции");
      setState("error");
    }
  };

  return (
    <button
      onClick={handleTranscribe}
      className="mt-3 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:shadow-md"
      type="button"
    >
      <Sparkles className="h-4 w-4 text-gray-500" />
      <span>Преобразовать в текст</span>
    </button>
  );
}

function MessageRendererComponent({
  message,
  parentMessage,
  orbitId,
  currentUserId,
  canModerate = false,
  onFork,
  onReply,
  onEdit,
  onDelete,
  onApproveTool,
  onDenyTool,
  indicatorVariant = 1,
  onOnboardingExit,
}: MessageRendererProps) {
  const router = useRouter();
  const [isForking, setIsForking] = useState(false);
  const [isSelected, setIsSelected] = useState(false);

  const canEdit =
    canModerate || (!!currentUserId && currentUserId === message.userId);
  const canDelete = canEdit;
  const deleteDisabled = Boolean(message.isForked || message.forkedSferaId);

  const handleFork = async () => {
    if (isForking || message.isForked) {
      return;
    }

    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(50);
    }

    setIsForking(true);
    try {
      const response = await fetch(`/api/sfera/${orbitId}/fork`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: message.id }),
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.forkedSferaId) {
          router.push(`/${data.forkedSferaId}`);
          return;
        }
        throw new Error(data.error || "Failed to create fork");
      }

      const data = await response.json();
      onFork?.(message.id);
      router.push(`/${data.sfera.id}`);
      toast.success("Orbit forked successfully!");
    } catch (error) {
      console.error("Error creating fork:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create fork"
      );
    } finally {
      setIsForking(false);
    }
  };

  const handleEnterFork = () => {
    if (message.forkedSferaId) {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(50);
      }
      router.push(`/${message.forkedSferaId}`);
    }
  };

  const handleCopy = () => {
    try {
      router.push(`/${orbitId}/${message.id}`);
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(30);
      }
    } catch (error) {
      console.error("Error copying message:", error);
      toast.error("Failed to copy message UUID");
    }
  };

  const isAvroraMessage =
    message.userId === AVRORA_USER_ID ||
    message.userEmail === "avrora@avrora.click";

  const isClaudeCodeMessage =
    message.userId === CLAUDE_CODE_USER_ID ||
    message.userEmail === "claude-code@avrora.click";

  const isCfKristinaMessage =
    message.userId === CF_KRISTINA_USER_ID ||
    message.userEmail === "cf-kristina@avrora.click";
  const isBanitaMessage =
    message.userId === BANITA_USER_ID || message.userEmail === BANITA_EMAIL;
  const hasPendingBanitaApproval = message.toolResults?.some(
    (result) => result.toolName === "banitaApproval" && result.status === "requested",
  ) ?? false;

  const IndicatorComponent = parentMessage
    ? {
        1: ParentIndicators.Variant1,
        2: ParentIndicators.Variant2,
        3: ParentIndicators.Variant3,
        4: ParentIndicators.Variant4,
        5: ParentIndicators.Variant5,
      }[indicatorVariant]
    : null;

  const messageContent = (
    <article
      className="group relative mb-2"
      data-generating={message.isGenerating ? "true" : "false"}
      data-message-id={message.id}
      data-testid="orbit-message"
    >
      <div
        className={cn(
          "relative cursor-pointer overflow-hidden rounded-2xl border p-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 md:rounded-3xl md:border-2 md:p-5",
          isAvroraMessage
            ? "border-gray-300 bg-gray-50"
            : isClaudeCodeMessage
              ? "border-gray-300 bg-gray-50"
              : "border-gray-200 bg-white",
          isSelected && "shadow-md"
        )}
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("button")) return;
          setIsSelected(!isSelected);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsSelected(!isSelected);
          }
        }}
        role="button"
        tabIndex={0}
      >
        {message.isForked && (
          <div className="absolute top-0 right-0 rounded-tr-2xl rounded-bl-2xl bg-gray-700 px-3 py-1.5">
            <div className="flex items-center gap-1.5 text-white text-xs">
              <GitBranch className="h-3 w-3" />
              <span className="font-semibold">Forked</span>
            </div>
          </div>
        )}

        <div className="mb-1.5 flex items-center justify-between gap-3 md:mb-3">
          <div className="flex items-center gap-2 text-gray-500 text-xs">
            {isAvroraMessage && (
              <div className="flex items-center gap-1 rounded-full bg-gray-700 px-2.5 py-1">
                <Sparkles className="h-3 w-3 text-white" />
                <span className="font-semibold text-white">Avrora AI</span>
              </div>
            )}
            {isClaudeCodeMessage && (
              <div className="flex items-center gap-1 rounded-full bg-gray-700 px-2.5 py-1">
                <Code2 className="h-3 w-3 text-white" />
                <span className="font-semibold text-white">Claude Code</span>
              </div>
            )}
            {isCfKristinaMessage && (
              <div className="flex items-center gap-1 rounded-full bg-blue-600 px-2.5 py-1">
                <Bot className="h-3 w-3 text-white" />
                <span className="font-semibold text-white">Кристина</span>
              </div>
            )}
            {isBanitaMessage && (
              <div className="flex items-center gap-1 rounded-full bg-fuchsia-600 px-2.5 py-1">
                <Sparkles className="h-3 w-3 text-white" />
                <span className="font-semibold text-white">{BANITA_DISPLAY_NAME}</span>
              </div>
            )}
            <span
              className={cn(
                "font-medium",
                isAvroraMessage || isClaudeCodeMessage
                  ? "text-gray-700"
                  : "text-gray-700"
              )}
            >
              {message.userEmail}
            </span>
            <span className="mx-1">•</span>
            <span className="text-gray-500" suppressHydrationWarning>
              {new Date(message.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>

        {/* Text Content */}
        <div
          className="relative whitespace-pre-wrap text-sm text-gray-900 leading-relaxed md:text-[15px]"
        >
          {message.isGenerating && message.content === "" ? (
            <div className="flex items-center gap-2 text-gray-500">
              <div className="flex gap-1">
                <div className="h-2 w-2 rounded-full bg-gray-400" />
                <div className="h-2 w-2 rounded-full bg-gray-400" />
                <div className="h-2 w-2 rounded-full bg-gray-400" />
              </div>
              <span className="text-sm italic">Печатает...</span>
            </div>
          ) : (
            <Response className="prose prose-gray max-w-none prose-sm [&_hr]:my-4 [&_ol]:my-3 [&_p]:my-3 [&_table]:my-4 [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto [&_td]:border [&_td]:border-gray-200 [&_td]:px-3 [&_td]:py-2 [&_th]:border [&_th]:border-gray-200 [&_th]:bg-gray-100 [&_th]:px-3 [&_th]:py-2">
              {message.content}
            </Response>
          )}
        </div>

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-4 flex flex-col gap-3">
            {message.attachments.map((attachment, index) => {
              const isAudio = attachment.contentType.startsWith("audio/");

              if (isAudio) {
                return (
                  <div
                    className="group relative overflow-hidden rounded-2xl border-2 border-gray-200 bg-gray-50 p-4 shadow-md"
                    key={`attachment-${attachment.url}-${index}`}
                  >
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex size-12 flex-shrink-0 items-center justify-center rounded-xl bg-gray-200">
                        <Music className="h-6 w-6 text-gray-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold text-gray-900 text-sm">
                          {attachment.name}
                        </div>
                        <div className="text-gray-500 text-xs">
                          Аудио запись
                        </div>
                      </div>
                    </div>
                    <audio
                      className="w-full"
                      controls
                      preload="metadata"
                      src={attachment.url}
                    >
                      Your browser does not support audio playback.
                    </audio>
                    <TranscriptionBlock
                      message={message}
                      isOwner={currentUserId === message.userId}
                    />
                  </div>
                );
              }

              return (
                <button
                  className="relative h-56 w-full max-w-sm cursor-pointer overflow-hidden rounded-2xl border-2 border-gray-200 bg-muted shadow-md"
                  key={`attachment-${attachment.url}-${index}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(attachment.url, "_blank");
                  }}
                  type="button"
                >
                  <Image
                    alt={attachment.name}
                    className="object-cover"
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    src={attachment.url}
                  />
                </button>
              );
            })}
          </div>
        )}

        {/* Tool Calls (ai@7 streaming) */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-4">
            <ToolCallsRenderer
              onApprove={onApproveTool}
              onDeny={onDenyTool}
              toolCalls={message.toolCalls}
            />
          </div>
        )}

        {/* Tool Results (from DB) */}
        {message.toolResults && message.toolResults.length > 0 && (
          <div className="mt-4" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
            <ToolResultsRenderer
              messageId={message.id}
              onOnboardingExit={onOnboardingExit}
              results={message.toolResults}
              onApprove={onApproveTool}
              onDeny={onDenyTool}
            />
          </div>
        )}

        {/* Document Artifacts */}
        {message.artifacts && message.artifacts.length > 0 && (
          <div className="mt-4">
            <ArtifactsRenderer artifacts={message.artifacts} />
          </div>
        )}
      </div>

      {/* Interaction Toolbar */}
      {isSelected && !hasPendingBanitaApproval && (
        <div className="mt-2 flex flex-wrap items-center gap-2 px-2 opacity-100">
          <button
            className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-gray-600"
            onClick={handleCopy}
            title="Copy message"
            type="button"
          >
            <Copy className="h-3.5 w-3.5" />
            <span className="text-xs">Copy</span>
          </button>

          <button
            className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-gray-600"
            onClick={onReply}
            title="Reply to this message (component chat)"
            type="button"
          >
            <Reply className="h-3.5 w-3.5" />
            <span className="text-xs">Reply</span>
          </button>

          {message.isForked ? (
            message.forkedSferaId ? (
              <button
                className="flex items-center gap-1.5 rounded-full bg-gray-700 px-3 py-1.5 text-white shadow-md"
                onClick={handleEnterFork}
                title="Enter forked Orbit"
                type="button"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span className="text-xs">Enter Fork</span>
              </button>
            ) : null
          ) : (
            <button
              className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-gray-600 disabled:opacity-50"
              disabled={isForking}
              onClick={handleFork}
              title="Fork this message into a new Orbit"
              type="button"
            >
              <GitBranch className="h-3.5 w-3.5" />
              <span className="text-xs">
                {isForking ? "Forking..." : "Fork"}
              </span>
            </button>
          )}

          {canEdit && (
            <button
              className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-gray-600"
              onClick={onEdit}
              title="Edit message"
              type="button"
            >
              <PenSquare className="h-3.5 w-3.5" />
              <span className="text-xs">Edit</span>
            </button>
          )}

          {canDelete && (
            <button
              className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-gray-600 disabled:opacity-50"
              disabled={deleteDisabled}
              onClick={onDelete}
              title={
                deleteDisabled
                  ? "Cannot delete a message that has been forked"
                  : "Delete message"
              }
              type="button"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="text-xs">Delete</span>
            </button>
          )}
        </div>
      )}
    </article>
  );

  if (IndicatorComponent && parentMessage) {
    return (
      <IndicatorComponent
        parentMessage={{
          userEmail: parentMessage.userEmail,
          content: parentMessage.content,
        }}
      >
        {messageContent}
      </IndicatorComponent>
    );
  }

  return messageContent;
}

const areMessageRendererPropsEqual = (
  previous: MessageRendererProps,
  next: MessageRendererProps
) =>
  previous.message === next.message &&
  previous.parentMessage === next.parentMessage &&
  previous.orbitId === next.orbitId &&
  previous.currentUserId === next.currentUserId &&
  previous.canModerate === next.canModerate &&
  previous.indicatorVariant === next.indicatorVariant &&
  previous.onApproveTool === next.onApproveTool &&
  previous.onDenyTool === next.onDenyTool &&
  previous.onOnboardingExit === next.onOnboardingExit;

export const MessageRenderer = memo(
  MessageRendererComponent,
  areMessageRendererPropsEqual
);

MessageRenderer.displayName = "MessageRenderer";
