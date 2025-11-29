import { auth } from "@/app/(auth)/auth";
import { SferaGroupChat } from "@/components/sfera/sfera-group-chat";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function TestChatPage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();

  return (
    <div className="h-screen">
      <SferaGroupChat
        canModerate={false}
        currentUserId={session?.user?.id}
        sferaId={id}
      />
    </div>
  );
}
