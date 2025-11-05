import { auth } from "@/app/(auth)/auth";
import { getAreasByUserId } from "@/lib/db/queries";
import { redirect } from "next/navigation";
import { AreasList } from "./areas-list";

export default async function AreasPage() {
  const session = await auth();

  if (!session || !session.user) {
    redirect("/login");
  }

  const areas = await getAreasByUserId({ userId: session.user.id });

  return (
    <div className="flex flex-col h-screen">
      <header className="border-b p-4">
        <h1 className="text-2xl font-bold">Areas</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your collaborative workspaces
        </p>
      </header>

      <main className="flex-1 overflow-auto">
        <AreasList initialAreas={areas} />
      </main>
    </div>
  );
}
