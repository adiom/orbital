"use client";

import { ArrowUp, GitBranch, ImageIcon, Plus, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

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
      (e.target === e.currentTarget ||
        (e.currentTarget === inputContainerRef.current &&
          !(e.target as HTMLElement).closest("button"))) &&
      textareaRef.current
    ) {
      textareaRef.current.focus();
    }
  };

  return (
    <form className="w-full" onSubmit={handleSubmit}>
      {/* Reply preview */}
      {replyingTo && (
        <div className="mb-2 flex items-start justify-between rounded-2xl border border-gray-200 bg-white p-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1 font-medium text-gray-700 text-xs">
              Replying to {replyingTo.userEmail}
            </div>
            <div className="line-clamp-1 text-gray-500 text-xs">
              {replyingTo.content}
            </div>
          </div>
          <button
            className="ml-2 flex-shrink-0 text-gray-400 hover:text-gray-600"
            onClick={onCancelReply}
            type="button"
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
              className="group relative size-20 overflow-hidden rounded-lg border bg-muted"
              key={index}
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
                  className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-black/60 opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100"
                  onClick={() => removeAttachment(index)}
                  type="button"
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
            <div className="flex size-20 items-center justify-center rounded-lg border bg-muted">
              <div className="h-6 w-6 animate-spin rounded-full border-gray-900 border-b-2" />
            </div>
          )}
        </div>
      )}

      {/* Hidden file input */}
      <input
        accept="image/*"
        className="hidden"
        disabled={isSending || isUploading}
        onChange={handleFileSelect}
        ref={fileInputRef}
        type="file"
      />

      <div
        className={cn(
          "relative w-full cursor-text rounded-3xl border border-gray-200 bg-white p-3",
          isSending && "opacity-80"
        )}
        onClick={handleInputContainerClick}
        ref={inputContainerRef}
      >
        <div className="pb-9">
          <Textarea
            className="max-h-[160px] min-h-[24px] w-full resize-none overflow-y-auto rounded-3xl border-0 bg-transparent pt-0 pr-4 pb-0 pl-2 text-base text-gray-900 leading-tight placeholder:text-base placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0"
            disabled={isSending}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={isSending ? "Sending..." : "Write your message..."}
            ref={textareaRef}
            value={content}
          />
        </div>

        <div className="absolute right-3 bottom-3 left-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button
                className="h-8 w-8 flex-shrink-0 rounded-full border-gray-200 p-0 transition-colors"
                disabled={isSending || isUploading}
                onClick={() => fileInputRef.current?.click()}
                size="icon"
                type="button"
                variant="outline"
              >
                <ImageIcon className="h-4 w-4 text-gray-500" />
                <span className="sr-only">Add photo</span>
              </Button>

              <Button
                className="flex h-8 items-center gap-1.5 rounded-full border-gray-200 px-3 transition-colors"
                disabled={isSending}
                type="button"
                variant="outline"
              >
                <GitBranch className="h-4 w-4 text-gray-500" />
                <span className="text-gray-900 text-sm">Forkable</span>
              </Button>
            </div>

            <Button
              className={cn(
                "h-8 w-8 flex-shrink-0 rounded-full border-0 transition-all duration-200",
                hasTyped || attachments.length > 0
                  ? "scale-110 bg-black"
                  : "bg-gray-200"
              )}
              disabled={
                (!content.trim() && attachments.length === 0) || isSending
              }
              size="icon"
              type="submit"
              variant="outline"
            >
              <ArrowUp
                className={cn(
                  "h-4 w-4 transition-colors",
                  hasTyped || attachments.length > 0
                    ? "text-white"
                    : "text-gray-500"
                )}
              />
              <span className="sr-only">Submit</span>
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
