"use client";

import { ArrowUp, ImageIcon, Music, Sparkles, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { hasAvroraMention } from "@/lib/mentions/parser";
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

type OrbitInputProps = {
  orbitId: string;
  replyingTo?: ReplyingToMessage | null;
  editingMessage?: EditingMessage | null;
  onCancelReply?: () => void;
  onCancelEdit?: () => void;
  onMessageSent?: () => void;
  onAvroraThinking?: () => void;
};

export function OrbitInput({
  orbitId,
  replyingTo,
  editingMessage,
  onCancelReply,
  onCancelEdit,
  onMessageSent,
  onAvroraThinking,
}: OrbitInputProps) {
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [hasTyped, setHasTyped] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingMessage) {
      const nextContent = editingMessage.content || "";
      setContent(nextContent);
      setHasTyped(nextContent.trim().length > 0);
      setAttachments(editingMessage.attachments ?? []);

      requestAnimationFrame(() => {
        const textarea = textareaRef.current;
        if (textarea) {
          textarea.style.height = "auto";
          const newHeight = Math.max(48, Math.min(textarea.scrollHeight, 200));
          textarea.style.height = `${newHeight}px`;
        }
      });
    } else {
      setContent("");
      setHasTyped(false);
      setAttachments([]);

      const textarea = textareaRef.current;
      if (textarea) {
        textarea.style.height = "48px";
      }
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

      const isImage = file.type.startsWith("image/");
      const isAudio = file.type.startsWith("audio/");

      if (!isImage && !isAudio) {
        toast.error("Only image and audio files are supported");
        return;
      }

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

      setAttachments((prev) => [
        ...prev,
        {
          name: file.name,
          url: data.url,
          contentType: file.type,
        },
      ]);

      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(30);
      }

      toast.success(isAudio ? "Audio uploaded" : "Image uploaded");
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Failed to upload file");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));

    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(30);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if ((!content.trim() && attachments.length === 0) || isSending) {
      return;
    }

    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(50);
    }

    // Check if message mentions Avrora and trigger thinking indicator
    const isEditing = Boolean(editingMessage);
    if (!isEditing && hasAvroraMention(content)) {
      onAvroraThinking?.();
    }

    setIsSending(true);
    try {
      const endpoint = isEditing
        ? `/api/sfera/${orbitId}/messages/${editingMessage?.id}`
        : `/api/sfera/${orbitId}/messages`;
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
      setHasTyped(false);
      setAttachments([]);

      if (textareaRef.current) {
        textareaRef.current.style.height = "48px";
      }

      onMessageSent?.();
      if (editingMessage) {
        onCancelEdit?.();
      }

      toast.success(isEditing ? "Message updated" : "Message sent");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to send message"
      );
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
        const newHeight = Math.max(48, Math.min(textarea.scrollHeight, 200));
        textarea.style.height = `${newHeight}px`;
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!isSending && e.key === "Enter" && e.metaKey) {
      e.preventDefault();
      handleSubmit(e);
      return;
    }

    if (!isSending && e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form className="relative" onSubmit={handleSubmit}>
      {replyingTo && (
        <div className="mb-3 flex items-start justify-between rounded-2xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50 p-3 shadow-sm transition-all hover:shadow-md">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-1.5 font-medium text-blue-700 text-xs">
              <Sparkles className="h-3 w-3" />
              Replying to {replyingTo.userEmail}
            </div>
            <div className="line-clamp-2 text-gray-700 text-sm">
              {replyingTo.content}
            </div>
          </div>
          <button
            className="ml-2 flex-shrink-0 rounded-full p-1 text-blue-400 transition-colors hover:bg-blue-100 hover:text-blue-600"
            onClick={onCancelReply}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {editingMessage && (
        <div className="mb-3 flex items-start justify-between rounded-2xl border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-3 shadow-sm transition-all hover:shadow-md">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-1.5 font-medium text-amber-700 text-xs">
              <Sparkles className="h-3 w-3" />
              Editing message
            </div>
            <div className="line-clamp-2 text-amber-700/90 text-sm">
              {editingMessage.content}
            </div>
          </div>
          <button
            className="ml-2 flex-shrink-0 rounded-full p-1 text-amber-400 transition-colors hover:bg-amber-100 hover:text-amber-600"
            onClick={onCancelEdit}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {attachments.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachments.map((attachment, index) => {
            const isAudio = attachment.contentType.startsWith("audio/");

            if (isAudio) {
              return (
                <div
                  className="group relative flex h-16 min-w-[200px] items-center gap-3 overflow-hidden rounded-xl border-2 border-gray-200 bg-muted px-3 shadow-sm transition-all hover:shadow-md"
                  key={`preview-${attachment.url}-${index}`}
                >
                  <div className="flex size-10 flex-shrink-0 items-center justify-center rounded-lg bg-purple-100">
                    <Music className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-gray-900 text-sm">
                      {attachment.name}
                    </div>
                    <div className="text-gray-500 text-xs">Audio file</div>
                  </div>
                  {!isSending && (
                    <button
                      className="flex-shrink-0 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600"
                      onClick={() => removeAttachment(index)}
                      type="button"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            }

            return (
              <div
                className="group relative size-24 overflow-hidden rounded-xl border-2 border-gray-200 bg-muted shadow-sm transition-all hover:shadow-md"
                key={`preview-${attachment.url}-${index}`}
              >
                <Image
                  alt={attachment.name}
                  className="size-full object-cover"
                  height={96}
                  src={attachment.url}
                  width={96}
                />
                {!isSending && (
                  <button
                    className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-black/70 opacity-0 backdrop-blur-sm transition-all hover:bg-black/90 group-hover:opacity-100"
                    onClick={() => removeAttachment(index)}
                    type="button"
                  >
                    <X className="h-3.5 w-3.5 text-white" />
                  </button>
                )}
                <div className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/90 via-black/50 to-transparent px-2 py-1 text-[11px] text-white">
                  {attachment.name}
                </div>
              </div>
            );
          })}
          {isUploading && (
            <div className="flex size-24 items-center justify-center rounded-xl border-2 border-gray-200 bg-muted">
              <div className="h-8 w-8 animate-spin rounded-full border-blue-600 border-t-2" />
            </div>
          )}
        </div>
      )}

      <input
        accept="image/*,audio/*"
        className="hidden"
        disabled={isSending || isUploading}
        onChange={handleFileSelect}
        ref={fileInputRef}
        type="file"
      />

      {/* Стабилизируем контейнер - убираем transform transitions */}
      <div
        className={cn(
          "relative overflow-hidden rounded-3xl bg-white shadow-sm transition-colors duration-200",
          isSending && "opacity-70",
          hasTyped && "border-blue-300 shadow-md"
        )}
        ref={inputContainerRef}
        style={{ maxHeight: "200px" }} // Фиксируем максимальную высоту
      >
        <div className="p-4 pb-16">
          <Textarea
            className="max-h-[200px] min-h-[48px] w-full resize-none overflow-y-auto border-0 bg-transparent p-0 text-[15px] text-gray-900 leading-relaxed placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0"
            disabled={isSending}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={
              isSending
                ? "Sending..."
                : editingMessage
                  ? "Update your message..."
                  : "Share your thoughts in this orbit..."
            }
            ref={textareaRef}
            style={{
              height: "auto",
              minHeight: "48px",
            }}
            value={content}
          />
        </div>

        {/* Стабилизируем кнопки - убираем transform эффекты */}
        <div className="absolute right-4 bottom-4 left-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-shrink-0 items-center gap-2">
              <Button
                className="h-9 w-9 rounded-full border-gray-300 bg-white transition-colors hover:border-blue-400 hover:bg-blue-50"
                disabled={isSending || isUploading}
                onClick={() => fileInputRef.current?.click()}
                size="icon"
                type="button"
                variant="outline"
              >
                <ImageIcon className="h-4 w-4 text-gray-600" />
                <span className="sr-only">Add photo</span>
              </Button>

              <Button
                className="h-9 rounded-full border border-gray-300 bg-white px-3 text-sm transition-colors hover:border-blue-400 hover:bg-blue-50"
                onClick={() => {
                  const textarea = textareaRef.current;
                  if (textarea) {
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    const newContent = `${content.slice(0, start)}@Avrora ${content.slice(end)}`;
                    setContent(newContent);
                    setHasTyped(true);

                    requestAnimationFrame(() => {
                      textarea.focus();
                      textarea.setSelectionRange(start + 8, start + 8);
                    });
                  }
                }}
                type="button"
                variant="outline"
              >
                <Sparkles className="mr-1.5 h-3.5 w-3.5 text-gray-500" />
                <span className="font-medium text-gray-700 text-xs">
                  Avrora
                </span>
              </Button>
            </div>

            <Button
              className={cn(
                "h-10 w-10 rounded-full border-0 shadow-lg transition-colors duration-200",
                hasTyped || attachments.length > 0
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  : "bg-gray-300 hover:bg-gray-400"
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
                  "h-5 w-5 transition-colors duration-200",
                  hasTyped || attachments.length > 0
                    ? "text-white"
                    : "text-gray-600"
                )}
              />
              <span className="sr-only">
                {editingMessage ? "Save changes" : "Submit"}
              </span>
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between px-1 text-[11px] text-gray-500">
        <span>Press Enter to send, Shift+Enter for new line</span>
        <span
          className={cn(
            "transition-opacity duration-200",
            content.length > 0 ? "opacity-100" : "opacity-0"
          )}
        >
          {content.length || 0} characters
        </span>
      </div>
    </form>
  );
}
