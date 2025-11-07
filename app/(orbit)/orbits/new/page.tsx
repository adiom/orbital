"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";

export default function NewOrbitPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("private");
  const [memberEmails, setMemberEmails] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    setIsCreating(true);

    try {
      const emails = memberEmails
        .split(",")
        .map((email) => email.trim())
        .filter((email) => email.length > 0);

      const response = await fetch("/api/sfera", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          visibility,
          memberEmails: emails.length > 0 ? emails : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create orbit");
      }

      const data = await response.json();
      toast.success("Orbit created successfully!");
      router.push(`/orbit/${data.sfera.id}`);
    } catch (error) {
      console.error("Error creating orbit:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create orbit"
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50/50 to-purple-50/50 p-4">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h1 className="mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text font-bold text-3xl text-transparent">
            Create New Orbit
          </h1>
          <p className="text-gray-600">
            Start a collaborative discussion space with branching conversations
          </p>
        </div>

        <form
          className="overflow-hidden rounded-3xl border-2 border-gray-200 bg-white p-8 shadow-xl"
          onSubmit={handleSubmit}
        >
          <div className="space-y-6">
            <div>
              <Label className="font-semibold text-sm" htmlFor="title">
                Orbit Title *
              </Label>
              <Input
                className="mt-2 rounded-xl border-2"
                disabled={isCreating}
                id="title"
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter orbit title..."
                required
                value={title}
              />
            </div>

            <div>
              <Label className="font-semibold text-sm" htmlFor="description">
                Description
              </Label>
              <Textarea
                className="mt-2 min-h-[100px] rounded-xl border-2"
                disabled={isCreating}
                id="description"
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this orbit about? (optional)"
                value={description}
              />
            </div>

            <div>
              <Label className="font-semibold text-sm" htmlFor="visibility">
                Visibility
              </Label>
              <Select
                disabled={isCreating}
                onValueChange={setVisibility}
                value={visibility}
              >
                <SelectTrigger className="mt-2 rounded-xl border-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="dao">DAO</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="font-semibold text-sm" htmlFor="members">
                Invite Members
              </Label>
              <Input
                className="mt-2 rounded-xl border-2"
                disabled={isCreating}
                id="members"
                onChange={(e) => setMemberEmails(e.target.value)}
                placeholder="user1@example.com, user2@example.com"
                value={memberEmails}
              />
              <p className="mt-2 text-gray-500 text-xs">
                Separate multiple emails with commas
              </p>
            </div>
          </div>

          <div className="mt-8 flex gap-3">
            <Button
              className="flex-1 rounded-xl"
              disabled={isCreating}
              onClick={() => router.back()}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:shadow-xl"
              disabled={isCreating || !title.trim()}
              type="submit"
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Orbit"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
