"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { GitBranch, LogIn, Copy, Share2, RefreshCcw, Sparkles, CornerDownRight, Reply } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { segmentTextWithMentions } from "@/lib/mentions/parser";
import Image from "next/image";

interface SferaMessageProps {
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
  onFork?: (messageId: string) => void;
  onReply?: () => void;
}

export function SferaMessage({ message, parentMessage, sferaId, onFork, onReply }: SferaMessageProps) {
  const router = useRouter();
  const [isForking, setIsForking] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  // Check if content is overflowing 75px
  useEffect(() => {
    if (contentRef.current) {
      const height = contentRef.current.scrollHeight;
      setIsOverflowing(height > 75);
    }
  }, [message.content]);

  const handleFork = async () => {
    if (isForking || message.isForked) return;

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
      alert(error instanceof Error ? error.message : "Failed to create fork");
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

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(30);
    }
  };

  // Check if this is an Avrora message
  const isAvroraMessage = message.userId === "00000000-0000-0000-0000-000000000001" || message.userEmail === "avrora@avrora.ai";

  // Segment text to highlight mentions
  const textSegments = segmentTextWithMentions(message.content);

  return (
    <div className="flex flex-col">
      <div
        className={cn(
          "max-w-[85%] px-4 py-2.5 rounded-2xl",
          isAvroraMessage
            ? "bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-br-none"
            : "bg-white border border-gray-200 rounded-br-none"
        )}
      >
        {/* Message Header */}
        <div className="mb-1.5 flex items-center justify-between gap-3">
          <div className="text-xs text-gray-500 flex items-center gap-1.5">
            {isAvroraMessage && (
              <Sparkles className="h-3 w-3 text-blue-600" />
            )}
            <span className={cn("font-medium", isAvroraMessage ? "text-blue-700" : "text-gray-700")}>
              {message.userEmail}
            </span>
            <span className="mx-1.5">•</span>
            <span>{new Date(message.createdAt).toLocaleTimeString()}</span>
          </div>

          {message.isForked && (
            <div className="flex items-center gap-1 text-xs text-blue-600">
              <GitBranch className="h-3 w-3" />
              <span>Forked</span>
            </div>
          )}
        </div>

        {/* Reply to (Parent Message) */}
        {parentMessage && (
          <div className="mb-2 pl-2 border-l-2 border-gray-300 bg-gray-50 rounded p-2">
            <div className="flex items-center gap-1.5 mb-1">
              <CornerDownRight className="h-3 w-3 text-gray-400" />
              <span className="text-xs font-medium text-gray-600">
                {parentMessage.userEmail}
              </span>
            </div>
            <div className="text-xs text-gray-600 line-clamp-2">
              {parentMessage.content}
            </div>
          </div>
        )}

        {/* Message Content with highlighted mentions */}
        <div
          ref={contentRef}
          onClick={() => isOverflowing && setIsExpanded(!isExpanded)}
          className={cn(
            "whitespace-pre-wrap text-gray-900 text-[15px] leading-relaxed transition-all duration-200",
            isOverflowing && !isExpanded && "max-h-[75px] overflow-hidden cursor-pointer",
            isOverflowing && "relative"
          )}
        >
          {textSegments.map((segment, index) => (
            segment.isMention && segment.mention?.type === "avrora" ? (
              <span
                key={index}
                className="bg-blue-100 text-blue-700 font-medium px-1 rounded"
              >
                {segment.text}
              </span>
            ) : (
              <span key={index}>{segment.text}</span>
            )
          ))}

          {/* Show more indicator */}
          {isOverflowing && !isExpanded && (
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent flex items-end justify-center pb-1">
              <span className="text-xs text-gray-500 font-medium">Click to expand...</span>
            </div>
          )}
        </div>

        {/* Image attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.attachments.map((attachment, index) => (
              <div
                key={index}
                className="relative w-64 h-48 overflow-hidden rounded-lg border bg-muted cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => window.open(attachment.url, '_blank')}
              >
                <Image
                  alt={attachment.name}
                  className="object-cover"
                  fill
                  src={attachment.url}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Message Actions */}
      <div className="flex items-center gap-2 px-4 mt-1.5 mb-2">
        <button
          onClick={handleCopy}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          title="Copy message"
        >
          <Copy className="h-4 w-4" />
        </button>

        <button
          onClick={onReply}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          title="Reply to this message"
        >
          <Reply className="h-4 w-4" />
        </button>

        {/* Fork/Enter Fork Button */}
        {!message.isForked ? (
          <button
            onClick={handleFork}
            disabled={isForking}
            className="flex items-center gap-1.5 text-gray-400 hover:text-blue-600 transition-colors disabled:opacity-50"
            title="Fork this message into a new Sfera"
          >
            <GitBranch className="h-4 w-4" />
            <span className="text-xs font-medium">
              {isForking ? "Forking..." : "Fork"}
            </span>
          </button>
        ) : message.forkedSferaId ? (
          <button
            onClick={handleEnterFork}
            className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 transition-colors"
            title="Enter forked Sfera"
          >
            <LogIn className="h-4 w-4" />
            <span className="text-xs font-medium">Enter Fork</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
