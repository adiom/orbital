import { auth } from "@/app/(auth)/auth";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { checkSferaAccess, getSferaWithMetadata } from "@/lib/db/queries";
import { db } from "@/lib/db";
import { sferaMessage, user } from "@/lib/db/schema";
import { SferaChatClient } from "@/components/sfera/sfera-chat-client";

type PageProps = {
  params: Promise<{ id: string }>;
};

/**
 * SferaChatPage - новая страница группового чата для Sfera
 * с использованием AI SDK Elements и streaming архитектуры
 *
 * @param {PageProps} props - Props с ID Sfera
 * @returns {JSX.Element} Страница чата или страница ошибки
 */
export default async function SferaChatPage({ params }: PageProps) {
  const { id } = await params;

  // Проверка аутентификации
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Требуется авторизация</h1>
          <p className="text-muted-foreground">
            Пожалуйста, войдите в систему для доступа к чату
          </p>
        </div>
      </div>
    );
  }

  // Получение информации о Sfera
  const sferaData = await getSferaWithMetadata(id, session.user.id);

  // Проверка существования Sfera
  if (!sferaData) {
    notFound();
  }

  // Проверка членства в Sfera
  const { hasAccess } = await checkSferaAccess(id, session.user.id);

  if (!hasAccess) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Доступ запрещен</h1>
          <p className="text-muted-foreground">
            Вы не являетесь участником этой Sfera
          </p>
        </div>
      </div>
    );
  }

  // Загрузка существующих сообщений
  const messages = await db
    .select({
      id: sferaMessage.id,
      content: sferaMessage.content,
      userId: sferaMessage.userId,
      userEmail: user.email,
      parentMessageId: sferaMessage.parentMessageId,
      attachments: sferaMessage.attachments,
      toolResults: sferaMessage.toolResults,
      isGenerating: sferaMessage.isGenerating,
      createdAt: sferaMessage.createdAt,
    })
    .from(sferaMessage)
    .innerJoin(user, eq(sferaMessage.userId, user.id))
    .where(eq(sferaMessage.sferaId, id))
    .orderBy(desc(sferaMessage.createdAt))
    .limit(50);

  // Преобразуем сообщения в формат UIMessage для AI SDK
  const initialMessages = messages.reverse().map((msg) => ({
    id: msg.id,
    role: msg.userId === session.user.id ? ("user" as const) : ("assistant" as const),
    parts: [
      {
        type: "text" as const,
        text: msg.content,
      },
    ],
    // Дополнительные данные для отображения
    metadata: {
      userId: msg.userId,
      userEmail: msg.userEmail,
      attachments: msg.attachments,
      toolResults: msg.toolResults,
      isGenerating: msg.isGenerating,
      createdAt: msg.createdAt.toISOString(),
    },
  }));

  return (
    <SferaChatClient
      currentUserId={session.user.id}
      initialSfera={sferaData}
      sferaId={id}
      initialMessages={initialMessages}
    />
  );
}
