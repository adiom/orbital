import { auth } from "@/app/(auth)/auth";
import { AreaTree } from "@/components/area-tree";
import { AreaSettingsSheet } from "@/components/area-settings-sheet";
import { CreateGroupChatDialog } from "@/components/create-group-chat-dialog";
import { GroupChatsList } from "@/components/group-chats-list";
import { getAreaById, getAreaMembers } from "@/lib/db/queries";
import { GitBranch, Users } from "lucide-react";
import { notFound, redirect } from "next/navigation";

export default async function AreaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  if (!session || !session.user) {
    redirect("/login");
  }

  const area = await getAreaById({ id });

  if (!area) {
    notFound();
  }

  // Get members (but don't require membership - all areas are open)
  const members = await getAreaMembers({ areaId: id });
  const userMember = members.find((m) => m.userId === session.user.id);

  // For now, all users can access all areas (open access)
  // If you want to enforce membership later, uncomment:
  // if (!userMember) {
  //   redirect("/areas");
  // }

  return (
    <div className="flex h-screen">
      {/* Sidebar - Area Tree */}
      <aside className="w-64 border-r bg-muted/30 overflow-auto">
        <AreaTree areaId={id} />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {area.forkedAt && (
                  <GitBranch className="w-5 h-5 text-muted-foreground" />
                )}
                <h1 className="text-2xl font-bold">{area.title}</h1>
              </div>
              {area.description && (
                <p className="text-sm text-muted-foreground">
                  {area.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="flex items-center gap-2 px-3 py-2 text-sm border rounded-md hover:bg-accent transition-colors"
              >
                <Users className="w-4 h-4" />
                <span>{members.length}</span>
              </button>

              {userMember && ["owner", "admin"].includes(userMember.role) && (
                <AreaSettingsSheet
                  areaId={id}
                  members={members}
                  currentUserRole={userMember.role}
                />
              )}
            </div>
          </div>

          {/* Inherited Summary (if forked) */}
          {area.inheritedSummary && (
            <div className="mt-4 p-3 bg-muted rounded-md">
              <div className="text-xs font-medium text-muted-foreground uppercase mb-1">
                Inherited Context
              </div>
              <p className="text-sm">{area.inheritedSummary}</p>
            </div>
          )}
        </header>

        {/* Content Area - Chats, Documents, etc. */}
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Group Chats</h2>
              <CreateGroupChatDialog areaId={id} />
            </div>
            <GroupChatsList areaId={id} />
          </div>
        </main>
      </div>
    </div>
  );
}
