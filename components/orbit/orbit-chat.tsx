"use client";

import {
  ChevronRight,
  Loader2,
  Menu,
  PenSquare,
  Settings,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { OrbitSettings } from "./orbit-settings";
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
  toolResults?: Array<Record<string, unknown>>;
  isForked: boolean;
  forkedSferaId: string | null;
  createdAt: Date;
};

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

const parseAttachments = (value: unknown): Attachment[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;
      const name = record.name;
      const url = record.url;
      const contentType = record.contentType;

      if (
        typeof name !== "string" ||
        typeof url !== "string" ||
        typeof contentType !== "string"
      ) {
        return null;
      }

      return { name, url, contentType } satisfies Attachment;
    })
    .filter((attachment): attachment is Attachment => attachment !== null);
};

const parseMessage = (value: unknown): Message | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;

  const id = record.id;
  const content = record.content;
  const userId = record.userId;
  const userEmail = record.userEmail;
  const parentMessageId = record.parentMessageId;
  const isForked = record.isForked;
  const forkedSferaId = record.forkedSferaId;
  const createdAt = record.createdAt;

  if (
    !isNonEmptyString(id) ||
    typeof content !== "string" ||
    !isNonEmptyString(userId) ||
    typeof userEmail !== "string" ||
    (parentMessageId !== null && !isNonEmptyString(parentMessageId)) ||
    typeof isForked !== "boolean" ||
    !(createdAt instanceof Date || typeof createdAt === "string")
  ) {
    return null;
  }

  return {
    id,
    content,
    userId,
    userEmail,
    parentMessageId:
      typeof parentMessageId === "string" ? parentMessageId : null,
    attachments: parseAttachments(record.attachments),
    toolResults: Array.isArray(record.toolResults)
      ? (record.toolResults as Array<Record<string, unknown>>)
      : undefined,
    isForked,
    forkedSferaId: typeof forkedSferaId === "string" ? forkedSferaId : null,
    createdAt:
      createdAt instanceof Date && !Number.isNaN(createdAt.getTime())
        ? createdAt
        : new Date(createdAt as string),
  } satisfies Message;
};

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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [isAvroraThinking, setIsAvroraThinking] = useState(false);

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
        setMessages(
          Array.isArray(rawMessages)
            ? rawMessages
                .map((message) => parseMessage(message))
                .filter((message): message is Message => message !== null)
                .reverse()
            : []
        );
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

  const handleMessageSent = () => {
    setReplyingTo(null);
    setEditingMessage(null);
    setIsAvroraThinking(false);
    fetchOrbit();
  };

  const handleAvroraThinking = () => {
    setIsAvroraThinking(true);
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
      router.push("/orbits");
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
      <div className="flex h-full items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-blue-500" />
          <p className="text-gray-500 text-sm">Loading orbit...</p>
        </div>
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
            This orbit may have been deleted or you don't have access
          </p>
          <Button
            className="mt-6"
            onClick={() => router.push("/orbits")}
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
      <header className="fixed top-0 right-0 left-0 z-20 border-gray-200/50 border-b bg-white/80 shadow-sm backdrop-blur-xl">
        <div className="flex h-16 items-center px-6">
          <div className="flex w-full items-center justify-between">
            <Button
              className="h-10 w-10 rounded-full transition-all hover:bg-gray-100"
              onClick={() => router.push("/orbits")}
              size="icon"
              variant="ghost"
            >
              <Menu className="h-5 w-5 text-gray-700" />
              <span className="sr-only">Menu</span>
            </Button>

            <div className="flex flex-col items-center">
              {parentOrbit && (
                <button
                  className="flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-blue-600 text-xs transition-all hover:bg-blue-100 hover:text-blue-700"
                  onClick={() => router.push(`/orbit/${parentOrbit.id}`)}
                  type="button"
                >
                  <span className="font-medium">{parentOrbit.title}</span>
                  <ChevronRight className="h-3 w-3" />
                </button>
              )}
              <h1 className="mt-1 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text font-semibold text-lg text-transparent">
                {orbit.title}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              {isOwnerOrAdmin && (
                <>
                  <Button
                    className="h-10 w-10 rounded-full transition-all hover:bg-gray-100"
                    onClick={() => setIsSettingsOpen(true)}
                    size="icon"
                    variant="ghost"
                  >
                    <Settings className="h-5 w-5 text-gray-700" />
                    <span className="sr-only">Settings</span>
                  </Button>
                  {orbit?.ownerId === currentUserId && (
                    <Button
                      className="h-10 w-10 rounded-full text-red-500 transition-all hover:bg-red-50 hover:text-red-600"
                      onClick={() => setIsDeleteDialogOpen(true)}
                      size="icon"
                      variant="ghost"
                    >
                      <Trash2 className="h-5 w-5" />
                      <span className="sr-only">Delete Orbit</span>
                    </Button>
                  )}
                </>
              )}
              <Button
                className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg transition-all hover:shadow-xl"
                onClick={() => router.push("/orbits/new")}
                size="icon"
                variant="ghost"
              >
                <PenSquare className="h-5 w-5" />
                <span className="sr-only">New Orbit</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-grow overflow-y-auto px-4 pt-20 pb-40 md:px-8">
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
              {messages.map((message) => {
                const parentMessage = message.parentMessageId
                  ? messages.find((m) => m.id === message.parentMessageId)
                  : null;

                return (
                  <OrbitMessage
                    canModerate={Boolean(isOwnerOrAdmin)}
                    currentUserId={currentUserId}
                    key={message.id}
                    message={message}
                    onDelete={() => handleDeleteMessage(message)}
                    onEdit={() => handleEditMessage(message)}
                    onFork={handleFork}
                    onReply={() => setReplyingTo(message)}
                    orbitId={orbitId}
                    parentMessage={parentMessage}
                  />
                );
              })}

              {/* Avrora thinking indicator */}
              {isAvroraThinking && (
                <article className="group relative mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="relative overflow-hidden rounded-3xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-5 shadow-sm">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-gray-500 text-xs">
                        <div className="flex items-center gap-1 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 px-2.5 py-1">
                          <Sparkles className="h-3 w-3 text-white" />
                          <span className="font-semibold text-white">
                            Avrora AI
                          </span>
                        </div>
                        <span className="font-medium text-blue-700">
                          avrora@avrora.click
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-blue-700">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-[15px] italic">думает...</span>
                    </div>
                  </div>
                </article>
              )}
            </>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="fixed right-0 bottom-0 left-0 border-gray-200/50 border-t bg-white/80 p-4 backdrop-blur-xl md:p-6">
        <div className="mx-auto max-w-4xl">
          <OrbitInput
            editingMessage={editingMessage}
            onCancelEdit={() => setEditingMessage(null)}
            onCancelReply={() => setReplyingTo(null)}
            onMessageSent={handleMessageSent}
            onAvroraThinking={handleAvroraThinking}
            orbitId={orbitId}
            replyingTo={replyingTo}
          />
        </div>
      </div>

      {/* Settings Dialog */}
      {orbit && (
        <>
          <OrbitSettings
            currentDescription={orbit.description}
            currentMembers={members}
            currentTitle={orbit.title}
            isOpen={isSettingsOpen}
            isOwner={orbit.ownerId === currentUserId}
            onClose={() => setIsSettingsOpen(false)}
            onUpdate={handleSettingsUpdate}
            orbitId={orbitId}
          />

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
        </>
      )}
    </div>
  );
}
