"use client";

import type { UIMessage } from "ai";
import { Code2, Sparkles } from "lucide-react";
import { memo } from "react";
import {
  Message,
  MessageAvatar,
  MessageContent,
} from "@/components/elements/message";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/elements/reasoning";
import { Response } from "@/components/elements/response";
import { Source, Sources, SourcesContent, SourcesTrigger } from "@/components/elements/source";
import { ToolResultDisplay } from "@/components/orbit/tool-result-display";
import { PreviewAttachment } from "@/components/preview-attachment";
import {
  AVRORA_USER_ID,
  CLAUDE_CODE_USER_ID,
} from "@/lib/constants/system-users";
import type { Attachment } from "@/lib/types";
import { cn } from "@/lib/utils";

type ToolResult = {
  toolName: string;
  success?: boolean;
  error?: string;
  [key: string]: unknown;
};

export type SferaMessageProps = {
  message: UIMessage & {
    userId?: string;
    userEmail?: string;
    isGenerating?: boolean;
    createdAt?: Date | string;
    attachments?: Attachment[];
    toolResults?: ToolResult[];
  };
  currentUserId?: string;
};

export const SferaMessage = memo(({ message }: SferaMessageProps) => {
  const isAvrora = message.userId === AVRORA_USER_ID;
  const isClaudeCode = message.userId === CLAUDE_CODE_USER_ID;
  const isAI = isAvrora || isClaudeCode;

  // Group parts by type for rendering
  const textParts = message.parts.filter((part) => part.type === "text");
  const reasoningParts = message.parts.filter((part) => part.type === "reasoning");
  const sourceParts = message.parts.filter((part) => part.type === "source-url");

  return (
    <Message from={message.role}>
      <MessageAvatar
        src={
          isAvrora
            ? "/avatars/avrora.png"
            : isClaudeCode
              ? "/avatars/claude-code.png"
              : "/avatars/default.png"
        }
        name={message.userEmail}
      />

      <MessageContent>
        {/* Message Author Header */}
        <div className="mb-2 flex items-center gap-2">
          {isAvrora && (
            <div className="flex items-center gap-1 rounded-full bg-primary px-2 py-0.5">
              <Sparkles className="h-3 w-3 text-primary-foreground" />
              <span className="font-semibold text-primary-foreground text-xs">
                Avrora AI
              </span>
            </div>
          )}
          {isClaudeCode && (
            <div className="flex items-center gap-1 rounded-full bg-primary px-2 py-0.5">
              <Code2 className="h-3 w-3 text-primary-foreground" />
              <span className="font-semibold text-primary-foreground text-xs">
                Claude Code
              </span>
            </div>
          )}
          <span className={cn("text-xs", isAI ? "text-foreground" : "text-muted-foreground")}>
            {message.userEmail || "Unknown"}
          </span>
          {message.createdAt && (
            <>
              <span className="text-muted-foreground text-xs">•</span>
              <span className="text-muted-foreground text-xs" suppressHydrationWarning>
                {new Date(message.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </>
          )}
        </div>

        {/* Text Content */}
        {textParts.map((part, index) => (
          <Response key={`text-${index}`}>
            {part.type === "text" ? part.text : ""}
          </Response>
        ))}

        {/* Reasoning (Collapsible) */}
        {reasoningParts.length > 0 && (
          <Reasoning isStreaming={message.isGenerating}>
            <ReasoningTrigger />
            <ReasoningContent>
              {reasoningParts.map((part) => (
                part.type === "reasoning" ? part.text : ""
              )).join("\n")}
            </ReasoningContent>
          </Reasoning>
        )}

        {/* Sources */}
        {sourceParts.length > 0 && (
          <Sources>
            <SourcesTrigger count={sourceParts.length} />
            <SourcesContent>
              {sourceParts.map((part, index) => (
                <Source
                  key={`source-${index}`}
                  href={part.type === "source-url" ? part.url : "#"}
                  title={part.type === "source-url" ? part.url : "Source"}
                />
              ))}
            </SourcesContent>
          </Sources>
        )}

        {/* Tool Results */}
        {message.toolResults && message.toolResults.length > 0 && (
          <div className="mt-3 space-y-2">
            {message.toolResults.map((result, index) => (
              <ToolResultDisplay
                key={`tool-${index}`}
                result={result}
                messageId={message.id}
              />
            ))}
          </div>
        )}

        {/* Attachments with Preview */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.attachments.map((attachment, index) => (
              <PreviewAttachment
                key={`attachment-${index}`}
                attachment={attachment}
              />
            ))}
          </div>
        )}
      </MessageContent>
    </Message>
  );
});

SferaMessage.displayName = "SferaMessage";
