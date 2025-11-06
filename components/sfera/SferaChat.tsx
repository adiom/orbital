"use client";

import { ChevronRight, Loader2, Menu, PenSquare, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { SferaMessage } from "./SferaMessage";
import { SferaMessageInput } from "./SferaMessageInput";
import { SferaSettings } from "./SferaSettings";

type Message = {
  id: string;
  content: string;
  userId: string;
  userEmail: string;
  parentMessageId: string | null;
  attachments?: Array<{
    name: string;
    url: string;
    contentType: string;
  }>;
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

export function SferaChat({ sferaId, currentUserId }: SferaChatProps) {
  const router = useRouter();
  const [sfera, setSfera] = useState<SferaData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [parentSfera, setParentSfera] = useState<ParentSfera | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  const fetchSfera = async () => {
    try {
      const response = await fetch(`/api/sfera/${sferaId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch sfera");
      }
      const data = await response.json();
      setSfera(data.sfera);
      setMessages(data.messages || []);
      setMembers(data.members || []);
      setParentSfera(data.parentSfera || null);
    } catch (error) {
      console.error("Error fetching sfera:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSfera();
  }, [fetchSfera]);

  const handleMessageSent = () => {
    // Clear reply state and refresh messages
    setReplyingTo(null);
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
              <Button
                className="h-8 w-8 rounded-full"
                onClick={() => setIsSettingsOpen(true)}
                size="icon"
                variant="ghost"
              >
                <Settings className="h-5 w-5 text-gray-700" />
                <span className="sr-only">Settings</span>
              </Button>
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
                  key={message.id}
                  message={message}
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
          <SferaMessageInput
            onCancelReply={() => setReplyingTo(null)}
            onMessageSent={handleMessageSent}
            replyingTo={replyingTo}
            sferaId={sferaId}
          />
        </div>
      </div>

      {/* Settings Dialog */}
      {sfera && (
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
      )}
    </div>
  );
}
