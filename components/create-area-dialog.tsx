"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FolderTree } from "lucide-react";
import { useRouter } from "next/navigation";

interface CreateAreaDialogProps {
  trigger?: React.ReactNode;
}

export function CreateAreaDialog({ trigger }: CreateAreaDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public" | "dao">(
    "private"
  );
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
      const response = await fetch("/api/areas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          visibility,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create area");
      }

      const data = await response.json();

      // Close dialog and reset
      setOpen(false);
      setTitle("");
      setDescription("");
      setVisibility("private");

      // Navigate to the new area
      router.push(`/area/${data.area.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create area");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button>
            <FolderTree className="w-4 h-4 mr-2" />
            New Area
          </Button>
        )}
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Create New Area</SheetTitle>
          <SheetDescription>
            Create a workspace for collaboration with group chats and documents
          </SheetDescription>
        </SheetHeader>
        <div className="py-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="e.g. Project Alpha"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="What is this area about?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="visibility">Visibility</Label>
              <Select
                value={visibility}
                onValueChange={(value: "private" | "public" | "dao") =>
                  setVisibility(value)
                }
                disabled={loading}
              >
                <SelectTrigger id="visibility">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">
                    Private - Only invited members
                  </SelectItem>
                  <SelectItem value="public">
                    Public - Anyone can view
                  </SelectItem>
                  <SelectItem value="dao">
                    DAO - Decentralized governance
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {error && (
              <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950 p-2 rounded">
                {error}
              </div>
            )}

            <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
              <p className="font-medium mb-1">Auto-created:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Default group chat &quot;{title || "Title"} - General&quot;</li>
                <li>You as owner and admin</li>
              </ul>
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
            {loading ? "Creating..." : "Create Area"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
