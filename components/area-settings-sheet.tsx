"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Settings, UserPlus, Users, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Member {
  userId: string;
  email: string | null;
  role: string;
  joinedAt: Date;
}

interface AreaSettingsSheetProps {
  areaId: string;
  members: Member[];
  currentUserRole: string;
  trigger?: React.ReactNode;
}

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
      setError(
        err instanceof Error ? err.message : "Failed to remove member"
      );
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="outline" size="icon">
            <Settings className="w-4 h-4" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Area Settings</SheetTitle>
          <SheetDescription>
            Manage members and settings for this Area
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Members Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5" />
              <h3 className="font-semibold">Members ({members.length})</h3>
            </div>

            <div className="space-y-2 mb-4">
              {members.map((member) => (
                <div
                  key={member.userId}
                  className="flex items-center justify-between p-2 border rounded-md"
                >
                  <div>
                    <div className="text-sm font-medium">
                      {member.email || "Unknown"}
                    </div>
                    <Badge variant="outline" className="text-xs capitalize">
                      {member.role}
                    </Badge>
                  </div>
                  {canManageMembers && member.role !== "owner" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveMember(member.userId)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Add Member Form */}
            {canManageMembers && (
              <div className="space-y-3 p-3 border rounded-md bg-muted/50">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <UserPlus className="w-4 h-4" />
                  Add Member
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@example.com"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role" className="text-xs">
                    Role
                  </Label>
                  <Select
                    value={newMemberRole}
                    onValueChange={(value: "admin" | "member" | "viewer") =>
                      setNewMemberRole(value)
                    }
                    disabled={loading}
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
                  <div className="text-xs text-red-500 bg-red-50 dark:bg-red-950 p-2 rounded">
                    {error}
                  </div>
                )}

                <Button
                  onClick={handleAddMember}
                  disabled={loading}
                  className="w-full"
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
