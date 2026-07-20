import { and, desc, eq } from "drizzle-orm";
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
  params: Promise<{ id: string }>;
};

// Helper to check if user is member of Sfera
async function checkSferaMembership(sferaId: string, userId: string) {
  const [membership] = await db
    .select()
    .from(sferaMember)
    .where(
      and(eq(sferaMember.sferaId, sferaId), eq(sferaMember.userId, userId))
    )
    .limit(1);

  return membership;
}

// GET /api/sfera/[id] - Get Sfera details with messages
export async function GET(_request: Request, context: RouteContext) {
  const session = await auth();

  if (!session || !session.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    // Check membership (must be first)
    const membership = await checkSferaMembership(id, session.user.id);
    if (!membership) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get Sfera details, fork info, members, and messages in parallel
    const [sferaData, forkInfo, members, messages] = await Promise.all([
      // Sfera details
      db.select().from(sfera).where(eq(sfera.id, id)).limit(1).then((rows) => rows[0]),
      // Fork info
      db.select({
        parentSferaId: sferaForkedSfera.parentSferaId,
        parentSferaTitle: sfera.title,
      })
        .from(sferaForkedSfera)
        .innerJoin(sfera, eq(sferaForkedSfera.parentSferaId, sfera.id))
        .where(eq(sferaForkedSfera.forkedSferaId, id))
        .limit(1)
        .then((rows) => rows[0] || null),
      // Members
      db.select({
        userId: sferaMember.userId,
        role: sferaMember.role,
        joinedAt: sferaMember.joinedAt,
        email: user.email,
      })
        .from(sferaMember)
        .innerJoin(user, eq(sferaMember.userId, user.id))
        .where(eq(sferaMember.sferaId, id)),
      // Messages with fork information
      db.select({
        id: sferaMessage.id,
        content: sferaMessage.content,
        userId: sferaMessage.userId,
        userEmail: user.email,
        parentMessageId: sferaMessage.parentMessageId,
        attachments: sferaMessage.attachments,
        toolResults: sferaMessage.toolResults,
        isForked: sferaMessage.isForked,
        forkedSferaId: sferaForkedSfera.forkedSferaId,
        isGenerating: sferaMessage.isGenerating,
        createdAt: sferaMessage.createdAt,
      })
        .from(sferaMessage)
        .innerJoin(user, eq(sferaMessage.userId, user.id))
        .leftJoin(
          sferaForkedSfera,
          eq(sferaMessage.id, sferaForkedSfera.parentMessageId)
        )
        .where(eq(sferaMessage.sferaId, id))
        .orderBy(desc(sferaMessage.createdAt))
        .limit(50),
    ]);

    if (!sferaData) {
      return Response.json({ error: "Sfera not found" }, { status: 404 });
    }

    const parentSfera = forkInfo
      ? { id: forkInfo.parentSferaId, title: forkInfo.parentSferaTitle }
      : null;

    return Response.json({
      sfera: sferaData,
      parentSfera,
      members,
      messages,
    });
  } catch (error) {
    console.error("Failed to fetch sfera:", error);
    return Response.json({ error: "Failed to fetch sfera" }, { status: 500 });
  }
}

// PUT /api/sfera/[id] - Update Sfera
export async function PUT(request: Request, context: RouteContext) {
  const session = await auth();

  if (!session || !session.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    // Check if user is owner or admin
    const membership = await checkSferaMembership(id, session.user.id);
    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, visibility, positionX, positionY } = body;

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (title) {
      updateData.title = title;
    }
    if (description !== undefined) {
      updateData.description = description;
    }
    if (visibility) {
      updateData.visibility = visibility;
    }
    if (positionX !== undefined && (positionX === null || Number.isFinite(positionX))) {
      updateData.positionX = positionX;
    }
    if (positionY !== undefined && (positionY === null || Number.isFinite(positionY))) {
      updateData.positionY = positionY;
    }

    const [updatedSfera] = await db
      .update(sfera)
      .set(updateData)
      .where(eq(sfera.id, id))
      .returning();

    return Response.json({ sfera: updatedSfera });
  } catch (error) {
    console.error("Failed to update sfera:", error);
    return Response.json({ error: "Failed to update sfera" }, { status: 500 });
  }
}

// DELETE /api/sfera/[id] - Delete Sfera
export async function DELETE(_request: Request, context: RouteContext) {
  const session = await auth();

  if (!session || !session.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    // Check if user is owner
    const [sferaData] = await db
      .select()
      .from(sfera)
      .where(eq(sfera.id, id))
      .limit(1);

    if (!sferaData) {
      return Response.json({ error: "Sfera not found" }, { status: 404 });
    }

    if (sferaData.ownerId !== session.user.id) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete Sfera (cascade will handle members, messages, forked chats)
    await db.delete(sfera).where(eq(sfera.id, id));

    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to delete sfera:", error);
    return Response.json({ error: "Failed to delete sfera" }, { status: 500 });
  }
}
