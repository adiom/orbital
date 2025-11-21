"use client";

import {
  Code2,
  Copy,
  GitBranch,
  LogIn,
  Music,
  PenSquare,
  Reply,
  Sparkles,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AVRORA_USER_ID,
  CLAUDE_CODE_USER_ID,
} from "@/lib/constants/system-users";
import { segmentTextWithMentions } from "@/lib/mentions/parser";
import { cn } from "@/lib/utils";
import { ParentIndicators } from "./parent-message-indicators";
import { ToolResultsList } from "./tool-result-display";

type OrbitMessageProps = {
  message: {
    id: string;
    content: string;
    userId: string;
    userEmail: string;
    parentMessageId: string | null;
    attachments?: Array<{
      name: string;
      url: string;
      contentType: string;
    }>;
    toolResults?: Array<{
      [key: string]: unknown;
    }>;
    isForked: boolean;
    forkedSferaId: string | null;
    isGenerating?: boolean;
    isPending?: boolean;
    createdAt: Date;
  };
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
  indicatorVariant?: 1 | 2 | 3 | 4 | 5; // Для тестирования разных вариантов
};

export function OrbitMessage({
  message,
  parentMessage,
  orbitId,
  currentUserId,
  canModerate = false,
  onFork,
  onReply,
  onEdit,
  onDelete,
  indicatorVariant = 1, // По умолчанию вариант 1
}: OrbitMessageProps) {
  const router = useRouter();
  const [isForking, setIsForking] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [isSelected, setIsSelected] = useState(false);

  const canEdit =
    canModerate || (!!currentUserId && currentUserId === message.userId);
  const canDelete = canEdit;
  const deleteDisabled = Boolean(message.isForked || message.forkedSferaId);

  useEffect(() => {
    if (contentRef.current) {
      const height = contentRef.current.scrollHeight;
      setIsOverflowing(height > 100);
    }
  }, []);

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
          router.push(`/orbit/${data.forkedSferaId}`);
          return;
        }
        throw new Error(data.error || "Failed to create fork");
      }

      const data = await response.json();
      onFork?.(message.id);
      router.push(`/orbit/${data.sfera.id}`);
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
      router.push(`/orbit/${message.forkedSferaId}`);
    }
  };

  const handleCopy = () => {
    try {
      router.push(`/m/${message.id}`);
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

  const textSegments = segmentTextWithMentions(message.content);

  // Выбираем компонент индикатора
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
    <article className="group relative mb-2">
      <div
        className={cn(
          "relative cursor-pointer overflow-hidden rounded-3xl border-2 p-5 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2",
          isAvroraMessage
            ? "border-gray-300 bg-gray-50"
            : isClaudeCodeMessage
              ? "border-gray-300 bg-gray-50"
              : "border-gray-200 bg-white",
          isSelected && "shadow-md"
        )}
        onClick={() => setIsSelected(!isSelected)}
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

        <div className="mb-3 flex items-center justify-between gap-3">
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

        <div
          className={cn(
            "relative whitespace-pre-wrap text-[15px] text-gray-900 leading-relaxed",
            isOverflowing && !isExpanded && "max-h-[100px] overflow-hidden"
          )}
          ref={contentRef}
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
            <>
              {textSegments.map((segment, index) =>
                segment.isMention && segment.mention?.type === "avrora" ? (
                  <span
                    className="rounded-lg bg-gray-200 px-2 py-0.5 font-semibold text-gray-800"
                    key={`mention-${index}-${segment.text.slice(0, 10)}`}
                  >
                    {segment.text}
                  </span>
                ) : (
                  <span key={`text-${index}-${segment.text.slice(0, 10)}`}>
                    {segment.text}
                  </span>
                )
              )}
            </>
          )}

          
        </div>

      

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
                          Audio attachment
                        </div>
                      </div>
                    </div>
                    {/* biome-ignore lint/a11y/useMediaCaption: Generated audio without captions */}
                    <audio
                      className="w-full"
                      controls
                      preload="metadata"
                      src={attachment.url}
                    >
                      Your browser does not support audio playback.
                    </audio>
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

        {/* AI Tool Results */}
        {message.toolResults && message.toolResults.length > 0 && (
          <div className="mt-4">
            <ToolResultsList
              messageId={message.id}
              results={message.toolResults}
            />
          </div>
        )}
      </div>

      {isSelected && (
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
            title="Reply to this message"
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

  // Оборачиваем в индикатор если есть parentMessage
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
