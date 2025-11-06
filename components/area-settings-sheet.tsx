"use client";

import { Settings, Trash2, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
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
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type Member = {
  userId: string;
  email: string | null;
  role: string;
  joinedAt: Date;
};

type AreaSettingsSheetProps = {
  areaId: string;
  members: Member[];
  currentUserRole: string;
  trigger?: React.ReactNode;
};

export function AreaSettingsSheet({
  areaId,
  members: initialMembers,
  currentUserRole,
  trigger,
}: AreaSettingsSheetProps) {
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState(initialMembers);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<
    "admin" | "member" | "viewer"
  >("member");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManageMembers = ["owner", "admin"].includes(currentUserRole);

  async function handleAddMember() {
    if (!newMemberEmail.trim()) {
      setError("Email is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // First, find user by email
      const userResponse = await fetch(
        `/api/users/by-email?email=${encodeURIComponent(newMemberEmail)}`
      );

      if (!userResponse.ok) {
        throw new Error("User not found");
      }

      const { user } = await userResponse.json();

      // Add member to Area
      const response = await fetch(`/api/areas/${areaId}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          role: newMemberRole,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add member");
      }

      // Refresh members list
      const membersResponse = await fetch(`/api/areas/${areaId}/members`);
      const { members: updatedMembers } = await membersResponse.json();
      setMembers(updatedMembers);

      setNewMemberEmail("");
      setNewMemberRole("member");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add member");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!confirm("Are you sure you want to remove this member?")) {
      return;
    }

    try {
      const response = await fetch(`/api/areas/${areaId}/members/${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to remove member");
      }

      // Update local state
      setMembers(members.filter((m) => m.userId !== userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    }
  }

  return (
    <Sheet onOpenChange={setOpen} open={open}>
      <SheetTrigger asChild>
        {trigger || (
          <Button size="icon" variant="outline">
            <Settings className="h-4 w-4" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Area Settings</SheetTitle>
          <SheetDescription>
            Manage members and settings for this Area
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Members Section */}
          <div>
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-5 w-5" />
              <h3 className="font-semibold">Members ({members.length})</h3>
            </div>

            <div className="mb-4 space-y-2">
              {members.map((member) => (
                <div
                  className="flex items-center justify-between rounded-md border p-2"
                  key={member.userId}
                >
                  <div>
                    <div className="font-medium text-sm">
                      {member.email || "Unknown"}
                    </div>
                    <Badge className="text-xs capitalize" variant="outline">
                      {member.role}
                    </Badge>
                  </div>
                  {canManageMembers && member.role !== "owner" && (
                    <Button
                      onClick={() => handleRemoveMember(member.userId)}
                      size="icon"
                      variant="ghost"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Add Member Form */}
            {canManageMembers && (
              <div className="space-y-3 rounded-md border bg-muted/50 p-3">
                <div className="flex items-center gap-2 font-medium text-sm">
                  <UserPlus className="h-4 w-4" />
                  Add Member
                </div>

                <div className="space-y-2">
                  <Label className="text-xs" htmlFor="email">
                    Email
                  </Label>
                  <Input
                    disabled={loading}
                    id="email"
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    placeholder="user@example.com"
                    type="email"
                    value={newMemberEmail}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs" htmlFor="role">
                    Role
                  </Label>
                  <Select
                    disabled={loading}
                    onValueChange={(value: "admin" | "member" | "viewer") =>
                      setNewMemberRole(value)
                    }
                    value={newMemberRole}
                  >
                    <SelectTrigger id="role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {error && (
                  <div className="rounded bg-red-50 p-2 text-red-500 text-xs dark:bg-red-950">
                    {error}
                  </div>
                )}

                <Button
                  className="w-full"
                  disabled={loading}
                  onClick={handleAddMember}
                  size="sm"
                >
                  {loading ? "Adding..." : "Add Member"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
