"use client";

import { useEffect, useState } from "react";
import { SferaMessage } from "./SferaMessage";
import { SferaMessageInput } from "./SferaMessageInput";
import { SferaSettings } from "./SferaSettings";
import { Loader2, ChevronRight, Menu, PenSquare, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Message {
  id: string;
  content: string;
  userId: string;
  userEmail: string;
  parentMessageId: string | null;
  isForked: boolean;
  forkedSferaId: string | null;
  createdAt: Date;
}

interface Member {
  userId: string;
  email: string;
  role: string;
}

interface SferaData {
  id: string;
  title: string;
  description: string | null;
  visibility: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ParentSfera {
  id: string;
  title: string;
}

interface SferaChatProps {
  sferaId: string;
  currentUserId?: string;
}

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
  }, [sferaId]);

  const handleMessageSent = () => {
    // Clear reply state and refresh messages
    setReplyingTo(null);
    fetchSfera();
  };

  const handleFork = (messageId: string) => {
    // Refresh to update fork status
    fetchSfera();
  };

  const handleSettingsUpdate = () => {
    // Refresh after settings update
    fetchSfera();
  };

  const isOwnerOrAdmin = sfera && currentUserId && members.some(
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
    <div className="bg-gray-50 flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-12 flex items-center px-4 z-20 bg-gray-50 border-b border-gray-200">
        <div className="w-full flex items-center justify-between px-2">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full h-8 w-8"
            onClick={() => router.push("/sferas")}
          >
            <Menu className="h-5 w-5 text-gray-700" />
            <span className="sr-only">Menu</span>
          </Button>

          <div className="flex flex-col items-center">
            {parentSfera && (
              <button
                onClick={() => router.push(`/sfera/${parentSfera.id}`)}
                className="text-xs text-gray-500 hover:text-gray-700 hover:underline flex items-center gap-1"
              >
                <span>{parentSfera.title}</span>
                <ChevronRight className="h-3 w-3" />
              </button>
            )}
            <h1 className="text-base font-medium text-gray-800">{sfera.title}</h1>
          </div>

          <div className="flex items-center gap-1">
            {isOwnerOrAdmin && (
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full h-8 w-8"
                onClick={() => setIsSettingsOpen(true)}
              >
                <Settings className="h-5 w-5 text-gray-700" />
                <span className="sr-only">Settings</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-8 w-8"
              onClick={() => router.push("/sferas/new")}
            >
              <PenSquare className="h-5 w-5 text-gray-700" />
              <span className="sr-only">New Sfera</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-grow pb-32 pt-14 px-4 overflow-y-auto">
        <div className="max-w-3xl mx-auto space-y-4">
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
                ? messages.find(m => m.id === message.parentMessageId)
                : null;

              return (
                <SferaMessage
                  key={message.id}
                  message={message}
                  parentMessage={parentMessage}
                  sferaId={sferaId}
                  onFork={handleFork}
                  onReply={() => setReplyingTo(message)}
                />
              );
            })
          )}
        </div>
      </div>

      {/* Input */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <SferaMessageInput
            sferaId={sferaId}
            replyingTo={replyingTo}
            onCancelReply={() => setReplyingTo(null)}
            onMessageSent={handleMessageSent}
          />
        </div>
      </div>

      {/* Settings Dialog */}
      {sfera && (
        <SferaSettings
          sferaId={sferaId}
          currentTitle={sfera.title}
          currentDescription={sfera.description}
          currentMembers={members}
          isOwner={sfera.ownerId === currentUserId}
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          onUpdate={handleSettingsUpdate}
        />
      )}
    </div>
  );
}
