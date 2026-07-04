"use client";

import {
  Copy,
  GitBranch,
  Loader2,
  LogIn,
  PenSquare,
  Reply,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { SferaMessage } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { useWebSocket } from "@/lib/websocket/use-websocket";

type Message = SferaMessage & {
  userEmail: string;
  forkedSferaId?: string | null;
};

type SferaGroupChatProps = {
  sferaId: string;
  currentUserId?: string;
  token?: string;
  canModerate?: boolean;
};

export function SferaGroupChat({
  sferaId,
  currentUserId,
  token,
  canModerate = false,
}: SferaGroupChatProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
    null
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // WebSocket connection
  const { isConnected, sendChatMessage } = useWebSocket({
    chatId: sferaId,
    token,
    onMessage: (wsMessage) => {
      if (wsMessage.type === "chat_message") {
        const newMessage = wsMessage.message as Message;
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMessage.id)) {
            return prev;
          }
          return [...prev, newMessage];
        });
      } else if (wsMessage.type === "message_update") {
        const updatedMessage = wsMessage.message as Message;
        setMessages((prev) =>
          prev.map((m) => (m.id === updatedMessage.id ? updatedMessage : m))
        );
      }
    },
  });

  // Fetch initial messages
  const fetchMessages = useCallback(async () => {
    try {
      const response = await fetch(`/api/sfera/${sferaId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch messages");
      }
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error("Failed to load messages");
    } finally {
      setIsLoading(false);
    }
  }, [sferaId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send or edit message
  const handleSend = async () => {
    const content = input.trim();
    if (!content || isSending) return;

    setIsSending(true);
    const originalInput = input;
    setInput("");

    try {
      if (editingMessage) {
        const response = await fetch(
          `/api/sfera/${sferaId}/messages/${editingMessage.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to edit message");
        }

        const data = await response.json();
        setMessages((prev) =>
          prev.map((m) => (m.id === editingMessage.id ? data.message : m))
        );
        setEditingMessage(null);
        toast.success("Message updated");
      } else {
        const response = await fetch(`/api/sfera/${sferaId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content,
            parentMessageId: replyingTo?.id,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to send message");
        }

        const data = await response.json();

        if (data.message) {
          setMessages((prev) => [...prev, data.message]);
        }

        if (isConnected && data.message) {
          sendChatMessage(data.message.id, content);
        }

        setReplyingTo(null);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error(
        editingMessage ? "Failed to edit message" : "Failed to send message"
      );
      setInput(originalInput);
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
  };

  // Fork message
  const handleFork = async (messageId: string) => {
    try {
      const response = await fetch(`/api/sfera/${sferaId}/fork`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId }),
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.forkedSferaId) {
          router.push(`/${data.forkedSferaId}`);
          return;
        }
        throw new Error(data.error || "Failed to fork");
      }

      const data = await response.json();
      router.push(`/${data.sfera.id}`);
      toast.success("Forked successfully!");
    } catch (error) {
      console.error("Error forking:", error);
      toast.error(error instanceof Error ? error.message : "Failed to fork");
    }
  };

  // Delete message
  const handleDelete = async (messageId: string) => {
    if (!window.confirm("Delete this message?")) return;

    try {
      const response = await fetch(
        `/api/sfera/${sferaId}/messages/${messageId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete");
      }

      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      toast.success("Message deleted");
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete");
    }
  };

  // Copy message link
  const handleCopy = (messageId: string) => {
    router.push(`/${sferaId}/${messageId}`);
    toast.success("Message link copied");
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Memoize parent message lookup
  const getParentMessage = useMemo(() => {
    const messageMap = new Map(messages.map((m) => [m.id, m]));
    return (parentId: string | null) =>
      parentId ? messageMap.get(parentId) : null;
  }, [messages]);

  // Check permissions
  const canEditMessage = useCallback(
    (message: Message) =>
      canModerate || (!!currentUserId && currentUserId === message.userId),
    [canModerate, currentUserId]
  );

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Sparkles className="mx-auto mb-3 h-12 w-12 text-gray-300" />
              <p className="text-gray-500 text-sm">No messages yet</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => {
              const parentMessage = getParentMessage(message.parentMessageId);
              const isSelected = selectedMessageId === message.id;
              const isOwn = message.userId === currentUserId;

              return (
                <div className="group" key={message.id}>
                  {/* Parent indicator */}
                  {parentMessage && (
                    <div className="mb-2 ml-4 border-gray-300 border-l-2 pl-3 text-gray-500 text-xs">
                      <div className="font-medium">
                        {parentMessage.userEmail}
                      </div>
                      <div className="line-clamp-2">
                        {parentMessage.content}
                      </div>
                    </div>
                  )}

                  {/* Message bubble */}
                  <button
                    className={cn(
                      "relative w-full cursor-pointer rounded-2xl border-2 px-4 py-3 text-left shadow-sm transition-all",
                      isOwn
                        ? "border-blue-200 bg-blue-50"
                        : "border-gray-200 bg-white",
                      isSelected && "shadow-md ring-2 ring-gray-300",
                      message.isForked && "border-gray-400"
                    )}
                    onClick={() =>
                      setSelectedMessageId(isSelected ? null : message.id)
                    }
                    type="button"
                  >
                    {/* Forked badge */}
                    {message.isForked && (
                      <div className="absolute top-0 right-0 rounded-tr-xl rounded-bl-xl bg-gray-700 px-2 py-1">
                        <div className="flex items-center gap-1 text-white text-xs">
                          <GitBranch className="h-3 w-3" />
                          <span>Forked</span>
                        </div>
                      </div>
                    )}

                    {/* Header */}
                    <div className="mb-2 flex items-center gap-2 text-xs">
                      <span className="font-medium text-gray-700">
                        {message.userEmail}
                      </span>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-500">
                        {new Date(message.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="whitespace-pre-wrap break-words text-gray-900 text-sm leading-relaxed">
                      {message.isGenerating && !message.content ? (
                        <div className="flex items-center gap-2 text-gray-500">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="italic">Generating...</span>
                        </div>
                      ) : (
                        message.content
                      )}
                    </div>

                    {/* Actions */}
                    {isSelected && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-gray-600 text-xs hover:bg-gray-200"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(message.id);
                          }}
                          type="button"
                        >
                          <Copy className="h-3 w-3" />
                          Copy
                        </button>

                        <button
                          className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-gray-600 text-xs hover:bg-gray-200"
                          onClick={(e) => {
                            e.stopPropagation();
                            setReplyingTo(message);
                            setSelectedMessageId(null);
                            textareaRef.current?.focus();
                          }}
                          type="button"
                        >
                          <Reply className="h-3 w-3" />
                          Reply
                        </button>

                        {message.isForked && message.forkedSferaId ? (
                          <button
                            className="flex items-center gap-1 rounded-full bg-gray-700 px-2.5 py-1 text-white text-xs hover:bg-gray-800"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/${message.forkedSferaId}`);
                            }}
                            type="button"
                          >
                            <LogIn className="h-3 w-3" />
                            Enter Fork
                          </button>
                        ) : (
                          <button
                            className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-gray-600 text-xs hover:bg-gray-200"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFork(message.id);
                            }}
                            type="button"
                          >
                            <GitBranch className="h-3 w-3" />
                            Fork
                          </button>
                        )}

                        {canEditMessage(message) && (
                          <>
                            <button
                              className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-gray-600 text-xs hover:bg-gray-200"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingMessage(message);
                                setInput(message.content);
                                setSelectedMessageId(null);
                                textareaRef.current?.focus();
                              }}
                              type="button"
                            >
                              <PenSquare className="h-3 w-3" />
                              Edit
                            </button>

                            <button
                              className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-gray-600 text-xs hover:bg-gray-200 disabled:opacity-50"
                              disabled={message.isForked}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(message.id);
                              }}
                              title={
                                message.isForked
                                  ? "Cannot delete forked message"
                                  : undefined
                              }
                              type="button"
                            >
                              <Trash2 className="h-3 w-3" />
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </button>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-gray-200 border-t bg-white p-4">
        {/* Reply/Edit indicator */}
        {(replyingTo || editingMessage) && (
          <div className="mb-2 flex items-center justify-between rounded-lg bg-gray-100 px-3 py-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-gray-600 text-xs">
                {editingMessage ? (
                  <>
                    <PenSquare className="h-3 w-3" />
                    <span>Editing message</span>
                  </>
                ) : (
                  <>
                    <Reply className="h-3 w-3" />
                    <span>Replying to {replyingTo?.userEmail}</span>
                  </>
                )}
              </div>
              <div className="mt-1 line-clamp-1 text-gray-500 text-xs">
                {editingMessage?.content || replyingTo?.content}
              </div>
            </div>
            <button
              className="text-gray-400 hover:text-gray-600"
              onClick={() => {
                setReplyingTo(null);
                setEditingMessage(null);
                setInput("");
              }}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="flex gap-2">
          <Textarea
            className="max-h-32 min-h-[44px] resize-none"
            disabled={isSending}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              editingMessage
                ? "Edit message..."
                : replyingTo
                  ? "Write a reply..."
                  : "Type a message..."
            }
            ref={textareaRef}
            rows={1}
            value={input}
          />
          <Button
            disabled={!input.trim() || isSending}
            onClick={handleSend}
            size="icon"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        {isConnected && (
          <div className="mt-2 text-green-600 text-xs">● Connected</div>
        )}
      </div>
    </div>
  );
}
