"use client";

import { useEffect, useState } from "react";
import { SferaMessage } from "./SferaMessage";
import { SferaMessageInput } from "./SferaMessageInput";
import { Loader2, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

interface Message {
  id: string;
  content: string;
  userId: string;
  userEmail: string;
  isForked: boolean;
  forkedSferaId: string | null;
  createdAt: Date;
}

interface SferaData {
  id: string;
  title: string;
  description: string | null;
  visibility: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ParentSfera {
  id: string;
  title: string;
}

interface SferaChatProps {
  sferaId: string;
}

export function SferaChat({ sferaId }: SferaChatProps) {
  const router = useRouter();
  const [sfera, setSfera] = useState<SferaData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [parentSfera, setParentSfera] = useState<ParentSfera | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSfera = async () => {
    try {
      const response = await fetch(`/api/sfera/${sferaId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch sfera");
      }
      const data = await response.json();
      setSfera(data.sfera);
      setMessages(data.messages || []);
      setParentSfera(data.parentSfera || null);
    } catch (error) {
      console.error("Error fetching sfera:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSfera();
  }, [sferaId]);

  const handleMessageSent = () => {
    // Refresh messages
    fetchSfera();
  };

  const handleFork = (messageId: string) => {
    // Refresh to update fork count
    fetchSfera();
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!sfera) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Sfera not found</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header with Breadcrumb */}
      <div className="border-b border-border bg-background p-4">
        {parentSfera && (
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <button
              onClick={() => router.push(`/sfera/${parentSfera.id}`)}
              className="hover:text-foreground hover:underline"
            >
              {parentSfera.title}
            </button>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground">Forked Discussion</span>
          </div>
        )}
        <h1 className="text-2xl font-bold">{sfera.title}</h1>
        {sfera.description && (
          <p className="mt-1 text-sm text-muted-foreground">
            {sfera.description}
          </p>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-muted-foreground">
                No messages yet. Start the discussion!
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <SferaMessage
                key={message.id}
                message={message}
                sferaId={sferaId}
                onFork={handleFork}
              />
            ))
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border bg-background p-4">
        <SferaMessageInput
          sferaId={sferaId}
          onMessageSent={handleMessageSent}
        />
      </div>
    </div>
  );
}
