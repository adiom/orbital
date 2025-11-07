"use client";

import {
  Copy,
  CornerDownRight,
  GitBranch,
  LogIn,
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

type SferaMessageProps = {
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
  sferaId: string;
  currentUserId?: string;
  canModerate?: boolean;
  onFork?: (messageId: string) => void;
  onReply?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
};

export function SferaMessage({
  message,
  parentMessage,
  sferaId,
  currentUserId,
  canModerate = false,
  onFork,
  onReply,
  onEdit,
  onDelete,
}: SferaMessageProps) {
  const router = useRouter();
  const [isForking, setIsForking] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const contentRef = useRef<HTMLButtonElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  const canEdit = canModerate || (!!currentUserId && currentUserId === message.userId);
  const canDelete = canEdit;
  const deleteDisabled = Boolean(message.isForked || message.forkedSferaId);

  // Check if content is overflowing 75px
  useEffect(() => {
    if (contentRef.current) {
      const height = contentRef.current.scrollHeight;
      setIsOverflowing(height > 75);
    }
  }, []);

  const handleFork = async () => {
    if (isForking || message.isForked) {
      return;
    }

    // Haptic feedback
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(50);
    }

    setIsForking(true);
    try {
      const response = await fetch(`/api/sfera/${sferaId}/fork`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: message.id }),
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.forkedSferaId) {
          // Fork already exists, navigate to it
          router.push(`/sfera/${data.forkedSferaId}`);
          return;
        }
        throw new Error(data.error || "Failed to create fork");
      }

      const data = await response.json();

      // Notify parent
      onFork?.(message.id);

      // Navigate to the forked Sfera
      router.push(`/sfera/${data.sfera.id}`);
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
      // Haptic feedback
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(50);
      }
      router.push(`/sfera/${message.forkedSferaId}`);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      toast.success("Message copied to clipboard");
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(30);
      }
    } catch (error) {
      console.error("Error copying message:", error);
      toast.error("Failed to copy message");
    }
  };

  // Check if this is an Avrora message
  const isAvroraMessage =
    message.userId === "00000000-0000-0000-0000-000000000001" ||
    message.userEmail === "avrora@avrora.ai";

  // Segment text to highlight mentions
  const textSegments = segmentTextWithMentions(message.content);

  return (
    <div className="flex flex-col">
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5",
          isAvroraMessage
            ? "rounded-br-none border border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50"
            : "rounded-br-none border border-gray-200 bg-white"
        )}
      >
        {/* Message Header */}
        <div className="mb-1.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-gray-500 text-xs">
            {isAvroraMessage && <Sparkles className="h-3 w-3 text-blue-600" />}
            <span
              className={cn(
                "font-medium",
                isAvroraMessage ? "text-blue-700" : "text-gray-700"
              )}
            >
              {message.userEmail}
            </span>
            <span className="mx-1.5">•</span>
            <span>{new Date(message.createdAt).toLocaleTimeString()}</span>
          </div>

          {message.isForked && (
            <div className="flex items-center gap-1 text-blue-600 text-xs">
              <GitBranch className="h-3 w-3" />
              <span>Forked</span>
            </div>
          )}
        </div>

        {/* Reply to (Parent Message) */}
        {parentMessage && (
          <div className="mb-2 rounded border-gray-300 border-l-2 bg-gray-50 p-2 pl-2">
            <div className="mb-1 flex items-center gap-1.5">
              <CornerDownRight className="h-3 w-3 text-gray-400" />
              <span className="font-medium text-gray-600 text-xs">
                {parentMessage.userEmail}
              </span>
            </div>
            <div className="line-clamp-2 text-gray-600 text-xs">
              {parentMessage.content}
            </div>
          </div>
        )}

        {/* Message Content with highlighted mentions */}
        <button
          type="button"
          className={cn(
            "whitespace-pre-wrap text-[15px] text-gray-900 leading-relaxed transition-all duration-200",
            isOverflowing &&
              !isExpanded &&
              "max-h-[75px] cursor-pointer overflow-hidden",
            isOverflowing && "relative"
          )}
          onClick={() => isOverflowing && setIsExpanded(!isExpanded)}
          onKeyDown={(e) => {
            if (isOverflowing && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              setIsExpanded(!isExpanded);
            }
          }}
          ref={contentRef}
        >
          {textSegments.map((segment, index) =>
            segment.isMention && segment.mention?.type === "avrora" ? (
              <span
                className="rounded bg-blue-100 px-1 font-medium text-blue-700"
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

          {/* Show more indicator */}
          {isOverflowing && !isExpanded && (
            <div className="absolute right-0 bottom-0 left-0 flex h-8 items-end justify-center bg-gradient-to-t from-white to-transparent pb-1">
              <span className="font-medium text-gray-500 text-xs">
                Click to expand...
              </span>
            </div>
          )}
        </button>

        {/* Image attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.attachments.map((attachment, index) => (
              <button
                type="button"
                className="relative h-48 w-64 cursor-pointer overflow-hidden rounded-lg border bg-muted transition-opacity hover:opacity-90"
                key={`attachment-${attachment.url}-${index}`}
                onClick={() => window.open(attachment.url, "_blank")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    window.open(attachment.url, "_blank");
                  }
                }}
              >
                <Image
                  alt={attachment.name}
                  className="object-cover"
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  src={attachment.url}
                />
              </button>
            ))}
          </div>
        )}
      </div>

    {/* Message Actions */}
    <div className="mt-1.5 mb-2 flex flex-wrap items-center gap-2 px-4">
      <button
        className="text-gray-400 transition-colors hover:text-gray-600"
        onClick={handleCopy}
        title="Copy message"
        type="button"
      >
        <Copy className="h-4 w-4" />
      </button>

      <button
        className="text-gray-400 transition-colors hover:text-gray-600"
        onClick={onReply}
        title="Reply to this message"
        type="button"
      >
        <Reply className="h-4 w-4" />
        <span className="sr-only">Reply</span>
      </button>

      {/* Fork/Enter Fork Button */}
      {message.isForked ? (
        message.forkedSferaId ? (
          <button
            className="flex items-center gap-1.5 text-blue-600 transition-colors hover:text-blue-700"
            onClick={handleEnterFork}
            title="Enter forked Sfera"
            type="button"
          >
            <LogIn className="h-4 w-4" />
            <span className="font-medium text-xs">Enter Fork</span>
          </button>
        ) : null
      ) : (
        <button
          className="flex items-center gap-1.5 text-gray-400 transition-colors hover:text-blue-600 disabled:opacity-50"
          disabled={isForking}
          onClick={handleFork}
          title="Fork this message into a new Sfera"
          type="button"
        >
          <GitBranch className="h-4 w-4" />
          <span className="font-medium text-xs">
            {isForking ? "Forking..." : "Fork"}
          </span>
        </button>
      )}

      {canEdit && (
        <button
          className="flex items-center gap-1.5 text-gray-400 transition-colors hover:text-gray-600"
          onClick={onEdit}
          title="Edit message"
          type="button"
        >
          <PenSquare className="h-4 w-4" />
          <span className="sr-only">Edit</span>
        </button>
      )}

      {canDelete && (
        <button
          className="flex items-center gap-1.5 text-gray-400 transition-colors hover:text-red-600 disabled:opacity-50"
          disabled={deleteDisabled}
          onClick={onDelete}
          title={
            deleteDisabled
              ? "Cannot delete a message that has been forked"
              : "Delete message"
          }
          type="button"
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Delete</span>
        </button>
      )}
    </div>
  </div>
);
}
