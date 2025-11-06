import { SferaChat } from "@/components/sfera/SferaChat";
import { auth } from "@/app/(auth)/auth";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function SferaPage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();

  return (
    <div className="h-screen">
      <SferaChat sferaId={id} currentUserId={session?.user?.id} />
    </div>
  );
}
