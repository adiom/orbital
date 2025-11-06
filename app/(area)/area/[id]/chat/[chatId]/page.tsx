import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/app/(auth)/auth";
import { Chat } from "@/components/chat";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { getChatById, getMessagesByChatId, getAreaById } from "@/lib/db/queries";
import { convertToUIMessages } from "@/lib/utils";

export default async function GroupChatPage(props: {
  params: Promise<{ id: string; chatId: string }>;
}) {
  const params = await props.params;
  const { id: areaId, chatId } = params;

  const session = await auth();

  if (!session) {
    redirect("/api/auth/guest");
  }

  // Get area to verify it exists
  const area = await getAreaById({ id: areaId });
  if (!area) {
    notFound();
  }

  // Get chat
  const chat = await getChatById({ id: chatId });

  if (!chat) {
    notFound();
  }

  // Verify chat belongs to this area
  if (chat.areaId !== areaId) {
    notFound();
  }

  // Verify it's a group chat
  if (chat.chatType !== "group") {
    notFound();
  }

  // All group chats in areas are open - anyone can participate
  const isReadonly = false;

  const messagesFromDb = await getMessagesByChatId({
    id: chatId,
  });

  const uiMessages = convertToUIMessages(messagesFromDb);

  const cookieStore = await cookies();
  const chatModelFromCookie = cookieStore.get("chat-model");

  const chatModel = chatModelFromCookie?.value || DEFAULT_CHAT_MODEL;

  return (
    <Chat
      autoResume={true}
      id={chat.id}
      initialChatModel={chatModel}
      initialLastContext={chat.lastContext ?? undefined}
      initialMessages={uiMessages}
      initialVisibilityType={chat.visibility}
      isReadonly={isReadonly}
      areaId={chat.areaId}
      chatType={chat.chatType}
    />
  );
}
