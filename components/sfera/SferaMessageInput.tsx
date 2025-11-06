"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowUp, Plus, GitBranch, X, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface ReplyingToMessage {
  id: string;
  content: string;
  userEmail: string;
}

interface Attachment {
  name: string;
  url: string;
  contentType: string;
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
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    try {
      const file = files[0];

      // Only allow images for now
      if (!file.type.startsWith("image/")) {
        alert("Only image files are supported");
        return;
      }

      // Upload to server
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload file");
      }

      const data = await response.json();

      // Add to attachments
      setAttachments((prev) => [
        ...prev,
        {
          name: file.name,
          url: data.url,
          contentType: file.type,
        },
      ]);

      // Haptic feedback
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(30);
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Failed to upload file");
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));

    // Haptic feedback
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(30);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if ((!content.trim() && attachments.length === 0) || isSending) return;

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
          attachments,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      setContent("");
      setHasTyped(false);
      setAttachments([]);

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

      {/* Image attachments preview */}
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((attachment, index) => (
            <div
              key={index}
              className="relative size-20 overflow-hidden rounded-lg border bg-muted group"
            >
              <Image
                alt={attachment.name}
                className="size-full object-cover"
                height={80}
                src={attachment.url}
                width={80}
              />
              {!isSending && (
                <button
                  type="button"
                  onClick={() => removeAttachment(index)}
                  className="absolute top-1 right-1 size-5 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3 text-white" />
                </button>
              )}
              <div className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-1 py-0.5 text-[10px] text-white">
                {attachment.name}
              </div>
            </div>
          ))}
          {isUploading && (
            <div className="size-20 rounded-lg border bg-muted flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
            </div>
          )}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
        disabled={isSending || isUploading}
      />

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
                disabled={isSending || isUploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageIcon className="h-4 w-4 text-gray-500" />
                <span className="sr-only">Add photo</span>
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
                (hasTyped || attachments.length > 0) ? "bg-black scale-110" : "bg-gray-200"
              )}
              disabled={(!content.trim() && attachments.length === 0) || isSending}
            >
              <ArrowUp className={cn("h-4 w-4 transition-colors", (hasTyped || attachments.length > 0) ? "text-white" : "text-gray-500")} />
              <span className="sr-only">Submit</span>
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
