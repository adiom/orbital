import { auth } from "@/app/(auth)/auth";
import { OrbitChat } from "@/components/orbit/orbit-chat";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function OrbitPage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();

  return (
    <div className="h-screen">
      <OrbitChat currentUserId={session?.user?.id} orbitId={id} />
    </div>
  );
}
