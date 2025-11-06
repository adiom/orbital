import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/app/(auth)/auth";
import { Chat } from "@/components/chat";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { getChatById, getMessagesByChatId } from "@/lib/db/queries";
import { convertToUIMessages } from "@/lib/utils";

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  const chat = await getChatById({ id });

  if (!chat) {
    notFound();
  }

  const session = await auth();

  if (!session) {
    redirect("/api/auth/guest");
  }

  // For group chats, all users can read and write (public access for now)
  let isReadonly = false;
  let hasAccess = true;

  if (chat.chatType === "group") {
    // All group chats are open - anyone can participate
    isReadonly = false;
    hasAccess = true;
  } else {
    // For non-group chats, check ownership
    isReadonly = session?.user?.id !== chat.userId;
    hasAccess = session.user?.id === chat.userId;

    // Check access for private chats
    if (chat.visibility === "private") {
      if (!session.user) {
        return notFound();
      }

      if (!hasAccess) {
        return notFound();
      }
    }
  }

  const messagesFromDb = await getMessagesByChatId({
    id,
  });

  const uiMessages = convertToUIMessages(messagesFromDb);

  const cookieStore = await cookies();
  const chatModelFromCookie = cookieStore.get("chat-model");

  if (!chatModelFromCookie) {
    return (
      <>
        <Chat
          autoResume={true}
          id={chat.id}
          initialChatModel={DEFAULT_CHAT_MODEL}
          initialLastContext={chat.lastContext ?? undefined}
          initialMessages={uiMessages}
          initialVisibilityType={chat.visibility}
          isReadonly={isReadonly}
          areaId={chat.areaId}
          chatType={chat.chatType}
        />
        <DataStreamHandler />
      </>
    );
  }

  return (
    <>
      <Chat
        autoResume={true}
        id={chat.id}
        initialChatModel={chatModelFromCookie.value}
        initialLastContext={chat.lastContext ?? undefined}
        initialMessages={uiMessages}
        initialVisibilityType={chat.visibility}
        isReadonly={isReadonly}
        areaId={chat.areaId}
        chatType={chat.chatType}
      />
      <DataStreamHandler />
    </>
  );
}
