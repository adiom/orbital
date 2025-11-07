"use client";

import { GitBranch, ImageIcon, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  PromptInput,
  PromptInputButton,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from "@/components/elements/prompt-input";
import { cn } from "@/lib/utils";

type ReplyingToMessage = {
  id: string;
  content: string;
  userEmail: string;
};

type Attachment = {
  name: string;
  url: string;
  contentType: string;
};

type EditingMessage = {
  id: string;
  content: string;
  attachments?: Attachment[];
};

type SferaPromptInputProps = {
  sferaId: string;
  replyingTo?: ReplyingToMessage | null;
  editingMessage?: EditingMessage | null;
  onCancelReply?: () => void;
  onCancelEdit?: () => void;
  onMessageSent?: () => void;
};

export function SferaPromptInput({
  sferaId,
  replyingTo,
  editingMessage,
  onCancelReply,
  onCancelEdit,
  onMessageSent,
}: SferaPromptInputProps) {
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update content when editing
  useEffect(() => {
    if (editingMessage) {
      setContent(editingMessage.content || "");
      setAttachments(editingMessage.attachments ?? []);
    } else {
      setContent("");
      setAttachments([]);
    }
  }, [editingMessage]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      return;
    }

    setIsUploading(true);

    try {
      const file = files[0];

      // Only allow images for now
      if (!file.type.startsWith("image/")) {
        toast.error("Only image files are supported");
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
      toast.error("Failed to upload file");
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

    if ((!content.trim() && attachments.length === 0) || isSending) {
      return;
    }

    // Haptic feedback
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(50);
    }

    setIsSending(true);
    try {
      const isEditing = Boolean(editingMessage);
      const endpoint = isEditing
        ? `/api/sfera/${sferaId}/messages/${editingMessage?.id}`
        : `/api/sfera/${sferaId}/messages`;
      const method = isEditing ? "PATCH" : "POST";
      const payload = isEditing
        ? {
            content: content.trim(),
            attachments,
          }
        : {
            content: content.trim(),
            parentMessageId: replyingTo?.id || null,
            attachments,
          };

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      setContent("");
      setAttachments([]);

      onMessageSent?.();
      if (editingMessage) {
        onCancelEdit?.();
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to send message"
      );
    } finally {
      setIsSending(false);
    }
  };

  const status = isSending ? "submitted" : "ready";

  return (
    <div className="w-full space-y-2">
      {/* Reply indicator */}
      {replyingTo && (
        <div className="flex items-start justify-between rounded-xl border border-blue-200 bg-blue-50 p-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1 font-medium text-blue-700 text-xs">
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

      {/* Editing indicator */}
      {editingMessage && (
        <div className="flex items-start justify-between rounded-xl border border-amber-200 bg-amber-50 p-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1 font-medium text-amber-700 text-xs">
              Editing message
            </div>
            <div className="line-clamp-1 text-amber-700/80 text-xs">
              {editingMessage.content}
            </div>
          </div>
          <button
            className="ml-2 flex-shrink-0 text-amber-500 hover:text-amber-700"
            onClick={onCancelEdit}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Image attachments preview */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((attachment, index) => (
            <div
              className="group relative size-20 overflow-hidden rounded-lg border bg-muted"
              key={`preview-${attachment.url}-${index}`}
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

      {/* Main input form */}
      <PromptInput className="shadow-sm" onSubmit={handleSubmit}>
        <PromptInputTextarea
          disabled={isSending}
          maxHeight={164}
          minHeight={48}
          onChange={(e) => setContent(e.target.value)}
          placeholder={
            isSending
              ? "Sending..."
              : editingMessage
                ? "Update your message..."
                : "Write your message..."
          }
          value={content}
        />

        <PromptInputToolbar>
          <PromptInputTools>
            <PromptInputButton
              disabled={isSending || isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon className="h-4 w-4" />
            </PromptInputButton>

            <PromptInputButton disabled={isSending}>
              <GitBranch className="h-4 w-4" />
              <span className="text-sm">Forkable</span>
            </PromptInputButton>
          </PromptInputTools>

          <PromptInputSubmit
            className={cn(
              "transition-all duration-200",
              content.trim() || attachments.length > 0
                ? "scale-110 bg-black text-white hover:bg-black/90"
                : ""
            )}
            disabled={
              (!content.trim() && attachments.length === 0) || isSending
            }
            status={status}
          />
        </PromptInputToolbar>
      </PromptInput>
    </div>
  );
}
