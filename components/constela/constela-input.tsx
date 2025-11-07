"use client";

import { GitBranch, ImageIcon, Sparkles, X } from "lucide-react";
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
import type { ConstelaAttachment, ConstelaMessage } from "@/hooks/use-constela";
import { cn } from "@/lib/utils";

type ReplyingTo = Pick<ConstelaMessage, "id" | "content" | "userEmail"> | null;

type ConstelaInputProps = {
  constelaId: string;
  replyingTo: ReplyingTo;
  editingMessage: ConstelaMessage | null;
  onMessageSent: () => void;
  onCancelReply: () => void;
  onCancelEdit: () => void;
};

export const ConstelaInput = ({
  constelaId,
  replyingTo,
  editingMessage,
  onMessageSent,
  onCancelReply,
  onCancelEdit,
}: ConstelaInputProps) => {
  const [content, setContent] = useState("");
  const [attachments, setAttachments] = useState<ConstelaAttachment[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingMessage) {
      setContent(editingMessage.content);
      setAttachments(editingMessage.attachments);
    } else {
      setContent("");
      setAttachments([]);
    }
  }, [editingMessage]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }

    const file = files[0];
    if (!file.type.startsWith("image/")) {
      toast.error("Только изображения поддерживаются сейчас");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Не удалось загрузить файл");
      }

      const payload = (await response.json()) as { url: string };
      setAttachments((previous) => [
        ...previous,
        {
          name: file.name,
          url: payload.url,
          contentType: file.type,
        },
      ]);
    } catch (error) {
      console.error("Upload failed", error);
      toast.error("Не удалось загрузить файл");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((previous) => previous.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if ((!content.trim() && attachments.length === 0) || isSending) {
      return;
    }

    setIsSending(true);
    try {
      const isEditing = Boolean(editingMessage);
      const endpoint = isEditing
        ? `/api/sfera/${constelaId}/messages/${editingMessage?.id}`
        : `/api/sfera/${constelaId}/messages`;
      const method = isEditing ? "PATCH" : "POST";

      const payload = isEditing
        ? { content: content.trim(), attachments }
        : {
            content: content.trim(),
            parentMessageId: replyingTo?.id ?? null,
            attachments,
          };

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Не удалось отправить сообщение");
      }

      setContent("");
      setAttachments([]);
      onMessageSent();
      if (isEditing) {
        onCancelEdit();
      }
    } catch (error) {
      console.error("Send failed", error);
      toast.error(
        error instanceof Error ? error.message : "Ошибка отправки сообщения"
      );
    } finally {
      setIsSending(false);
    }
  };

  const status = isSending ? "submitted" : "ready";

  return (
    <div className="space-y-3">
      {replyingTo ? (
        <div className="flex items-start justify-between rounded-xl border border-primary/30 bg-primary/10 p-3 text-xs">
          <div className="flex-1">
            <div className="flex items-center gap-1 font-medium text-primary">
              <Sparkles className="h-3 w-3" /> Ответ для {replyingTo.userEmail}
            </div>
            <p className="mt-1 line-clamp-2 text-primary/70">
              {replyingTo.content}
            </p>
          </div>
          <button
            className="ml-3 rounded-full bg-primary/5 p-1 text-primary transition hover:bg-primary/10"
            onClick={onCancelReply}
            type="button"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Отменить ответ</span>
          </button>
        </div>
      ) : null}

      {editingMessage ? (
        <div className="flex items-start justify-between rounded-xl border border-amber-300/40 bg-amber-100/40 p-3 text-amber-800 text-xs">
          <div className="flex-1">
            <div className="flex items-center gap-1 font-medium">
              <Sparkles className="h-3 w-3" /> Редактирование сообщения
            </div>
            <p className="mt-1 line-clamp-2 text-amber-700/80">
              {editingMessage.content}
            </p>
          </div>
          <button
            className="ml-3 rounded-full bg-amber-200/60 p-1"
            onClick={onCancelEdit}
            type="button"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Отменить редактирование</span>
          </button>
        </div>
      ) : null}

      {attachments.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {attachments.map((attachment, index) => (
            <div
              className="group relative size-24 overflow-hidden rounded-xl border bg-muted"
              key={`attachment-${attachment.url}-${index}`}
            >
              <Image
                alt={attachment.name}
                className="size-full object-cover"
                height={96}
                src={attachment.url}
                width={96}
              />
              <button
                className="absolute top-2 right-2 hidden size-6 items-center justify-center rounded-full bg-black/70 text-white transition group-hover:flex"
                onClick={() => removeAttachment(index)}
                type="button"
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Удалить вложение</span>
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <input
        accept="image/*"
        className="hidden"
        disabled={isSending || isUploading}
        onChange={handleUpload}
        ref={fileInputRef}
        type="file"
      />

      <PromptInput className="shadow" onSubmit={handleSubmit}>
        <PromptInputTextarea
          disabled={isSending}
          maxHeight={164}
          minHeight={48}
          onChange={(event) => setContent(event.target.value)}
          placeholder={isSending ? "Отправка..." : "Напишите сообщение..."}
          value={content}
        />
        <PromptInputToolbar>
          <PromptInputTools>
            <PromptInputButton
              aria-label="Добавить изображение"
              disabled={isSending || isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon className="h-4 w-4" />
            </PromptInputButton>
            <PromptInputButton disabled>
              <GitBranch className="h-4 w-4" />
              <span className="text-xs">Forkable</span>
            </PromptInputButton>
          </PromptInputTools>
          <PromptInputSubmit
            className={cn(
              "transition",
              content.trim() || attachments.length > 0
                ? "scale-105 bg-primary text-primary-foreground hover:bg-primary/90"
                : undefined
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
};
