import { and, eq } from "drizzle-orm";
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
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ uuid: string }>;
};

async function getMessage(messageId: string, userId: string) {
  try {
    // Get message with sfera and user info
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

    // Check if user is member of the Sfera
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

    // Get parent message if exists
    let parentMessage = null;
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
  const { uuid } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const data = await getMessage(uuid, session.user.id);

  if (!data || !data.message) {
    notFound();
  }

  const { message, parentMessage, sfera } = data;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center gap-4">
        <Link href={`/orbit/${sfera.id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Orbit
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{sfera.title}</h1>
          {sfera.description && (
            <p className="text-gray-600 text-sm">{sfera.description}</p>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <OrbitMessage
          message={{
            id: message.id,
            content: message.content,
            userId: message.userId,
            userEmail: message.userEmail,
            parentMessageId: message.parentMessageId,
            attachments: message.attachments || [],
            toolResults: message.toolResults || [],
            isForked: message.isForked,
            forkedSferaId: message.forkedSferaId,
            createdAt: new Date(message.createdAt),
          }}
          parentMessage={
            parentMessage
              ? {
                  id: parentMessage.id,
                  content: parentMessage.content,
                  userId: parentMessage.userId,
                  userEmail: parentMessage.userEmail,
                  createdAt: new Date(parentMessage.createdAt),
                }
              : null
          }
          orbitId={sfera.id}
          currentUserId={session.user.id}
        />
      </div>
    </div>
  );
}

