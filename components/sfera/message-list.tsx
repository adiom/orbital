"use client";

import React, { useEffect, useRef } from "react";
import { TypingIndicator } from "@/components/sfera/typing-indicator";
import { cn } from "@/lib/utils";


export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  experimental_data?: Record<string, any>;
};

interface MessageListProps {
  messages: Message[];
  onRetry?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onFork?: (id: string) => void;
  currentUserId?: string;
}

/**
 * MessageList – scrollable, flex‑col‑reverse container.
 * Mobile‑first: full width, no side padding. Desktop: padded via parent.
 */
export function MessageList({
  messages,
  onRetry,
  onEdit,
  onDelete,
  onFork,
  currentUserId,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className={cn("flex-1 overflow-y-auto flex flex-col-reverse space-y-2 p-2 sm:p-4")}>
      <div ref={bottomRef} />
      {messages.map((msg) => (
        <SferaMessage
          key={msg.id}
          message={msg}
          currentUserId={currentUserId}
          onRetry={onRetry}
          onEdit={onEdit}
          onDelete={onDelete}
          onFork={onFork}
        />
      ))}
      {/* Typing indicator if any generating message */}
      {messages.some(m => m.experimental_data?.isGenerating) && (
        <TypingIndicator />
      )}
    </div>
  );
}

// NOTE: SferaMessage is imported from the existing component file.
import { SferaMessage } from "@/components/sfera/sfera-message";
