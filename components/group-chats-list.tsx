"use client";

import { MessageSquare, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type GroupChat = {
  id: string;
  title: string;
  chatType: string;
  createdAt: Date;
  userRole: string;
};

type GroupChatsListProps = {
  areaId: string;
};

export function GroupChatsList({ areaId }: GroupChatsListProps) {
  const [chats, setChats] = useState<GroupChat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchChats() {
      try {
        const response = await fetch(`/api/areas/${areaId}/chats`);
        if (response.ok) {
          const data = await response.json();
          setChats(data.chats || []);
        }
      } catch (error) {
        console.error("Error fetching chats:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchChats();
  }, [areaId]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card className="animate-pulse" key={i}>
            <CardHeader>
              <div className="h-6 rounded bg-muted" />
            </CardHeader>
            <CardContent>
              <div className="h-4 rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <MessageSquare className="mx-auto mb-4 h-12 w-12 opacity-50" />
        <p className="text-sm">
          No group chats yet. Create one to start collaborating with your team
          and @avrora!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {chats.map((chat) => (
        <Link href={`/area/${areaId}/chat/${chat.id}`} key={chat.id}>
          <Card className="h-full cursor-pointer transition-colors hover:bg-accent">
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                  {chat.title}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Badge className="capitalize" variant="outline">
                  {chat.userRole}
                </Badge>
                {chat.chatType === "group" && (
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    Group
                  </span>
                )}
              </div>
              <div className="mt-2 text-muted-foreground text-xs">
                Created {new Date(chat.createdAt).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
