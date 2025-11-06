"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { GitBranch, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";

interface SferaMessageProps {
  message: {
    id: string;
    content: string;
    userId: string;
    userEmail: string;
    isForked: boolean;
    forkedSferaId: string | null;
    createdAt: Date;
  };
  sferaId: string;
  onFork?: (messageId: string) => void;
}

export function SferaMessage({ message, sferaId, onFork }: SferaMessageProps) {
  const router = useRouter();
  const [isForking, setIsForking] = useState(false);

  const handleFork = async () => {
    if (isForking || message.isForked) return;

    setIsForking(true);
    try {
      const response = await fetch(`/api/sfera/${sferaId}/fork`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: message.id }),
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.forkedSferaId) {
          // Fork already exists, navigate to it
          router.push(`/sfera/${data.forkedSferaId}`);
          return;
        }
        throw new Error(data.error || "Failed to create fork");
      }

      const data = await response.json();

      // Notify parent
      onFork?.(message.id);

      // Navigate to the forked Sfera
      router.push(`/sfera/${data.sfera.id}`);
    } catch (error) {
      console.error("Error creating fork:", error);
      alert(error instanceof Error ? error.message : "Failed to create fork");
    } finally {
      setIsForking(false);
    }
  };

  const handleEnterFork = () => {
    if (message.forkedSferaId) {
      router.push(`/sfera/${message.forkedSferaId}`);
    }
  };

  return (
    <div className="group relative rounded-lg border border-border bg-background p-4 transition-colors hover:border-primary/50">
      {/* Message Header */}
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          <span className="font-medium">{message.userEmail}</span>
          <span className="mx-2">•</span>
          <span>{new Date(message.createdAt).toLocaleString()}</span>
        </div>

        {message.isForked && (
          <div className="flex items-center gap-1 text-xs text-primary">
            <GitBranch className="h-3 w-3" />
            <span>Forked</span>
          </div>
        )}
      </div>

      {/* Message Content */}
      <div className="mb-3 whitespace-pre-wrap text-foreground">
        {message.content}
      </div>

      {/* Fork Actions */}
      <div className="flex justify-end gap-2">
        {!message.isForked && (
          <div className="opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              variant="outline"
              size="sm"
              onClick={handleFork}
              disabled={isForking}
              className="gap-2"
            >
              <GitBranch className="h-4 w-4" />
              {isForking ? "Creating Fork..." : "Fork Sfera"}
            </Button>
          </div>
        )}

        {message.isForked && message.forkedSferaId && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={handleEnterFork}
          >
            <LogIn className="h-4 w-4" />
            Enter Forked Sfera
          </Button>
        )}
      </div>
    </div>
  );
}
