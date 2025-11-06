"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, UserPlus, Loader2 } from "lucide-react";

export default function NewSferaPage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public" | "dao">("private");
  const [memberEmails, setMemberEmails] = useState<string[]>([]);
  const [newMemberEmail, setNewMemberEmail] = useState("");

  const handleAddMember = () => {
    const email = newMemberEmail.trim();
    if (!email) return;

    // Basic email validation
    if (!email.includes("@")) {
      alert("Please enter a valid email address");
      return;
    }

    if (memberEmails.includes(email)) {
      alert("This member is already added");
      return;
    }

    setMemberEmails([...memberEmails, email]);
    setNewMemberEmail("");
  };

  const handleRemoveMember = (email: string) => {
    setMemberEmails(memberEmails.filter((e) => e !== email));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert("Title is required");
      return;
    }

    if (memberEmails.length === 0) {
      alert("At least one member must be added");
      return;
    }

    setIsCreating(true);
    try {
      // First, we need to get user IDs from emails
      // For now, we'll assume the API can handle emails and resolve them
      // In production, you'd want a user search endpoint
      const response = await fetch("/api/sfera", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          visibility,
          memberEmails, // API will need to resolve these to userIds
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create Sfera");
      }

      const data = await response.json();
      router.push(`/sfera/${data.sfera.id}`);
    } catch (error) {
      console.error("Error creating Sfera:", error);
      alert(error instanceof Error ? error.message : "Failed to create Sfera");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Create New Sfera</h1>
        <p className="mt-2 text-muted-foreground">
          Create a collaborative discussion space where every message can branch into new conversations
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Sfera Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Product Design Discussion"
                required
                disabled={isCreating}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this Sfera about?"
                className="min-h-[100px]"
                disabled={isCreating}
              />
            </div>

            {/* Visibility */}
            <div className="space-y-2">
              <Label htmlFor="visibility">Visibility</Label>
              <Select
                value={visibility}
                onValueChange={(value: any) => setVisibility(value)}
                disabled={isCreating}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="dao">DAO</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {visibility === "private" && "Only invited members can access"}
                {visibility === "public" && "Anyone can view and join"}
                {visibility === "dao" && "Governed by DAO token holders"}
              </p>
            </div>

            {/* Members */}
            <div className="space-y-2">
              <Label>
                Members <span className="text-destructive">*</span>
              </Label>
              <p className="text-sm text-muted-foreground">
                Add at least one member to create a Sfera
              </p>

              {/* Add member input */}
              <div className="flex gap-2">
                <Input
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  placeholder="Enter member email"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddMember();
                    }
                  }}
                  disabled={isCreating}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddMember}
                  disabled={isCreating}
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>

              {/* Member list */}
              {memberEmails.length > 0 && (
                <div className="mt-4 space-y-2">
                  {memberEmails.map((email) => (
                    <div
                      key={email}
                      className="flex items-center justify-between rounded-md border border-border bg-muted/50 px-3 py-2"
                    >
                      <span className="text-sm">{email}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(email)}
                        disabled={isCreating}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isCreating}>
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Sfera"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
