import { GitBranch, Users } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/app/(auth)/auth";
import { AreaSettingsSheet } from "@/components/area-settings-sheet";
import { AreaTree } from "@/components/area-tree";
import { CreateGroupChatDialog } from "@/components/create-group-chat-dialog";
import { GroupChatsList } from "@/components/group-chats-list";
import { getAreaById, getAreaMembers } from "@/lib/db/queries";

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
      <aside className="w-64 overflow-auto border-r bg-muted/30">
        <AreaTree areaId={id} />
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="border-b p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="mb-1 flex items-center gap-2">
                {area.forkedAt && (
                  <GitBranch className="h-5 w-5 text-muted-foreground" />
                )}
                <h1 className="font-bold text-2xl">{area.title}</h1>
              </div>
              {area.description && (
                <p className="text-muted-foreground text-sm">
                  {area.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent"
                type="button"
              >
                <Users className="h-4 w-4" />
                <span>{members.length}</span>
              </button>

              {userMember && ["owner", "admin"].includes(userMember.role) && (
                <AreaSettingsSheet
                  areaId={id}
                  currentUserRole={userMember.role}
                  members={members}
                />
              )}
            </div>
          </div>

          {/* Inherited Summary (if forked) */}
          {area.inheritedSummary && (
            <div className="mt-4 rounded-md bg-muted p-3">
              <div className="mb-1 font-medium text-muted-foreground text-xs uppercase">
                Inherited Context
              </div>
              <p className="text-sm">{area.inheritedSummary}</p>
            </div>
          )}
        </header>

        {/* Content Area - Chats, Documents, etc. */}
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-6xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-semibold text-xl">Group Chats</h2>
              <CreateGroupChatDialog areaId={id} />
            </div>
            <GroupChatsList areaId={id} />
          </div>
        </main>
      </div>
    </div>
  );
}
