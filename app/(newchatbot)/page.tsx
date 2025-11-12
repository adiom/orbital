"use client";

import { useChat } from "@ai-sdk/react";
import { CopyIcon, GlobeIcon, RefreshCcwIcon } from "lucide-react";
import { Fragment, useEffect, useState } from "react";
import { Action, Actions } from "@/components/elements/actions";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/elements/conversation";
import { Loader } from "@/components/elements/loader";
import { Message, MessageContent } from "@/components/elements/message";
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
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/elements/prompt-input";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/elements/reasoning";
import { Response } from "@/components/elements/response";
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/elements/source";

const models = [
  {
    name: "GPT 4o",
    value: "openai/gpt-4o",
  },
  {
    name: "Deepseek R1",
    value: "deepseek/deepseek-r1",
  },
];

const ChatBotDemo = () => {
  const [input, setInput] = useState("");
  const [model, setModel] = useState<string>(models[0].value);
  const [webSearch, setWebSearch] = useState(false);
  const [sferaId, setSferaId] = useState<string | null>(null);

  const { messages, sendMessage, status, regenerate, setMessages } = useChat({
    // @ts-expect-error - api is supported but types may be outdated
    api: "/api/chat",
    body: {
      sferaId: sferaId || undefined,
    },
    experimental_prepareRequestBody: (options: {
      messages: any[];
      requestBody?: any;
    }) => {
      // Merge with existing requestBody to preserve model, webSearch, and data.attachments
      // that are passed via sendMessage(..., { body: { ... } })
      return {
        messages: options.messages,
        ...(options.requestBody || {}),
        sferaId: sferaId || options.requestBody?.sferaId || undefined,
      };
    },
    onResponse: async (response: Response) => {
      const data = await response.json();
      if (data.sferaId && !sferaId) {
        setSferaId(data.sferaId);
      }
      // Update messages from response
      if (data.messages) {
        setMessages(data.messages);
      }
    },
  });

  // Poll for message updates when status is streaming
  useEffect(() => {
    if (!sferaId || status !== "streaming") {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/sfera/${sferaId}`);
        if (!response.ok) {
          return;
        }

        const data = await response.json();
        if (data.messages) {
          // Convert sfera messages to UIMessage format
          const uiMessages = data.messages.reverse().map((msg: any) => {
            const isUser =
              msg.userId !== "00000000-0000-0000-0000-000000000001";
            return {
              id: msg.id,
              role: isUser ? ("user" as const) : ("assistant" as const),
              content: msg.content,
              parts: [
                {
                  type: "text",
                  text: msg.content,
                },
                ...(msg.attachments && msg.attachments.length > 0
                  ? msg.attachments.map((att: any) => ({
                      type: "file" as const,
                      name: att.name,
                      url: att.url,
                      contentType: att.contentType,
                    }))
                  : []),
              ],
            };
          });

          setMessages(uiMessages);
        }
      } catch (error) {
        console.error("Error polling messages:", error);
      }
    }, 500);

    return () => clearInterval(pollInterval);
  }, [sferaId, status, setMessages]);

  const handleSubmit = (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);

    if (!(hasText || hasAttachments)) {
      return;
    }

    // Send message with attachments via data.attachments (like /api/chatbot)
    sendMessage(
      {
        text: message.text || "Sent with attachments",
      },
      {
        body: {
          model,
          webSearch,
          sferaId: sferaId || undefined,
          data: {
            attachments: message.files || [],
          },
        },
      }
    );

    setInput("");
  };

  return (
    <div className="relative mx-auto size-full h-screen max-w-4xl p-6">
      <div className="flex h-full flex-col">
        <Conversation className="h-full">
          <ConversationContent>
            {messages.map((message) => (
              <div key={message.id}>
                {message.role === "assistant" &&
                  message.parts?.filter((part) => part.type === "source-url")
                    .length > 0 && (
                    <Sources>
                      <SourcesTrigger
                        count={
                          message.parts.filter(
                            (part) => part.type === "source-url"
                          ).length
                        }
                      />
                      {message.parts
                        .filter((part) => part.type === "source-url")
                        .map((part: any, i) => (
                          <SourcesContent key={`${message.id}-${i}`}>
                            <Source
                              href={part.url}
                              key={`${message.id}-${i}`}
                              title={part.url}
                            />
                          </SourcesContent>
                        ))}
                    </Sources>
                  )}

                {message.parts?.map((part, i) => {
                  switch (part.type) {
                    case "text":
                      return (
                        <Fragment key={`${message.id}-${i}`}>
                          <Message from={message.role}>
                            <MessageContent>
                              <Response>{part.text}</Response>
                            </MessageContent>
                          </Message>
                          {message.role === "assistant" &&
                            i === message.parts.length - 1 && (
                              <Actions className="mt-2">
                                <Action
                                  label="Retry"
                                  onClick={() => regenerate()}
                                >
                                  <RefreshCcwIcon className="size-3" />
                                </Action>
                                <Action
                                  label="Copy"
                                  onClick={() =>
                                    navigator.clipboard.writeText(part.text)
                                  }
                                >
                                  <CopyIcon className="size-3" />
                                </Action>
                              </Actions>
                            )}
                        </Fragment>
                      );

                    case "reasoning":
                      return (
                        <Reasoning
                          className="w-full"
                          isStreaming={
                            status === "streaming" &&
                            i === message.parts.length - 1 &&
                            message.id === messages.at(-1)?.id
                          }
                          key={`${message.id}-${i}`}
                        >
                          <ReasoningTrigger />
                          <ReasoningContent>{part.text}</ReasoningContent>
                        </Reasoning>
                      );

                    default:
                      return null;
                  }
                })}
              </div>
            ))}

            {status === "submitted" && <Loader />}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <PromptInput
          className="mt-4"
          globalDrop
          multiple
          onSubmit={handleSubmit}
        >
          <PromptInputBody>
            <PromptInputTextarea
              onChange={(e) => setInput(e.target.value)}
              value={input}
            />
          </PromptInputBody>

          <PromptInputFooter>
            <PromptInputTools>
              <PromptInputActionMenu>
                <PromptInputActionMenuTrigger />
                <PromptInputActionMenuContent>
                  <PromptInputActionAddAttachments />
                </PromptInputActionMenuContent>
              </PromptInputActionMenu>

              <PromptInputButton
                onClick={() => setWebSearch(!webSearch)}
                variant={webSearch ? "default" : "ghost"}
              >
                <GlobeIcon size={16} />
                <span>Search</span>
              </PromptInputButton>

              <PromptInputSelect
                onValueChange={(value) => {
                  setModel(value);
                }}
                value={model}
              >
                <PromptInputSelectTrigger>
                  <PromptInputSelectValue />
                </PromptInputSelectTrigger>
                <PromptInputSelectContent>
                  {models.map((model) => (
                    <PromptInputSelectItem
                      key={model.value}
                      value={model.value}
                    >
                      {model.name}
                    </PromptInputSelectItem>
                  ))}
                </PromptInputSelectContent>
              </PromptInputSelect>
            </PromptInputTools>

            <PromptInputSubmit
              disabled={!input && status !== "streaming"}
              status={status}
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
};

export default ChatBotDemo;
