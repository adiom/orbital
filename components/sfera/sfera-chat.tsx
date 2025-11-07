"use client";

import {
  ChevronRight,
  Loader2,
  Menu,
  PenSquare,
  Settings,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
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
import { SferaMessage } from "./sfera-message";
import { SferaPromptInput } from "./sfera-prompt-input";
import { SferaSettings } from "./sfera-settings";

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
  isForked: boolean;
  forkedSferaId: string | null;
  createdAt: Date;
};

type Member = {
  userId: string;
  email: string;
  role: string;
};

type SferaData = {
  id: string;
  title: string;
  description: string | null;
  visibility: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
};

type ParentSfera = {
  id: string;
  title: string;
};

type SferaChatProps = {
  sferaId: string;
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

const parseSferaData = (value: unknown): SferaData | null => {
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
  } satisfies SferaData;
};

const parseParentSfera = (value: unknown): ParentSfera | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const id = record.id;
  const title = record.title;

  if (!isNonEmptyString(id) || typeof title !== "string") {
    return null;
  }

  return { id, title } satisfies ParentSfera;
};

export function SferaChat({ sferaId, currentUserId }: SferaChatProps) {
  const router = useRouter();
  const [sfera, setSfera] = useState<SferaData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [parentSfera, setParentSfera] = useState<ParentSfera | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);

  const fetchSfera = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const response = await fetch(`/api/sfera/${sferaId}`, { signal });
        if (!response.ok) {
          const errorPayload = await response.json().catch(() => ({}));
          const errorMessage =
            (errorPayload as { error?: string }).error ||
            "Failed to fetch Sfera";
          throw new Error(errorMessage);
        }
        const rawData: unknown = await response.json();
        if (!rawData || typeof rawData !== "object") {
          throw new Error("Invalid Sfera response");
        }

        const {
          sfera: rawSfera,
          messages: rawMessages,
          members: rawMembers,
          parentSfera: rawParentSfera,
        } = rawData as Record<string, unknown>;

        setSfera(parseSferaData(rawSfera));
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
        setParentSfera(parseParentSfera(rawParentSfera));
      } catch (error) {
        if (signal?.aborted) {
          return;
        }

        console.error("Error fetching Sfera:", error);
        toast.error(
          error instanceof Error ? error.message : "Failed to fetch Sfera"
        );
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [sferaId]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchSfera(controller.signal);

    return () => {
      controller.abort();
    };
  }, [fetchSfera]);

  const handleMessageSent = () => {
    // Clear reply state and refresh messages
    setReplyingTo(null);
    setEditingMessage(null);
    fetchSfera();
  };

  const handleFork = (_messageId: string) => {
    // Refresh to update fork status
    fetchSfera();
  };

  const handleSettingsUpdate = () => {
    // Refresh after settings update
    fetchSfera();
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
        `/api/sfera/${sferaId}/messages/${message.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete message");
      }

      toast.success("Message deleted");
      fetchSfera();
    } catch (error) {
      console.error("Error deleting message:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete message"
      );
    }
  };

  const handleDeleteSfera = async () => {
    if (!sfera) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/sfera/${sferaId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Failed to delete Sfera");
      }

      toast.success("Sfera deleted");
      setIsDeleteDialogOpen(false);
      router.push("/sferas");
    } catch (error) {
      console.error("Error deleting Sfera:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete Sfera"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const isOwnerOrAdmin =
    sfera &&
    currentUserId &&
    members.some(
      (m) => m.userId === currentUserId && ["owner", "admin"].includes(m.role)
    );

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!sfera) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50">
        <p className="text-gray-500">Sfera not found</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <header className="fixed top-0 right-0 left-0 z-20 flex h-12 items-center border-gray-200 border-b bg-gray-50 px-4">
        <div className="flex w-full items-center justify-between px-2">
          <Button
            className="h-8 w-8 rounded-full"
            onClick={() => router.push("/sferas")}
            size="icon"
            variant="ghost"
          >
            <Menu className="h-5 w-5 text-gray-700" />
            <span className="sr-only">Menu</span>
          </Button>

          <div className="flex flex-col items-center">
            {parentSfera && (
              <button
                className="flex items-center gap-1 text-gray-500 text-xs hover:text-gray-700 hover:underline"
                onClick={() => router.push(`/sfera/${parentSfera.id}`)}
                type="button"
              >
                <span>{parentSfera.title}</span>
                <ChevronRight className="h-3 w-3" />
              </button>
            )}
            <h1 className="font-medium text-base text-gray-800">
              {sfera.title}
            </h1>
          </div>

          <div className="flex items-center gap-1">
            {isOwnerOrAdmin && (
              <>
                <Button
                  className="h-8 w-8 rounded-full"
                  onClick={() => setIsSettingsOpen(true)}
                  size="icon"
                  variant="ghost"
                >
                  <Settings className="h-5 w-5 text-gray-700" />
                  <span className="sr-only">Settings</span>
                </Button>
                {sfera?.ownerId === currentUserId && (
                  <Button
                    className="h-8 w-8 rounded-full text-red-500 hover:bg-red-50 hover:text-red-600"
                    onClick={() => setIsDeleteDialogOpen(true)}
                    size="icon"
                    variant="ghost"
                  >
                    <Trash2 className="h-5 w-5" />
                    <span className="sr-only">Delete Sfera</span>
                  </Button>
                )}
              </>
            )}
            <Button
              className="h-8 w-8 rounded-full"
              onClick={() => router.push("/sferas/new")}
              size="icon"
              variant="ghost"
            >
              <PenSquare className="h-5 w-5 text-gray-700" />
              <span className="sr-only">New Sfera</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-grow overflow-y-auto px-4 pt-14 pb-32">
        <div className="mx-auto max-w-3xl space-y-4">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-gray-500">
                No messages yet. Start the discussion!
              </p>
            </div>
          ) : (
            messages.map((message) => {
              // Find parent message if exists
              const parentMessage = message.parentMessageId
                ? messages.find((m) => m.id === message.parentMessageId)
                : null;

              return (
                <SferaMessage
                  canModerate={Boolean(isOwnerOrAdmin)}
                  currentUserId={currentUserId}
                  key={message.id}
                  message={message}
                  onDelete={() => handleDeleteMessage(message)}
                  onEdit={() => handleEditMessage(message)}
                  onFork={handleFork}
                  onReply={() => setReplyingTo(message)}
                  parentMessage={parentMessage}
                  sferaId={sferaId}
                />
              );
            })
          )}
        </div>
      </div>

      {/* Input */}
      <div className="fixed right-0 bottom-0 left-0 bg-gray-50 p-4">
        <div className="mx-auto max-w-3xl">
          <SferaPromptInput
            editingMessage={editingMessage}
            onCancelEdit={() => setEditingMessage(null)}
            onCancelReply={() => setReplyingTo(null)}
            onMessageSent={handleMessageSent}
            replyingTo={replyingTo}
            sferaId={sferaId}
          />
        </div>
      </div>

      {/* Settings Dialog */}
      {sfera && (
        <>
          <SferaSettings
            currentDescription={sfera.description}
            currentMembers={members}
            currentTitle={sfera.title}
            isOpen={isSettingsOpen}
            isOwner={sfera.ownerId === currentUserId}
            onClose={() => setIsSettingsOpen(false)}
            onUpdate={handleSettingsUpdate}
            sferaId={sferaId}
          />

          <AlertDialog
            onOpenChange={setIsDeleteDialogOpen}
            open={isDeleteDialogOpen}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Sfera</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. Deleting a Sfera removes all
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
                  onClick={handleDeleteSfera}
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
