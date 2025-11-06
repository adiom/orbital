"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";

interface SferaMessageInputProps {
  sferaId: string;
  onMessageSent?: () => void;
}

export function SferaMessageInput({
  sferaId,
  onMessageSent,
}: SferaMessageInputProps) {
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim() || isSending) return;

    setIsSending(true);
    try {
      const response = await fetch(`/api/sfera/${sferaId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      setContent("");
      onMessageSent?.();
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write your message... (tip: any message can be forked into a new chat)"
        className="min-h-[100px] resize-none"
        disabled={isSending}
      />
      <div className="flex justify-end">
        <Button type="submit" disabled={!content.trim() || isSending}>
          <Send className="mr-2 h-4 w-4" />
          {isSending ? "Sending..." : "Send Message"}
        </Button>
      </div>
    </form>
  );
}
