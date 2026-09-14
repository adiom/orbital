import { and, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/app/(auth)/auth";
import { OrbitMessage } from "@/components/orbit/orbit-message";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import {
  sfera,
  sferaForkedSfera,
  sferaMember,
  sferaMessage,
  user,
} from "@/lib/db/schema";

type PageProps = {
  params: Promise<{ id: string; messageId: string }>;
};

async function getMessage(messageId: string, userId: string | undefined) {
  try {
    const [messageData] = await db
      .select({
        id: sferaMessage.id,
        content: sferaMessage.content,
        userId: sferaMessage.userId,
        userEmail: user.email,
        parentMessageId: sferaMessage.parentMessageId,
        attachments: sferaMessage.attachments,
        toolResults: sferaMessage.toolResults,
        isForked: sferaMessage.isForked,
        forkedSferaId: sferaForkedSfera.forkedSferaId,
        createdAt: sferaMessage.createdAt,
        sferaId: sferaMessage.sferaId,
        sferaTitle: sfera.title,
        sferaDescription: sfera.description,
      })
      .from(sferaMessage)
      .innerJoin(user, eq(sferaMessage.userId, user.id))
      .innerJoin(sfera, eq(sferaMessage.sferaId, sfera.id))
      .leftJoin(
        sferaForkedSfera,
        eq(sferaMessage.id, sferaForkedSfera.parentMessageId)
      )
      .where(eq(sferaMessage.id, messageId))
      .limit(1);

    if (!messageData) {
      return null;
    }

    if (userId) {
      const [membership] = await db
        .select()
        .from(sferaMember)
        .where(
          and(
            eq(sferaMember.sferaId, messageData.sferaId),
            eq(sferaMember.userId, userId)
          )
        )
        .limit(1);
      if (!membership) {
        return null;
      }
    }

    let parentMessage: {
      id: string;
      content: string;
      userId: string;
      userEmail: string;
      createdAt: Date;
    } | null = null;
    if (messageData.parentMessageId) {
      const [parent] = await db
        .select({
          id: sferaMessage.id,
          content: sferaMessage.content,
          userId: sferaMessage.userId,
          userEmail: user.email,
          createdAt: sferaMessage.createdAt,
        })
        .from(sferaMessage)
        .innerJoin(user, eq(sferaMessage.userId, user.id))
        .where(eq(sferaMessage.id, messageData.parentMessageId))
        .limit(1);

      parentMessage = parent || null;
    }

    return {
      message: {
        id: messageData.id,
        content: messageData.content,
        userId: messageData.userId,
        userEmail: messageData.userEmail,
        parentMessageId: messageData.parentMessageId,
        attachments: messageData.attachments,
        toolResults: messageData.toolResults,
        isForked: messageData.isForked,
        forkedSferaId: messageData.forkedSferaId,
        createdAt: messageData.createdAt,
      },
      parentMessage,
      sfera: {
        id: messageData.sferaId,
        title: messageData.sferaTitle,
        description: messageData.sferaDescription,
      },
    };
  } catch (error) {
    console.error("Error fetching message:", error);
    return null;
  }
}

export default async function MessagePage({ params }: PageProps) {
  const { messageId } = await params;
  const session = await auth();

  const data = await getMessage(messageId, session?.user?.id);

  if (!data || !data.message) {
    notFound();
  }

  const {
    message: messageData,
    parentMessage: parentMsg,
    sfera: sferaInfo,
  } = data;

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-200/50 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-4xl items-center gap-4 px-4">
          <Link href={`/${sferaInfo.id}`}>
            <Button size="sm" variant="ghost" className="gap-1.5 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-4 w-4" />
              Назад
            </Button>
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-semibold text-gray-900 text-sm">
             это улучшенный сообщение -  {sferaInfo.title}
            </h1>
            {sferaInfo.description && (
              <p className="truncate text-gray-500 text-xs">{sferaInfo.description}</p>
            )}
          </div>
        </div>
      </header>

      {/* Message */}
      <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
        <OrbitMessage
          currentUserId={session?.user?.id}
          message={{
            id: messageData.id,
            content: messageData.content,
            userId: messageData.userId,
            userEmail: messageData.userEmail,
            parentMessageId: messageData.parentMessageId,
            attachments: messageData.attachments || [],
            toolResults: messageData.toolResults || [],
            isForked: messageData.isForked,
            forkedSferaId: messageData.forkedSferaId,
            createdAt: new Date(messageData.createdAt),
          }}
          orbitId={sferaInfo.id}
          parentMessage={
            parentMsg
              ? {
                  id: parentMsg.id,
                  content: parentMsg.content,
                  userId: parentMsg.userId,
                  userEmail: parentMsg.userEmail,
                  createdAt: new Date(parentMsg.createdAt),
                }
              : null
          }
        />
      </div>
    </div>
  );
}
