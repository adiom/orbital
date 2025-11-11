"use client";

import {
  Copy,
  CornerDownRight,
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
import { segmentTextWithMentions } from "@/lib/mentions/parser";
import { cn } from "@/lib/utils";
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
}: OrbitMessageProps) {
  const router = useRouter();
  const [isForking, setIsForking] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
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
    message.userId === "00000000-0000-0000-0000-000000000001" ||
    message.userEmail === "avrora@avrora.click";

  const textSegments = segmentTextWithMentions(message.content);

  return (
    <article
      className={cn(
        "group relative mb-2 transition-all duration-300",
        isSelected && "scale-[1.01]"
      )}
    >
      <button
        className={cn(
          "relative cursor-pointer overflow-hidden rounded-3xl border-2 p-5 shadow-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
          isAvroraMessage
            ? "border-blue-200 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 shadow-blue-100"
            : "border-gray-200 bg-white",
          isSelected && "shadow-lg",
          isAvroraMessage && isSelected && "shadow-blue-200"
        )}
        onClick={() => setIsSelected(!isSelected)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsSelected(!isSelected);
          }
        }}
        type="button"
      >
        {message.isForked && (
          <div className="absolute top-0 right-0 rounded-tr-2xl rounded-bl-2xl bg-gradient-to-br from-blue-500 to-purple-500 px-3 py-1.5">
            <div className="flex items-center gap-1.5 text-white text-xs">
              <GitBranch className="h-3 w-3" />
              <span className="font-semibold">Forked</span>
            </div>
          </div>
        )}

        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-gray-500 text-xs">
            {isAvroraMessage && (
              <div className="flex items-center gap-1 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 px-2.5 py-1">
                <Sparkles className="h-3 w-3 text-white" />
                <span className="font-semibold text-white">Avrora AI</span>
              </div>
            )}
            <span
              className={cn(
                "font-medium",
                isAvroraMessage ? "text-blue-700" : "text-gray-700"
              )}
            >
              {message.userEmail}
            </span>
            <span className="mx-1">•</span>
            <span className="text-gray-500">
              {new Date(message.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>

        {parentMessage && (
          <div className="mb-3 overflow-hidden rounded-2xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50 p-3 shadow-sm">
            <div className="mb-1.5 flex items-center gap-1.5">
              <CornerDownRight className="h-3.5 w-3.5 text-blue-500" />
              <span className="font-semibold text-blue-700 text-xs">
                Replying to {parentMessage.userEmail}
              </span>
            </div>
            <div className="line-clamp-2 text-gray-700 text-sm">
              {parentMessage.content}
            </div>
          </div>
        )}

        <div
          className={cn(
            "relative whitespace-pre-wrap text-[15px] text-gray-900 leading-relaxed transition-all duration-300",
            isOverflowing && !isExpanded && "max-h-[100px] overflow-hidden"
          )}
          ref={contentRef}
        >
          {textSegments.map((segment, index) =>
            segment.isMention && segment.mention?.type === "avrora" ? (
              <span
                className="rounded-lg bg-gradient-to-r from-blue-200 to-purple-200 px-2 py-0.5 font-semibold text-blue-800"
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

          {isOverflowing && !isExpanded && (
            <div className="absolute inset-x-0 bottom-0 flex h-12 items-end justify-center bg-gradient-to-t from-white via-white/95 to-transparent pb-2">
              <button
                className="rounded-full bg-blue-500 px-4 py-1.5 font-medium text-white text-xs shadow-md transition-all hover:bg-blue-600 hover:shadow-lg"
                onClick={() => setIsExpanded(true)}
                type="button"
              >
                Show more
              </button>
            </div>
          )}
        </div>

        {isExpanded && isOverflowing && (
          <button
            className="mt-2 rounded-full bg-gray-200 px-4 py-1.5 font-medium text-gray-700 text-xs transition-all hover:bg-gray-300"
            onClick={() => setIsExpanded(false)}
            type="button"
          >
            Show less
          </button>
        )}

        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-4 flex flex-col gap-3">
            {message.attachments.map((attachment, index) => {
              const isAudio = attachment.contentType.startsWith("audio/");

              if (isAudio) {
                return (
                  <div
                    className="group relative overflow-hidden rounded-2xl border-2 border-gray-200 bg-gradient-to-br from-purple-50 to-blue-50 p-4 shadow-md transition-all hover:shadow-xl"
                    key={`attachment-${attachment.url}-${index}`}
                  >
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex size-12 flex-shrink-0 items-center justify-center rounded-xl bg-purple-100">
                        <Music className="h-6 w-6 text-purple-600" />
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
                  className="relative h-56 w-full max-w-sm cursor-pointer overflow-hidden rounded-2xl border-2 border-gray-200 bg-muted shadow-md transition-all hover:scale-[1.02] hover:shadow-xl"
                  key={`attachment-${attachment.url}-${index}`}
                  onClick={() => window.open(attachment.url, "_blank")}
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
      </button>

      {isSelected && (
        <div className="mt-2 flex flex-wrap items-center gap-2 px-2 opacity-100 transition-all duration-200">
          <button
            className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-gray-600 transition-all hover:bg-gray-200 hover:text-gray-800"
            onClick={handleCopy}
            title="Copy message"
            type="button"
          >
            <Copy className="h-3.5 w-3.5" />
            <span className="text-xs">Copy</span>
          </button>

          <button
            className="flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1.5 text-blue-600 transition-all hover:bg-blue-200 hover:text-blue-800"
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
                className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 px-3 py-1.5 text-white shadow-md transition-all hover:shadow-lg"
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
              className="flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1.5 text-purple-600 transition-all hover:bg-purple-200 hover:text-purple-800 disabled:opacity-50"
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
              className="flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-amber-600 transition-all hover:bg-amber-200 hover:text-amber-800"
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
              className="flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1.5 text-red-600 transition-all hover:bg-red-200 hover:text-red-800 disabled:opacity-50"
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
}
