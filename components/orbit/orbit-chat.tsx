"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
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
import { Button } from "@/components/ui/button";
import { MessageRenderer } from "@/components/chat/message-renderer";
import { parseMessages, type Message } from "@/components/chat/shared-message-type";
import { OrbitInput } from "./orbit-input";
import { OrbitLoader } from "./orbit-loader";
import { OrbitPageHeader } from "./orbit-page-header";

type Member = {
  userId: string;
  email: string;
  role: string;
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

type ParentOrbit = {
  id: string;
  title: string;
};

type OrbitChatProps = {
  orbitId: string;
  currentUserId?: string;
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const parseMember = (value: unknown): Member | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const userId = record.userId;
  const email = record.email;
  const role = record.role;

  if (
    !isNonEmptyString(userId) ||
    typeof email !== "string" ||
    typeof role !== "string"
  ) {
    return null;
  }

  return { userId, email, role } satisfies Member;
};

const parseOrbitData = (value: unknown): OrbitData | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const id = record.id;
  const title = record.title;
  const description = record.description;
  const visibility = record.visibility;
  const ownerId = record.ownerId;
  const createdAt = record.createdAt;
  const updatedAt = record.updatedAt;

  if (
    !isNonEmptyString(id) ||
    typeof title !== "string" ||
    !isNonEmptyString(ownerId) ||
    typeof visibility !== "string" ||
    !(createdAt instanceof Date || typeof createdAt === "string") ||
    !(updatedAt instanceof Date || typeof updatedAt === "string")
  ) {
    return null;
  }

  return {
    id,
    title,
    description: typeof description === "string" ? description : null,
    visibility,
    ownerId,
    createdAt:
      createdAt instanceof Date && !Number.isNaN(createdAt.getTime())
        ? createdAt
        : new Date(createdAt as string),
    updatedAt:
      updatedAt instanceof Date && !Number.isNaN(updatedAt.getTime())
        ? updatedAt
        : new Date(updatedAt as string),
  } satisfies OrbitData;
};

const parseParentOrbit = (value: unknown): ParentOrbit | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const id = record.id;
  const title = record.title;

  if (!isNonEmptyString(id) || typeof title !== "string") {
    return null;
  }

  return { id, title } satisfies ParentOrbit;
};

export function OrbitChat({ orbitId, currentUserId }: OrbitChatProps) {
  const router = useRouter();
  const [orbit, setOrbit] = useState<OrbitData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [parentOrbit, setParentOrbit] = useState<ParentOrbit | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const NEAR_BOTTOM_THRESHOLD = 120;

  const fetchOrbit = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const response = await fetch(`/api/sfera/${orbitId}`, { signal });
        if (!response.ok) {
          const errorPayload = await response.json().catch(() => ({}));
          const errorMessage =
            (errorPayload as { error?: string }).error ||
            "Failed to fetch Orbit";
          throw new Error(errorMessage);
        }
        const rawData: unknown = await response.json();
        if (!rawData || typeof rawData !== "object") {
          throw new Error("Invalid Orbit response");
        }

        const {
          sfera: rawOrbit,
          messages: rawMessages,
          members: rawMembers,
          parentSfera: rawParentOrbit,
        } = rawData as Record<string, unknown>;

        setOrbit(parseOrbitData(rawOrbit));
        setMessages((prevMessages) => {
          // Parse new messages from server using shared parser
          const newMessages = parseMessages(rawMessages);

          // Find optimistic/generating messages that are not yet on server
          const newMessagesMap = new Map(newMessages.map((m) => [m.id, m]));
          const optimisticMessages = prevMessages.filter(
            (m) => (m.isPending || m.isGenerating) && !newMessagesMap.has(m.id)
          );

          // Merge server snapshots with optimistic agent placeholders so polling
          // can show streamed text without dropping local generating state.
          const previousById = new Map(prevMessages.map((m) => [m.id, m]));
          const mergedMessages = newMessages.map((message) => {
            const previous = previousById.get(message.id);

            if (!(previous?.isPending || previous?.isGenerating)) {
              return message;
            }

            return {
              ...message,
              isPending: message.isGenerating ? previous.isPending : false,
              isGenerating: message.isGenerating,
            };
          });

          return [...mergedMessages, ...optimisticMessages];
        });
        setMembers(
          Array.isArray(rawMembers)
            ? rawMembers
                .map((member) => parseMember(member))
                .filter((member): member is Member => member !== null)
            : []
        );
        setParentOrbit(parseParentOrbit(rawParentOrbit));
      } catch (error) {
        if (signal?.aborted) {
          return;
        }

        console.error("Error fetching Orbit:", error);
        toast.error(
          error instanceof Error ? error.message : "Failed to fetch Orbit"
        );
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [orbitId]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchOrbit(controller.signal);

    return () => {
      controller.abort();
    };
  }, [fetchOrbit]);

  // Poll for message updates when there are generating messages (exponential backoff)
  useEffect(() => {
    const hasGeneratingMessages = messages.some(
      (m) => (m as any).isGenerating === true
    );

    if (!hasGeneratingMessages) {
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout>;
    let pollCount = 0;
    const BASE_DELAY = 1000;
    const MAX_DELAY = 5000;

    const poll = () => {
      fetchOrbit();
      pollCount++;
      const delay = Math.min(BASE_DELAY * Math.pow(1.5, pollCount), MAX_DELAY);
      timeoutId = setTimeout(poll, delay);
    };

    timeoutId = setTimeout(poll, BASE_DELAY);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [messages, fetchOrbit]);

  // Track whether the user is scrolled near the bottom, so background
  // refetches (polling) don't yank them back down while they're reading
  // older messages further up.
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const distanceFromBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight;
      isNearBottomRef.current = distanceFromBottom < NEAR_BOTTOM_THRESHOLD;
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  // Auto-scroll to bottom when messages change, but only if the user was
  // already near the bottom (e.g. not while they've scrolled up to read
  // earlier messages during background polling).
  useEffect(() => {
    if (!isNearBottomRef.current) return;

    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Small delay to ensure DOM is updated
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [messages]);

  const handleMessageSent = (
    userMessage?: Message,
    agentMessages?: Message[]
  ) => {
    // Add user message optimistically if provided
    if (userMessage) {
      setMessages((prev) => [...prev, userMessage]);
    }

    // Add agent messages optimistically if provided
    if (agentMessages && agentMessages.length > 0) {
      setMessages((prev) => [...prev, ...agentMessages]);
    }

    setReplyingTo(null);
    setEditingMessage(null);

    // Fetch orbit in background to sync with server
    fetchOrbit();

    // Scroll to bottom immediately after sending
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleFork = (_messageId: string) => {
    fetchOrbit();
  };

  const handleSettingsUpdate = () => {
    fetchOrbit();
  };

  const handleEditMessage = (message: Message) => {
    setReplyingTo(null);
    setEditingMessage(message);
  };

  const handleDeleteMessage = async (message: Message) => {
    if (!window.confirm("Delete this message?")) {
      return;
    }

    try {
      const response = await fetch(
        `/api/sfera/${orbitId}/messages/${message.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete message");
      }

      toast.success("Message deleted");
      fetchOrbit();
    } catch (error) {
      console.error("Error deleting message:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete message"
      );
    }
  };

  const handleDeleteOrbit = async () => {
    if (!orbit) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/sfera/${orbitId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Failed to delete Orbit");
      }

      toast.success("Orbit deleted");
      setIsDeleteDialogOpen(false);
      router.push("/");
    } catch (error) {
      console.error("Error deleting Orbit:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete Orbit"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const isOwnerOrAdmin =
    orbit &&
    currentUserId &&
    members.some(
      (m) => m.userId === currentUserId && ["owner", "admin"].includes(m.role)
    );

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#fbfaf8]">
        <OrbitLoader label="орбита открывается" />
      </div>
    );
  }

  if (!orbit) {
    return (
      <div className="flex h-full items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <Sparkles className="mx-auto mb-4 h-16 w-16 text-gray-300" />
          <p className="font-medium text-gray-700 text-lg">Orbit not found</p>
          <p className="mt-2 text-gray-500 text-sm">
            This orbit may have been deleted or you don&apos;t have access
          </p>
          <Button
            className="mt-6"
            onClick={() => router.push("/")}
            variant="outline"
          >
            Back to Orbits
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
      {/* Header */}
      <OrbitPageHeader
        currentUserId={currentUserId}
        isOwnerOrAdmin={Boolean(isOwnerOrAdmin)}
        memberCount={members.length}
        members={members}
        onUpdate={handleSettingsUpdate}
        parentSfera={parentOrbit}
        sfera={{
          id: orbit.id,
          title: orbit.title,
          description: orbit.description,
          visibility: orbit.visibility as "public" | "private" | "dao",
          ownerId: orbit.ownerId,
        }}
      />

      {/* Messages */}
      <div
        className="flex-grow overflow-y-auto px-3 pt-[calc(3.5rem+env(safe-area-inset-top))] pb-40 md:px-8 md:pt-20"
        ref={messagesContainerRef}
      >
        <div className="mx-auto max-w-4xl">
          {messages.length === 0 ? (
            <div className="flex h-full min-h-[400px] items-center justify-center">
              <div className="text-center">
                <Sparkles className="mx-auto mb-4 h-20 w-20 text-gray-300" />
                <h2 className="mb-2 font-semibold text-gray-700 text-xl">
                  Start the conversation
                </h2>
                <p className="text-gray-500">
                  Be the first to share your thoughts in this orbit
                </p>
              </div>
            </div>
          ) : (
            <>
              {(() => {
                const parentMessageMap = new Map(
                  messages
                    .filter((m) => m.parentMessageId)
                    .map((m) => [
                      m.id,
                      messages.find((p) => p.id === m.parentMessageId),
                    ])
                );

                return messages.map((message) => (
                  <MessageRenderer
                    canModerate={Boolean(isOwnerOrAdmin)}
                    currentUserId={currentUserId}
                    key={message.id}
                    message={message}
                    onDelete={() => handleDeleteMessage(message)}
                    onEdit={() => handleEditMessage(message)}
                    onFork={handleFork}
                    onReply={() => setReplyingTo(message)}
                    orbitId={orbitId}
                    parentMessage={parentMessageMap.get(message.id) ?? null}
                  />
                ));
              })()}

              {/* Invisible anchor for auto-scroll */}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </div>

      {/* Input */}
      {/* 
        <div className="fixed right-0 bottom-0 left-0 border-gray-200/50 border-t bg-white/80 p-4 backdrop-blur-xl md:p-6">

        Параметры классов:
        - fixed — фиксирует элемент относительно окна просмотра.
        - right-0 — устанавливает правый отступ 0 (прижимает к правому краю экрана).
        - bottom-0 — прижимает к низу экрана.
        - left-0 — прижимает к левому краю экрана.
        - border-gray-200/50 — добавляет полупрозрачную (на 50%) серую (оттенок gray-200) рамку.
        - border-t — рисует только верхнюю границу у элемента.
        - bg-white/80 — белый фон с прозрачностью 80%.
        - p-4 — внутренние отступы (padding) по 1rem (обычно 16px) со всех сторон.
        - backdrop-blur-xl — добавляет сильное размытие фона под элементом (blur).
        - md:p-6 — увеличивает паддинг до 1.5rem (24px) на экранах ≥ md (medium breakpoint).

        Комбинация этих классов делает панель ввода фиксированной снизу, с размытием и прозрачным белым фоном, визуально отделяя её от остальной части интерфейса.
      */}
      <div className="fixed right-0 bottom-0 left-0 border-gray-200/50 border-t bg-white/80 p-0 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:p-1">
        <div className="mx-auto max-w-4xl">
          <OrbitInput
            editingMessage={editingMessage}
            onCancelEdit={() => setEditingMessage(null)}
            onCancelReply={() => setReplyingTo(null)}
            onMessageSent={handleMessageSent}
            orbitId={orbitId}
            replyingTo={replyingTo}
          />
        </div>
      </div>

      {/* Delete Dialog */}
      {orbit && (
        <AlertDialog
          onOpenChange={setIsDeleteDialogOpen}
          open={isDeleteDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Orbit</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. Deleting an Orbit removes all
                messages, members, and forks associated with it.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 text-white hover:bg-red-700"
                disabled={isDeleting}
                onClick={handleDeleteOrbit}
              >
                {isDeleting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting...
                  </span>
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
