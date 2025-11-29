"use client";

import type { ChatStatus } from "ai";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputHeader,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/elements/prompt-input";
import type { Attachment } from "@/lib/types";

export type SferaPromptInputProps = {
  onSubmit: (message: PromptInputMessage) => void;
  status?: ChatStatus;
  replyingTo?: { id: string; content: string } | null;
  editingMessage?: { id: string; content: string } | null;
  onCancelReply?: () => void;
  onCancelEdit?: () => void;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
};

/**
 * SferaPromptInput - компонент ввода сообщений для Sfera чата
 * Использует AI SDK Elements для богатого UI
 */
export function SferaPromptInput({
  onSubmit,
  status,
  replyingTo,
  editingMessage,
  onCancelReply,
  onCancelEdit,
  value,
  onChange,
  placeholder = "Введите сообщение...",
}: SferaPromptInputProps) {
  const handleSubmit = (message: PromptInputMessage) => {
    onSubmit(message);
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange?.(e.target.value);
  };

  return (
    <PromptInput globalDrop multiple onSubmit={handleSubmit}>
      {/* Header with attachments display */}
      {(replyingTo || editingMessage) && (
        <PromptInputHeader>
          {/* Reply indicator */}
          {replyingTo && (
            <div className="mb-2 flex items-center justify-between rounded-md bg-muted px-3 py-2">
              <div className="flex-1">
                <p className="text-muted-foreground text-xs">
                  Ответ на сообщение
                </p>
                <p className="line-clamp-1 text-sm">{replyingTo.content}</p>
              </div>
              {onCancelReply && (
                <PromptInputButton
                  onClick={onCancelReply}
                  size="sm"
                  variant="ghost"
                >
                  ✕
                </PromptInputButton>
              )}
            </div>
          )}

          {/* Edit indicator */}
          {editingMessage && (
            <div className="mb-2 flex items-center justify-between rounded-md bg-muted px-3 py-2">
              <div className="flex-1">
                <p className="text-muted-foreground text-xs">
                  Редактирование сообщения
                </p>
              </div>
              {onCancelEdit && (
                <PromptInputButton
                  onClick={onCancelEdit}
                  size="sm"
                  variant="ghost"
                >
                  ✕
                </PromptInputButton>
              )}
            </div>
          )}
        </PromptInputHeader>
      )}

      {/* Attachments display */}
      <PromptInputAttachments>
        {(attachment: Attachment, index: number) =>
          (
            <PromptInputAttachment
              data={attachment}
              key={`attachment-${index}`}
            />
          ) as React.ReactNode
        }
      </PromptInputAttachments>

      {/* Body with textarea */}
      <PromptInputBody>
        <PromptInputTextarea
          onChange={handleTextareaChange}
          placeholder={placeholder}
          value={value}
        />
      </PromptInputBody>

      {/* Footer with tools and submit */}
      <PromptInputFooter>
        <PromptInputTools>
          {/* Attachment menu */}
          <PromptInputActionMenu>
            <PromptInputActionMenuTrigger asChild>
              <PromptInputButton>📎</PromptInputButton>
            </PromptInputActionMenuTrigger>
            <PromptInputActionMenuContent>
              <PromptInputActionAddAttachments />
            </PromptInputActionMenuContent>
          </PromptInputActionMenu>

          {/* TODO: Add MentionButton in Task 9 */}
        </PromptInputTools>

        <PromptInputSubmit
          disabled={status === "submitted" || status === "streaming"}
          status={status}
        />
      </PromptInputFooter>
    </PromptInput>
  );
}
