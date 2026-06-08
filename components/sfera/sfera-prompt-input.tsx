"use client";

import { useCallback, useRef } from "react";
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
import {
  MentionButton,
  type SferaMember,
} from "@/components/sfera/sfera-mention-button";
import type { Attachment } from "@/lib/types";

export type SferaPromptInputProps = {
  onSubmit: (message: PromptInputMessage) => void;
  isLoading?: boolean;
  replyingTo?: { id: string; content: string } | null;
  editingMessage?: { id: string; content: string } | null;
  onCancelReply?: () => void;
  onCancelEdit?: () => void;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  members?: SferaMember[];
  currentUserId?: string;
};

/**
 * SferaPromptInput - компонент ввода сообщений для Sfera чата
 * Использует AI SDK Elements для богатого UI
 */
export function SferaPromptInput({
  onSubmit,
  isLoading = false,
  replyingTo,
  editingMessage,
  onCancelReply,
  onCancelEdit,
  value,
  onChange,
  placeholder = "Введите сообщение...",
  members = [],
  currentUserId = "",
}: SferaPromptInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (message: PromptInputMessage) => {
    onSubmit(message);
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange?.(e.target.value);
  };

  // Handle mention selection - insert at cursor position
  const handleMentionSelect = useCallback(
    (mention: string) => {
      const textarea = textareaRef.current;
      if (!textarea) {
        // Fallback: append to end
        onChange?.((value || "") + mention);
        return;
      }

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentValue = value || "";

      // Insert mention at cursor position
      const newValue =
        currentValue.slice(0, start) + mention + currentValue.slice(end);
      onChange?.(newValue);

      // Set cursor position after mention
      setTimeout(() => {
        const newPosition = start + mention.length;
        textarea.setSelectionRange(newPosition, newPosition);
        textarea.focus();
      }, 0);
    },
    [value, onChange]
  );

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
          ref={textareaRef}
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

          {/* Mention button */}
          <MentionButton
            currentUserId={currentUserId}
            disabled={isLoading}
            members={members}
            onMentionSelect={handleMentionSelect}
          />
        </PromptInputTools>

        <PromptInputSubmit disabled={isLoading} />
      </PromptInputFooter>
    </PromptInput>
  );
}
