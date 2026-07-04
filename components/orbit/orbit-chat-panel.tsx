"use client";

import { Maximize2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { OrbitInput } from "./orbit-input";
import { OrbitMessage } from "./orbit-message";

type Attachment = {
  name: string;
  url: string;
  contentType: string;
};

type Message = {
  id: string;
  content: string;
  userId: string;
  userEmail: string;
  parentMessageId: string | null;
  attachments?: Attachment[];
  toolResults?: Record<string, unknown>[];
  isForked: boolean;
  forkedSferaId: string | null;
  isGenerating?: boolean;
  isPending?: boolean;
  createdAt: Date;
};

type OrbitData = {
  id: string;
  title: string;
  description: string | null;
  visibility: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
};

type OrbitChatPanelProps = {
  orbitId: string;
  currentUserId?: string;
  onClose: () => void;
  onGoFullScreen: (id: string) => void;
};

export function OrbitChatPanel({
  orbitId,
  currentUserId,
  onClose,
  onGoFullScreen,
}: OrbitChatPanelProps) {
  const [orbit, setOrbit] = useState<OrbitData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch(`/api/sfera/${orbitId}`, { signal });
      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(
          (errorPayload as { error?: string }).error || "Failed to fetch orbit"
        );
      }
      const rawData: unknown = await response.json();
      if (!rawData || typeof rawData !== "object") {
        throw new Error("Invalid response");
      }

      const {
        sfera: rawOrbit,
        messages: rawMessages,
      } = rawData as Record<string, unknown>;

      setOrbit(rawOrbit as OrbitData);
      setMessages(
        Array.isArray(rawMessages)
          ? (rawMessages as Message[]).reverse()
          : []
      );
    } catch (err) {
      if (signal?.aborted) return;
      console.error("Error fetching orbit:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load orbit"
      );
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, [orbitId]);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  const handleFork = useCallback(() => {
    fetchData();
  }, [fetchData]);

  const handleDeleteMessage = useCallback(async (message: Message) => {
    try {
      const response = await fetch(
        `/api/sfera/${orbitId}/messages/${message.id}`,
        { method: "DELETE" }
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete message");
      }
      setMessages((prev) => prev.filter((m) => m.id !== message.id));
    } catch (err) {
      console.error("Error deleting message:", err);
    }
  }, [orbitId]);

  const handleReply = useCallback(() => {}, []);

  const handleEdit = useCallback(() => {}, []);

  const handleMessageSent = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div
      className="animate-slide-in-right fixed right-0 top-0 z-50 flex h-full w-1/2 flex-col border-l border-white/70 bg-white/95 shadow-xl backdrop-blur-2xl"
      style={{
        boxShadow:
          "0 25px 50px -12px rgba(15, 23, 42, 0.15), -8px 0 30px rgba(15, 23, 42, 0.05)",
      }}
    >
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-white/80 px-4 backdrop-blur-xl">
        <div className="min-w-0 flex-1">
          {isLoading ? (
            <div className="h-4 w-32 animate-pulse rounded bg-neutral-100" />
          ) : (
            <>
              <h2 className="truncate font-medium text-sm text-neutral-950">
                {orbit?.title || "Orbit"}
              </h2>
              {orbit?.description && (
                <p className="truncate text-[11px] text-neutral-400">
                  {orbit.description}
                </p>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            onClick={() => onGoFullScreen(orbitId)}
            size="sm"
            variant="ghost"
            className="gap-1.5 text-[11px] text-neutral-400 hover:text-neutral-700"
          >
            <Maximize2 className="h-3 w-3" />
            Полный экран
          </Button>
          <Button
            onClick={onClose}
            size="icon"
            variant="ghost"
            className="size-9 text-neutral-400 hover:text-neutral-700"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse space-y-2">
                <div className="h-3 w-16 rounded bg-neutral-100" />
                <div className="h-10 rounded-2xl bg-neutral-100" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-neutral-500">{error}</p>
              <Button
                onClick={() => fetchData()}
                variant="ghost"
                size="sm"
                className="mt-2 text-[11px] text-neutral-400"
              >
                Попробовать снова
              </Button>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-neutral-500">
                Начните разговор
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => {
              const parentMessage = message.parentMessageId
                ? messages.find((m) => m.id === message.parentMessageId)
                : null;

              return (
                <OrbitMessage
                  key={message.id}
                  canModerate={
                    currentUserId === orbit?.ownerId
                  }
                  currentUserId={currentUserId}
                  message={message}
                  onDelete={() => handleDeleteMessage(message)}
                  onEdit={handleEdit}
                  onFork={handleFork}
                  onReply={handleReply}
                  orbitId={orbitId}
                  parentMessage={parentMessage}
                />
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-border bg-white/80 p-3 backdrop-blur-xl">
        <OrbitInput
          onCancelEdit={() => {}}
          onCancelReply={() => {}}
          onMessageSent={handleMessageSent}
          orbitId={orbitId}
        />
      </div>
    </div>
  );
}
