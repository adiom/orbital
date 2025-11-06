"use client";

import { FolderTree } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

type CreateAreaDialogProps = {
  trigger?: React.ReactNode;
};

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
    <Sheet onOpenChange={setOpen} open={open}>
      <SheetTrigger asChild>
        {trigger || (
          <Button>
            <FolderTree className="mr-2 h-4 w-4" />
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
                disabled={loading}
                id="title"
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Project Alpha"
                value={title}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                disabled={loading}
                id="description"
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this area about?"
                rows={3}
                value={description}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="visibility">Visibility</Label>
              <Select
                disabled={loading}
                onValueChange={(value: "private" | "public" | "dao") =>
                  setVisibility(value)
                }
                value={visibility}
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
              <div className="rounded bg-red-50 p-2 text-red-500 text-sm dark:bg-red-950">
                {error}
              </div>
            )}

            <div className="rounded bg-muted p-3 text-muted-foreground text-sm">
              <p className="mb-1 font-medium">Auto-created:</p>
              <ul className="list-inside list-disc space-y-1">
                <li>
                  Default group chat &quot;{title || "Title"} - General&quot;
                </li>
                <li>You as owner and admin</li>
              </ul>
            </div>
          </div>
        </div>
        <SheetFooter>
          <Button
            disabled={loading}
            onClick={() => setOpen(false)}
            variant="outline"
          >
            Cancel
          </Button>
          <Button disabled={loading} onClick={handleCreate}>
            {loading ? "Creating..." : "Create Area"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
