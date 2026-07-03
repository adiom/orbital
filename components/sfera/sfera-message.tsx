"use client";

type AIMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  experimental_data?: Record<string, any>;
};
import {
  Bot,
  Code2,
  GitFork,
  Link2,
  RefreshCw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { memo } from "react";
import { toast } from "sonner";
import { useCopyToClipboard } from "usehooks-ts";
import {
  Message,
  MessageContent,
} from "@/components/elements/message";
import { Actions, Action } from "@/components/elements/actions";
import { Response } from "@/components/elements/response";
import { ChatAvatar } from "@/components/sfera/chat-avatar";
import { MessageBubble} from "@/components/sfera/message-bubble";
import { CopyIcon, PencilEditIcon } from "@/components/icons";
import { ToolResultDisplay } from "@/components/orbit/tool-result-display";
import { PreviewAttachment } from "@/components/preview-attachment";
import { MentionHighlight } from "@/components/sfera/sfera-mention-button";
import {
  AVRORA_USER_ID,
  CLAUDE_CODE_USER_ID,
  CF_KRISTINA_USER_ID,
} from "@/lib/constants/system-users";
import type { Attachment } from "@/lib/types";
import { cn } from "@/lib/utils";

// Regex for detecting mentions - defined at top level for performance
const MENTION_REGEX = /@[\w-]+/;

type ToolResult = {
  toolName: string;
  success?: boolean;
  error?: string;
  [key: string]: unknown;
};

export type SferaMessageProps = {
  message: AIMessage & {
    experimental_data?: {
      userId?: string;
      userEmail?: string;
      isGenerating?: boolean;
      createdAt?: string;
      attachments?: Attachment[];
      toolResults?: ToolResult[];
    };
  };
  currentUserId?: string;
  onRetry?: (messageId: string) => void;
  onEdit?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onFork?: (messageId: string) => void;
};


export const SferaMessage = memo(
  ({
    message,
    currentUserId,
    onRetry,
    onEdit,
    onDelete,
    onFork,
  }: SferaMessageProps) => {
    const [_, copyToClipboard] = useCopyToClipboard();

    const data = message.experimental_data;
    const isAvrora = data?.userId === AVRORA_USER_ID;
    const isClaudeCode = data?.userId === CLAUDE_CODE_USER_ID;
    const isCfKristina = data?.userId === CF_KRISTINA_USER_ID;
    const isAI = isAvrora || isClaudeCode || isCfKristina;
    const isOwn = data?.userId === currentUserId;

    // Extract text content for copying
    const textContent = typeof message.content === "string" ? message.content : "";

    // Action handlers
    const handleCopy = async () => {
      if (!textContent) {
        toast.error("Нет текста для копирования!");
        return;
      }
      await copyToClipboard(textContent);
      toast.success("Скопировано в буфер обмена!");
    };

    const handleCopyLink = async () => {
      const url = `${window.location.origin}/m/${message.id}`;
      await copyToClipboard(url);
      toast.success("Ссылка скопирована!");
    };

    const handleRetry = () => {
      if (onRetry) {
        onRetry(message.id);
      }
    };

    const handleEdit = () => {
      if (onEdit) {
        onEdit(message.id);
      }
    };

    const handleDelete = () => {
      if (onDelete) {
        onDelete(message.id);
      }
    };

    const handleFork = () => {
      if (onFork) {
        onFork(message.id);
      }
    };

    return (
      <Message from={message.role}>
        <ChatAvatar userId={data?.userId} email={data?.userEmail} />

        <MessageContent>
          {/* Message Author Header */}
          <div className={cn(
            "mb-1.5 flex items-center gap-2",
            isOwn ? "justify-end flex-row-reverse" : "justify-start"
          )}>
            <div className="flex items-center gap-2">
              {isAvrora && (
                <div className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 border border-primary/20">
                  <Sparkles className="h-3 w-3 text-primary" />
                  <span className="font-medium text-primary text-[10px] uppercase tracking-wider">
                    Avrora AI
                  </span>
                </div>
              )}
              {isClaudeCode && (
                <div className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 border border-primary/20">
                  <Code2 className="h-3 w-3 text-primary" />
                  <span className="font-medium text-primary text-[10px] uppercase tracking-wider">
                    Claude Code
                  </span>
                </div>
              )}
              {isCfKristina && (
                <div className="flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 border border-blue-500/20">
                  <Bot className="h-3 w-3 text-blue-500" />
                  <span className="font-medium text-blue-500 text-[10px] uppercase tracking-wider">
                    cf-kristina
                  </span>
                </div>
              )}
              <span
                className={cn(
                  "text-[11px] font-medium",
                  isAI ? "text-foreground/80" : "text-muted-foreground"
                )}
              >
                {data?.userEmail || "Unknown"}
              </span>
              {data?.createdAt && (
                <>
                  <span className="text-muted-foreground/50 text-xs">•</span>
                  <span
                    className="text-muted-foreground/60 text-[11px]"
                    suppressHydrationWarning
                  >
                    {new Date(data.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </>
              )}
            </div>
          </div>

          <MessageBubble role={message.role}>
                  {/* Message content */}
                  {textContent && (
                    <div>
                      {MENTION_REGEX.test(textContent) ? (
                        <MentionHighlight
                          className="prose dark:prose-invert prose-sm"
                          text={textContent}
                        />
                      ) : (
                        <Response>{textContent}</Response>
                      )}
                    </div>
                  )}
                  {/* Tool Results, Attachments, etc. (unchanged) */}
                  {data?.toolResults && data.toolResults.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {data.toolResults.map((result: ToolResult, idx: number) => (
                        <ToolResultDisplay
                          key={`tool-${message.id}-${result.toolName}-${idx}`}
                          messageId={message.id}
                          result={result}
                        />
                      ))}
                    </div>
                  )}
                  {data?.attachments && data.attachments.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {data.attachments.map((attachment: Attachment, idx: number) => (
                        <PreviewAttachment
                          attachment={attachment}
                          key={`attachment-${message.id}-${attachment.name}-${idx}`}
                        />
                      ))}
                    </div>
                  )}
                </MessageBubble>
        </MessageContent>

        {/* Message Actions */}
        <Actions
          className={cn(
            "-mr-0.5 opacity-0 transition-opacity group-hover:opacity-100",
            message.role === "user" ? "justify-end" : "-ml-0.5"
          )}
        >
          {/* Copy - available for all messages */}
          <Action onClick={handleCopy} tooltip="Копировать">
            <CopyIcon />
          </Action>

          {/* Retry - only for AI messages */}
          {isAI && onRetry && (
            <Action onClick={handleRetry} tooltip="Повторить">
              <RefreshCw className="h-4 w-4" />
            </Action>
          )}

          {/* Edit - only for own messages */}
          {isOwn && onEdit && (
            <Action onClick={handleEdit} tooltip="Редактировать">
              <PencilEditIcon />
            </Action>
          )}

          {/* Delete - only for own messages */}
          {isOwn && onDelete && (
            <Action onClick={handleDelete} tooltip="Удалить">
              <Trash2 className="h-4 w-4" />
            </Action>
          )}

          {/* Fork - available for all messages */}
          {onFork && (
            <Action onClick={handleFork} tooltip="Форкнуть">
              <GitFork className="h-4 w-4" />
            </Action>
          )}

          {/* Copy Link - available for all messages */}
          <Action onClick={handleCopyLink} tooltip="Копировать ссылку">
            <Link2 className="h-4 w-4" />
          </Action>
        </Actions>
      </Message>
    );
  }
);

SferaMessage.displayName = "SferaMessage";
