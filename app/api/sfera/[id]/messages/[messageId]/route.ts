import { and, eq } from "drizzle-orm";
import { auth } from "@/app/(auth)/auth";
import { db } from "@/lib/db";
import {
  sfera,
  sferaForkedSfera,
  sferaMember,
  sferaMessage,
} from "@/lib/db/schema";

type RouteContext = {
  params: Promise<{ id: string; messageId: string }>;
};

const MODERATOR_ROLES = ["owner", "admin"] as const;

type ModeratorRole = (typeof MODERATOR_ROLES)[number];

async function getMembership(sferaId: string, userId: string) {
  const [membership] = await db
    .select({
      role: sferaMember.role,
    })
    .from(sferaMember)
    .where(and(eq(sferaMember.sferaId, sferaId), eq(sferaMember.userId, userId)))
    .limit(1);

  return membership;
}

function canModerate(role?: string | null): role is ModeratorRole {
  return !!role && MODERATOR_ROLES.includes(role as ModeratorRole);
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: sferaId, messageId } = await context.params;

  try {
    const membership = await getMembership(sferaId, session.user.id);
    if (!membership) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const [existingMessage] = await db
      .select()
      .from(sferaMessage)
      .where(
        and(
          eq(sferaMessage.id, messageId),
          eq(sferaMessage.sferaId, sferaId)
        )
      )
      .limit(1);

    if (!existingMessage) {
      return Response.json({ error: "Message not found" }, { status: 404 });
    }

    const isAuthor = existingMessage.userId === session.user.id;
    if (!isAuthor && !canModerate(membership.role)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const contentInput = typeof body.content === "string" ? body.content : undefined;
    const attachmentsInput = Array.isArray(body.attachments)
      ? body.attachments
      : undefined;

    const nextContent =
      contentInput !== undefined ? contentInput.trim() : existingMessage.content;
    const nextAttachments =
      attachmentsInput !== undefined
        ? attachmentsInput
        : existingMessage.attachments ?? [];

    if (nextContent.trim() === "" && nextAttachments.length === 0) {
      return Response.json(
        { error: "Content or attachments are required" },
        { status: 400 }
      );
    }

    const [updatedMessage] = await db
      .update(sferaMessage)
      .set({
        content: nextContent,
        attachments: nextAttachments,
        updatedAt: new Date(),
      })
      .where(eq(sferaMessage.id, messageId))
      .returning();

    await db
      .update(sfera)
      .set({ updatedAt: new Date() })
      .where(eq(sfera.id, sferaId));

    return Response.json({ message: updatedMessage });
  } catch (error) {
    console.error("Failed to update message:", error);
    return Response.json({ error: "Failed to update message" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: sferaId, messageId } = await context.params;

  try {
    const membership = await getMembership(sferaId, session.user.id);
    if (!membership) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const [existingMessage] = await db
      .select()
      .from(sferaMessage)
      .where(
        and(
          eq(sferaMessage.id, messageId),
          eq(sferaMessage.sferaId, sferaId)
        )
      )
      .limit(1);

    if (!existingMessage) {
      return Response.json({ error: "Message not found" }, { status: 404 });
    }

    const isAuthor = existingMessage.userId === session.user.id;
    if (!isAuthor && !canModerate(membership.role)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const [linkedFork] = await db
      .select({ id: sferaForkedSfera.id })
      .from(sferaForkedSfera)
      .where(eq(sferaForkedSfera.parentMessageId, messageId))
      .limit(1);

    if (linkedFork) {
      return Response.json(
        { error: "Cannot delete a message that has spawned a fork" },
        { status: 400 }
      );
    }

    await db
      .delete(sferaMessage)
      .where(eq(sferaMessage.id, messageId));

    await db
      .update(sfera)
      .set({ updatedAt: new Date() })
      .where(eq(sfera.id, sferaId));

    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to delete message:", error);
    return Response.json({ error: "Failed to delete message" }, { status: 500 });
  }
}
