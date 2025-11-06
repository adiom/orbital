"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowUp, Plus, GitBranch, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReplyingToMessage {
  id: string;
  content: string;
  userEmail: string;
}

interface SferaMessageInputProps {
  sferaId: string;
  replyingTo?: ReplyingToMessage | null;
  onCancelReply?: () => void;
  onMessageSent?: () => void;
}

export function SferaMessageInput({
  sferaId,
  replyingTo,
  onCancelReply,
  onMessageSent,
}: SferaMessageInputProps) {
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [hasTyped, setHasTyped] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim() || isSending) return;

    // Haptic feedback
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(50);
    }

    setIsSending(true);
    try {
      const response = await fetch(`/api/sfera/${sferaId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          parentMessageId: replyingTo?.id || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      setContent("");
      setHasTyped(false);

      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }

      onMessageSent?.();
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;

    if (!isSending) {
      setContent(newValue);

      if (newValue.trim() !== "" && !hasTyped) {
        setHasTyped(true);
      } else if (newValue.trim() === "" && hasTyped) {
        setHasTyped(false);
      }

      const textarea = textareaRef.current;
      if (textarea) {
        textarea.style.height = "auto";
        const newHeight = Math.max(24, Math.min(textarea.scrollHeight, 160));
        textarea.style.height = `${newHeight}px`;
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Cmd+Enter on both mobile and desktop
    if (!isSending && e.key === "Enter" && e.metaKey) {
      e.preventDefault();
      handleSubmit(e);
      return;
    }

    // Regular Enter (without Shift) on desktop
    if (!isSending && e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInputContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (
      e.target === e.currentTarget ||
      (e.currentTarget === inputContainerRef.current && !(e.target as HTMLElement).closest("button"))
    ) {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      {/* Reply preview */}
      {replyingTo && (
        <div className="mb-2 bg-white border border-gray-200 rounded-2xl p-3 flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-gray-700 mb-1">
              Replying to {replyingTo.userEmail}
            </div>
            <div className="text-xs text-gray-500 line-clamp-1">
              {replyingTo.content}
            </div>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="ml-2 text-gray-400 hover:text-gray-600 flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div
        ref={inputContainerRef}
        className={cn(
          "relative w-full rounded-3xl border border-gray-200 bg-white p-3 cursor-text",
          isSending && "opacity-80"
        )}
        onClick={handleInputContainerClick}
      >
        <div className="pb-9">
          <Textarea
            ref={textareaRef}
            placeholder={isSending ? "Sending..." : "Write your message..."}
            className="min-h-[24px] max-h-[160px] w-full rounded-3xl border-0 bg-transparent text-gray-900 placeholder:text-gray-400 placeholder:text-base focus-visible:ring-0 focus-visible:ring-offset-0 text-base pl-2 pr-4 pt-0 pb-0 resize-none overflow-y-auto leading-tight"
            value={content}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={isSending}
          />
        </div>

        <div className="absolute bottom-3 left-3 right-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="rounded-full h-8 w-8 flex-shrink-0 border-gray-200 p-0 transition-colors"
                disabled={isSending}
              >
                <Plus className="h-4 w-4 text-gray-500" />
                <span className="sr-only">Add</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                className="rounded-full h-8 px-3 flex items-center border-gray-200 gap-1.5 transition-colors"
                disabled={isSending}
              >
                <GitBranch className="h-4 w-4 text-gray-500" />
                <span className="text-gray-900 text-sm">
                  Forkable
                </span>
              </Button>
            </div>

            <Button
              type="submit"
              variant="outline"
              size="icon"
              className={cn(
                "rounded-full h-8 w-8 border-0 flex-shrink-0 transition-all duration-200",
                hasTyped ? "bg-black scale-110" : "bg-gray-200"
              )}
              disabled={!content.trim() || isSending}
            >
              <ArrowUp className={cn("h-4 w-4 transition-colors", hasTyped ? "text-white" : "text-gray-500")} />
              <span className="sr-only">Submit</span>
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
