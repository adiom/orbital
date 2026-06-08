"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import type { PromptInputMessage } from "@/components/elements/prompt-input";
import { SferaMessage } from "@/components/sfera/sfera-message";
import { SferaPromptInput } from "@/components/sfera/sfera-prompt-input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ui/shadcn-io/ai/conversation";

type SferaMember = {
  userId: string;
  email: string;
  role: string;
  joinedAt: Date;
};

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
  initialMessages?: any[];
  initialMembers?: SferaMember[];
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
  initialMembers = [],
}: SferaChatClientProps) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [messages, setMessages] = useState(initialMessages);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (message: PromptInputMessage) => {
    if (!message.text?.trim()) {
      return;
    }

    setIsLoading(true);

    try {
      // Add user message optimistically
      const userMessage = {
        id: crypto.randomUUID(),
        role: "user" as const,
        content: message.text,
        experimental_data: {
          userId: currentUserId,
          createdAt: new Date().toISOString(),
          attachments: message.files,
        },
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");

      // Send to API
      const response = await fetch(`/api/sfera/${sferaId}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          sferaId,
          currentUserId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      // Refresh to get AI responses
      router.refresh();
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("Не удалось отправить сообщение");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (value: string) => {
    setInput(value);
  };

  // Action handlers
  const handleRetry = () => {
    toast.info("Повторная генерация будет реализована в следующей версии");
  };

  const handleEdit = () => {
    toast.info("Редактирование будет реализовано в следующей задаче");
  };

  const handleDelete = (messageId: string) => {
    setMessageToDelete(messageId);
  };

  const confirmDelete = async () => {
    if (!messageToDelete) return;

    try {
      const response = await fetch(
        `/api/sfera/${sferaId}/messages/${messageToDelete}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete message");
      }

      toast.success("Сообщение удалено");
      router.refresh();
    } catch (error) {
      console.error("Failed to delete message:", error);
      toast.error(
        error instanceof Error ? error.message : "Не удалось удалить сообщение"
      );
    } finally {
      setMessageToDelete(null);
    }
  };

  const handleFork = async (messageId: string) => {
    try {
      const response = await fetch(`/api/sfera/${sferaId}/fork`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messageId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fork message");
      }

      const data = await response.json();
      toast.success("Сообщение форкнуто!");
      router.push(`/sfera/${data.sfera.id}/chat`);
    } catch (error) {
      console.error("Failed to fork message:", error);
      toast.error(
        error instanceof Error ? error.message : "Не удалось форкнуть сообщение"
      );
    }
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
              messages.map((message: any) => (
                <SferaMessage
                  key={message.id}
                  currentUserId={currentUserId}
                  message={message}
                  onRetry={handleRetry}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onFork={handleFork}
                />
              ))
            )}
          </div>
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* Input Area */}
      <div className="border-t bg-background p-4">
        <div className="mx-auto max-w-4xl">
          <SferaPromptInput
            value={input}
            onChange={handleInputChange}
            onSubmit={handleSubmit}
            placeholder="Введите сообщение..."
            isLoading={isLoading}
            currentUserId={currentUserId}
            members={initialMembers}
          />
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {/* Delete Confirmation Dialog */}
      <AlertDialog
        onOpenChange={() => {
          setMessageToDelete(null);
        }}
        open={!!messageToDelete}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить сообщение?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Сообщение будет удалено навсегда.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
