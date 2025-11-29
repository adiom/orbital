"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useMemo, useState } from "react";
import type { PromptInputMessage } from "@/components/elements/prompt-input";
import { SferaPromptInput } from "@/components/sfera/sfera-prompt-input";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ui/shadcn-io/ai/conversation";
import { Message, MessageContent } from "@/components/ui/shadcn-io/ai/message";
import { Response } from "@/components/ui/shadcn-io/ai/response";

type SferaChatClientProps = {
  sferaId: string;
  currentUserId: string;
  initialSfera: {
    id: string;
    title: string;
    description: string | null;
    visibility: string;
    ownerId: string;
    createdAt: Date;
    updatedAt: Date;
  };
  initialMessages?: UIMessage[];
};

/**
 * SferaChatClient - клиентский компонент для группового чата Sfera
 * с использованием AI SDK Elements
 */
export function SferaChatClient({
  sferaId,
  currentUserId,
  initialSfera,
  initialMessages = [],
}: SferaChatClientProps) {
  const [input, setInput] = useState("");

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `/api/sfera/${sferaId}/chat`,
        body: {
          sferaId,
          currentUserId,
        },
      }),
    [sferaId, currentUserId]
  );

  const { messages, sendMessage, status } = useChat({
    transport,
    messages: initialMessages,
  });

  const handleSubmit = (message: PromptInputMessage) => {
    if (!message.text?.trim()) {
      return;
    }

    // Convert Attachment[] to FileUIPart[] format expected by AI SDK
    const files = message.files?.map((file) => ({
      type: "file" as const,
      name: file.name,
      url: file.url,
      mediaType: file.contentType,
    }));

    sendMessage({
      text: message.text,
      files,
    });
    setInput("");
  };

  const handleInputChange = (value: string) => {
    setInput(value);
  };

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="border-b bg-background px-4 py-3">
        <div className="mx-auto max-w-4xl">
          <h1 className="font-semibold text-lg">{initialSfera.title}</h1>
          {initialSfera.description && (
            <p className="text-muted-foreground text-sm">
              {initialSfera.description}
            </p>
          )}
        </div>
      </header>

      {/* Conversation Area */}
      <Conversation className="flex-1">
        <ConversationContent>
          <div className="mx-auto max-w-4xl space-y-4">
            {messages.length === 0 ? (
              <div className="flex h-full min-h-[400px] items-center justify-center">
                <div className="text-center">
                  <p className="text-muted-foreground">
                    Начните беседу, отправив сообщение
                  </p>
                </div>
              </div>
            ) : (
              messages.map((message: UIMessage) => {
                const metadata = message.metadata as
                  | {
                      userId?: string;
                      userEmail?: string;
                      attachments?: unknown[];
                      toolResults?: unknown[];
                      isGenerating?: boolean;
                      createdAt?: string;
                    }
                  | undefined;

                const isOwn = metadata?.userId === currentUserId;
                const userEmail = metadata?.userEmail || "Unknown";
                const displayName = userEmail.split("@")[0];

                return (
                  <Message from={message.role} key={message.id}>
                    <MessageContent>
                      {/* Author info */}
                      <div className="mb-1 flex items-center gap-2 text-muted-foreground text-xs">
                        <span className="font-medium">
                          {isOwn ? "Вы" : displayName}
                        </span>
                        <span>•</span>
                        <span>
                          {metadata?.createdAt
                            ? new Date(metadata.createdAt).toLocaleTimeString(
                                "ru-RU",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )
                            : ""}
                        </span>
                        {metadata?.isGenerating && (
                          <>
                            <span>•</span>
                            <span className="text-blue-500">Генерация...</span>
                          </>
                        )}
                      </div>

                      {/* Message content */}
                      {message.parts.map((part) => {
                        if (part.type === "text") {
                          return (
                            <Response key={`${message.id}-${part.type}`}>
                              {part.text}
                            </Response>
                          );
                        }
                        // TODO: Handle other part types (reasoning, tool, etc.) in Task 6
                        return null;
                      })}
                    </MessageContent>
                  </Message>
                );
              })
            )}
          </div>
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* Input Area */}
      <div className="border-t bg-background p-4">
        <div className="mx-auto max-w-4xl">
          <SferaPromptInput
            onChange={handleInputChange}
            onSubmit={handleSubmit}
            placeholder="Введите сообщение..."
            status={status}
            value={input}
          />
        </div>
      </div>
    </div>
  );
}
