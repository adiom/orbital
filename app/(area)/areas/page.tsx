import { redirect } from "next/navigation";
import { auth } from "@/app/(auth)/auth";
import { getAreasByUserId } from "@/lib/db/queries";
import { AreasList } from "./areas-list";

export default async function AreasPage() {
  const session = await auth();

  if (!session || !session.user) {
    redirect("/login");
  }

  const areas = await getAreasByUserId({ userId: session.user.id });

  return (
    <div className="flex h-screen flex-col">
      <header className="border-b p-4">
        <h1 className="font-bold text-2xl">Areas</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Your collaborative workspaces
        </p>
      </header>

      <main className="flex-1 overflow-auto">
        <AreasList initialAreas={areas} />
      </main>
    </div>
  );
}
