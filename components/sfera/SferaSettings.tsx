"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { X, Plus, Loader2 } from "lucide-react";

interface Member {
  userId: string;
  email: string;
  role: string;
}

interface SferaSettingsProps {
  sferaId: string;
  currentTitle: string;
  currentDescription: string | null;
  currentMembers: Member[];
  isOwner: boolean;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

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
  }, [currentTitle, currentDescription, currentMembers, isOpen]);

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
    if (!newMemberEmail.trim()) return;

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
    if (!confirm("Are you sure you want to remove this member?")) return;

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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sfera Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Title and Description */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                Title
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Sfera title"
                disabled={!isOwner}
                className="border-gray-200"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                Description
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this Sfera is about..."
                className="min-h-[80px] border-gray-200"
                disabled={!isOwner}
              />
            </div>
          </div>

          {/* Members */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Members ({members.length})
            </label>

            {/* Add Member */}
            {isOwner && (
              <div className="flex gap-2 mb-3">
                <Input
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  placeholder="Email address"
                  className="border-gray-200"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !isAddingMember) {
                      e.preventDefault();
                      handleAddMember();
                    }
                  }}
                />
                <Button
                  onClick={handleAddMember}
                  disabled={!newMemberEmail.trim() || isAddingMember}
                  className="gap-2"
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
            <div className="space-y-2 max-h-[200px] overflow-y-auto border border-gray-200 rounded-lg p-2">
              {members.map((member) => (
                <div
                  key={member.userId}
                  className="flex items-center justify-between bg-gray-50 rounded-md p-2"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {member.email}
                      </p>
                      <p className="text-xs text-gray-500">{member.role}</p>
                    </div>
                  </div>

                  {isOwner && member.role !== "owner" && (
                    <button
                      onClick={() => handleRemoveMember(member.userId)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
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
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          {isOwner && (
            <Button onClick={handleSave} disabled={isSaving || !title.trim()}>
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
