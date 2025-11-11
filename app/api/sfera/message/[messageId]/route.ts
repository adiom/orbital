import { and, eq } from "drizzle-orm";
import { auth } from "@/app/(auth)/auth";
import { db } from "@/lib/db";
import {
  sfera,
  sferaForkedSfera,
  sferaMember,
  sferaMessage,
  user,
} from "@/lib/db/schema";

type RouteContext = {
  params: Promise<{ messageId: string }>;
};

// GET /api/sfera/message/[messageId] - Get message by UUID
export async function GET(_request: Request, context: RouteContext) {
  const session = await auth();

  if (!session || !session.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { messageId } = await context.params;

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
      return Response.json({ error: "Message not found" }, { status: 404 });
    }

    // Check if user is member of the Sfera
    const [membership] = await db
      .select()
      .from(sferaMember)
      .where(
        and(
          eq(sferaMember.sferaId, messageData.sferaId),
          eq(sferaMember.userId, session.user.id)
        )
      )
      .limit(1);

    if (!membership) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get parent message if exists
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

    return Response.json({
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
    });
  } catch (error) {
    console.error("Failed to fetch message:", error);
    return Response.json({ error: "Failed to fetch message" }, { status: 500 });
  }
}

// PATCH /api/sfera/message/[messageId] - Update mini-app code in toolResults
export async function PATCH(request: Request, context: RouteContext) {
  const session = await auth();

  if (!session || !session.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { messageId } = await context.params;

  try {
    const body = await request.json();
    const { miniAppId, reactCode } = body;

    if (!miniAppId || !reactCode) {
      return Response.json(
        { error: "miniAppId and reactCode are required" },
        { status: 400 }
      );
    }

    // Get the message
    const [messageData] = await db
      .select({
        id: sferaMessage.id,
        userId: sferaMessage.userId,
        sferaId: sferaMessage.sferaId,
        toolResults: sferaMessage.toolResults,
      })
      .from(sferaMessage)
      .where(eq(sferaMessage.id, messageId))
      .limit(1);

    if (!messageData) {
      return Response.json({ error: "Message not found" }, { status: 404 });
    }

    // Check if user is member of the Sfera
    const [membership] = await db
      .select()
      .from(sferaMember)
      .where(
        and(
          eq(sferaMember.sferaId, messageData.sferaId),
          eq(sferaMember.userId, session.user.id)
        )
      )
      .limit(1);

    if (!membership) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    // Update the reactCode in toolResults
    const toolResults = messageData.toolResults as any[];
    const updatedToolResults = toolResults.map((result) => {
      if (result.toolName === "create-mini-app" && result.id === miniAppId) {
        return {
          ...result,
          reactCode,
          editedAt: new Date().toISOString(),
          editedBy: session.user.id,
        };
      }
      return result;
    });

    // Update the message
    await db
      .update(sferaMessage)
      .set({
        toolResults: updatedToolResults as any,
        updatedAt: new Date(),
      })
      .where(eq(sferaMessage.id, messageId));

    return Response.json({
      success: true,
      message: "Mini-app code updated successfully",
    });
  } catch (error) {
    console.error("Failed to update mini-app code:", error);
    return Response.json(
      { error: "Failed to update mini-app code" },
      { status: 500 }
    );
  }
}
