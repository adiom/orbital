import { auth } from "@/app/(auth)/auth";
import { SferaChat } from "@/components/sfera/SferaChat";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function SferaPage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();

  return (
    <div className="h-screen">
      <SferaChat currentUserId={session?.user?.id} sferaId={id} />
    </div>
  );
}
