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
  params: Promise<{ id: string }>;
};

// POST /api/sfera/[id]/fork - Create forked Sfera from a message
export async function POST(request: Request, context: RouteContext) {
  const session = await auth();

  if (!session || !session.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: sferaId } = await context.params;

  try {
    // Check membership
    const [membership] = await db
      .select()
      .from(sferaMember)
      .where(
        and(
          eq(sferaMember.sferaId, sferaId),
          eq(sferaMember.userId, session.user.id)
        )
      )
      .limit(1);

    if (!membership) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { messageId } = body;

    if (!messageId) {
      return Response.json(
        { error: "Message ID is required" },
        { status: 400 }
      );
    }

    // Check if message is already forked
    const [existingFork] = await db
      .select()
      .from(sferaForkedSfera)
      .where(eq(sferaForkedSfera.parentMessageId, messageId))
      .limit(1);

    if (existingFork) {
      return Response.json(
        {
          error: "Message has already been forked",
          forkedSferaId: existingFork.forkedSferaId,
        },
        { status: 400 }
      );
    }

    // Get the message to fork
    const [messageToFork] = await db
      .select()
      .from(sferaMessage)
      .where(
        and(eq(sferaMessage.id, messageId), eq(sferaMessage.sferaId, sferaId))
      )
      .limit(1);

    if (!messageToFork) {
      return Response.json({ error: "Message not found" }, { status: 404 });
    }

    // Get parent Sfera info
    const [parentSfera] = await db
      .select()
      .from(sfera)
      .where(eq(sfera.id, sferaId))
      .limit(1);

    if (!parentSfera) {
      return Response.json(
        { error: "Parent Sfera not found" },
        { status: 404 }
      );
    }

    // Generate title from message content (first 50 chars)
    const autoTitle =
      messageToFork.content.slice(0, 50).trim() +
      (messageToFork.content.length > 50 ? "..." : "");

    // Create new Sfera
    const [newSfera] = await db
      .insert(sfera)
      .values({
        title: autoTitle,
        description: `Forked from: ${parentSfera.title}`,
        ownerId: session.user.id,
        visibility: parentSfera.visibility,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Copy the original message to the new Sfera
    await db.insert(sferaMessage).values({
      sferaId: newSfera.id,
      content: messageToFork.content,
      userId: messageToFork.userId,
      isForked: false,
      forkCount: 0,
      createdAt: new Date(),
    });

    // Create fork record
    const [forkedSfera] = await db
      .insert(sferaForkedSfera)
      .values({
        parentSferaId: sferaId,
        parentMessageId: messageId,
        forkedSferaId: newSfera.id,
        createdById: session.user.id,
        createdAt: new Date(),
      })
      .returning();

    // Add creator as Sfera owner/admin
    await db.insert(sferaMember).values({
      sferaId: newSfera.id,
      userId: session.user.id,
      role: "owner",
      joinedAt: new Date(),
    });

    // Copy all members from parent Sfera to the forked Sfera
    const parentMembers = await db
      .select({ userId: sferaMember.userId })
      .from(sferaMember)
      .where(eq(sferaMember.sferaId, sferaId));

    const membersToAdd = parentMembers
      .map((m) => m.userId)
      .filter((id) => id !== session.user.id);

    if (membersToAdd.length > 0) {
      const sferaMemberValues = membersToAdd.map((userId: string) => ({
        sferaId: newSfera.id,
        userId,
        role: "member" as const,
        joinedAt: new Date(),
      }));

      await db.insert(sferaMember).values(sferaMemberValues);
    }

    // Mark parent message as forked
    await db
      .update(sferaMessage)
      .set({
        isForked: true,
      })
      .where(eq(sferaMessage.id, messageId));

    return Response.json(
      {
        forkedSfera,
        sfera: newSfera,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create fork:", error);
    return Response.json({ error: "Failed to create fork" }, { status: 500 });
  }
}
