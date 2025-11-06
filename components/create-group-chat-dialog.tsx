"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { MessageSquarePlus } from "lucide-react";
import { useRouter } from "next/navigation";

interface CreateGroupChatDialogProps {
  areaId: string;
}

export function CreateGroupChatDialog({ areaId }: CreateGroupChatDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleCreate() {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/areas/${areaId}/chats`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          chatType: "group",
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create chat");
      }

      const data = await response.json();

      // Close dialog and reset form
      setOpen(false);
      setTitle("");

      // Navigate to the new chat
      router.push(`/area/${areaId}/chat/${data.chat.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create chat");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <MessageSquarePlus className="w-4 h-4 mr-2" />
          New Group Chat
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Create Group Chat</SheetTitle>
          <SheetDescription>
            Start a new group conversation in this Area
          </SheetDescription>
        </SheetHeader>
        <div className="py-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Chat Title</Label>
              <Input
                id="title"
                placeholder="e.g. Project Discussion"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleCreate();
                  }
                }}
              />
            </div>
            {error && (
              <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950 p-2 rounded">
                {error}
              </div>
            )}
            <div className="text-sm text-muted-foreground">
              <p>
                After creating the chat, you can add members from the chat
                settings.
              </p>
              <p className="mt-2">
                Use <code className="text-xs bg-muted px-1 py-0.5 rounded">@avrora</code> to
                mention the AI assistant in group conversations.
              </p>
            </div>
          </div>
        </div>
        <SheetFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={loading}>
            {loading ? "Creating..." : "Create Chat"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
