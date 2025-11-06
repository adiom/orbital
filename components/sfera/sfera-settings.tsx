"use client";

import { Loader2, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Member = {
  userId: string;
  email: string;
  role: string;
};

type SferaSettingsProps = {
  sferaId: string;
  currentTitle: string;
  currentDescription: string | null;
  currentMembers: Member[];
  isOwner: boolean;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
};

export function SferaSettings({
  sferaId,
  currentTitle,
  currentDescription,
  currentMembers,
  isOwner,
  isOpen,
  onClose,
  onUpdate,
}: SferaSettingsProps) {
  const [title, setTitle] = useState(currentTitle);
  const [description, setDescription] = useState(currentDescription || "");
  const [members, setMembers] = useState<Member[]>(currentMembers);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);

  useEffect(() => {
    setTitle(currentTitle);
    setDescription(currentDescription || "");
    setMembers(currentMembers);
  }, [currentTitle, currentDescription, currentMembers]);

  const handleSave = async () => {
    if (!title.trim()) {
      alert("Title is required");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/sfera/${sferaId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update Sfera");
      }

      // Haptic feedback
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(50);
      }

      onUpdate();
      onClose();
    } catch (error) {
      console.error("Error updating Sfera:", error);
      alert("Failed to update Sfera");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddMember = async () => {
    if (!newMemberEmail.trim()) {
      return;
    }

    setIsAddingMember(true);
    try {
      const response = await fetch(`/api/sfera/${sferaId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newMemberEmail.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add member");
      }

      const data = await response.json();
      setMembers([...members, data.member]);
      setNewMemberEmail("");

      // Haptic feedback
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(50);
      }
    } catch (error) {
      console.error("Error adding member:", error);
      alert(error instanceof Error ? error.message : "Failed to add member");
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) {
      return;
    }

    try {
      const response = await fetch(`/api/sfera/${sferaId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        throw new Error("Failed to remove member");
      }

      setMembers(members.filter((m) => m.userId !== userId));

      // Haptic feedback
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(50);
      }
    } catch (error) {
      console.error("Error removing member:", error);
      alert("Failed to remove member");
    }
  };

  return (
    <Dialog onOpenChange={onClose} open={isOpen}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sfera Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Title and Description */}
          <div className="space-y-4">
            <div>
              <label
                className="mb-1.5 block font-medium text-gray-700 text-sm"
                htmlFor="sfera-title"
              >
                Title
              </label>
              <Input
                className="border-gray-200"
                disabled={!isOwner}
                id="sfera-title"
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Sfera title"
                value={title}
              />
            </div>

            <div>
              <label
                className="mb-1.5 block font-medium text-gray-700 text-sm"
                htmlFor="sfera-description"
              >
                Description
              </label>
              <Textarea
                className="min-h-[80px] border-gray-200"
                disabled={!isOwner}
                id="sfera-description"
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this Sfera is about..."
                value={description}
              />
            </div>
          </div>

          {/* Members */}
          <div>
            <h3 className="mb-2 block font-medium text-gray-700 text-sm">
              Members ({members.length})
            </h3>

            {/* Add Member */}
            {isOwner && (
              <div className="mb-3 flex gap-2">
                <Input
                  className="border-gray-200"
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !isAddingMember) {
                      e.preventDefault();
                      handleAddMember();
                    }
                  }}
                  placeholder="Email address"
                  value={newMemberEmail}
                />
                <Button
                  className="gap-2"
                  disabled={!newMemberEmail.trim() || isAddingMember}
                  onClick={handleAddMember}
                >
                  {isAddingMember ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Add
                </Button>
              </div>
            )}

            {/* Members List */}
            <div className="max-h-[200px] space-y-2 overflow-y-auto rounded-lg border border-gray-200 p-2">
              {members.map((member) => (
                <div
                  className="flex items-center justify-between rounded-md bg-gray-50 p-2"
                  key={member.userId}
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">
                        {member.email}
                      </p>
                      <p className="text-gray-500 text-xs">{member.role}</p>
                    </div>
                  </div>

                  {isOwner && member.role !== "owner" && (
                    <button
                      className="text-gray-400 transition-colors hover:text-red-600"
                      onClick={() => handleRemoveMember(member.userId)}
                      type="button"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button disabled={isSaving} onClick={onClose} variant="outline">
            Cancel
          </Button>
          {isOwner && (
            <Button disabled={isSaving || !title.trim()} onClick={handleSave}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
