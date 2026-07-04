"use client";

import { DefaultChatTransport, isTextUIPart, isToolUIPart, type UIMessage } from "ai";
import { Loader2, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type OrbitAiPanelInputProps = {
  orbitId: string;
  onStreamSaved?: () => Promise<void> | void;
};

function getMessageText(message: UIMessage) {
  return message.parts
    .filter(isTextUIPart)
    .map((part) => part.text)
    .join("\n")
    .trim();
}

export function OrbitAiPanelInput({ orbitId, onStreamSaved }: OrbitAiPanelInputProps) {
  const [input, setInput] = useState("");

  const transport = useMemo(
    () =>
      new DefaultChatTransport<UIMessage>({
        api: `/api/sfera/${orbitId}/panel-chat`,
        credentials: "include",
      }),
    [orbitId],
  );

  const { messages, sendMessage, setMessages, status, error, stop } = useChat<UIMessage>({
    transport,
    onFinish: async () => {
      await onStreamSaved?.();
      setMessages([]);
    },
  });

  const isStreaming = status === "submitted" || status === "streaming";

  const handleSubmit = async () => {
    const text = input.trim();
    if (!text || isStreaming) {
      return;
    }

    setInput("");
    await sendMessage({ text });
  };

  const previewMessages = messages.filter(
    (message) =>
      getMessageText(message).length > 0 || message.parts.some(isToolUIPart),
  );

  return (
    <div className="space-y-3 rounded-2xl border border-violet-200/70 bg-violet-50/70 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-violet-600">
          <Sparkles className="size-3.5" />
          Avrora
        </div>
        {isStreaming ? (
          <button
            className="text-[11px] text-violet-500 transition hover:text-violet-700"
            onClick={stop}
            type="button"
          >
            Stop
          </button>
        ) : null}
      </div>

      {previewMessages.length > 0 ? (
        <div className="space-y-2 rounded-xl border border-violet-200/60 bg-white/70 p-3">
          {previewMessages.map((message) => {
            const text = getMessageText(message);
            const toolParts = message.parts.filter(isToolUIPart);

            return (
              <div
                className={cn(
                  "space-y-1 rounded-xl px-3 py-2 text-sm",
                  message.role === "user"
                    ? "bg-neutral-900 text-white"
                    : "bg-violet-100/80 text-neutral-900",
                )}
                key={message.id}
              >
                <div className="text-[10px] uppercase tracking-[0.18em] opacity-70">
                  {message.role === "user" ? "You" : "Avrora"}
                </div>
                {text ? <div className="whitespace-pre-wrap leading-6">{text}</div> : null}
                {toolParts.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {toolParts.map((part, index) => (
                      <span
                        className="rounded-full border border-violet-300/70 bg-violet-50 px-2 py-1 text-[11px] text-violet-700"
                        key={`${message.id}-${index}`}
                      >
                        {part.type === "dynamic-tool"
                          ? part.toolName
                          : part.type.replace(/^tool-/, "")}{" "}
                        {part.state}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="space-y-2">
        <Textarea
          className="min-h-[96px] resize-none border-violet-200/70 bg-white/90 focus-visible:ring-violet-300"
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void handleSubmit();
            }
          }}
          placeholder="Спросить Avrora, попросить mini-app, chart или идею..."
          value={input}
        />

        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] leading-5 text-violet-600/80">
            Avrora видит контекст объекта и может собрать app, chart или короткую подсказку.
          </p>
          <Button
            className="rounded-full bg-violet-600 text-white hover:bg-violet-700"
            disabled={isStreaming || input.trim().length === 0}
            onClick={() => void handleSubmit()}
            type="button"
          >
            {isStreaming ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Ask
          </Button>
        </div>

        {error ? (
          <p className="text-[12px] text-red-600">{error.message}</p>
        ) : null}
      </div>
    </div>
  );
}
