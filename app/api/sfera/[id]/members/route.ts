import { db } from "@/lib/db";
import { sfera, sferaMember, user } from "@/lib/db/schema";
import { auth } from "@/app/(auth)/auth";
import { eq, and } from "drizzle-orm";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// POST /api/sfera/[id]/members - Add member to Sfera
export async function POST(request: Request, context: RouteContext) {
  const session = await auth();

  if (!session || !session.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: sferaId } = await context.params;

  try {
    // Check if requester is admin or owner
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

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { userId, role = "member" } = body;

    if (!userId) {
      return Response.json({ error: "User ID is required" }, { status: 400 });
    }

    // Check if user already a member
    const [existing] = await db
      .select()
      .from(sferaMember)
      .where(
        and(eq(sferaMember.sferaId, sferaId), eq(sferaMember.userId, userId))
      )
      .limit(1);

    if (existing) {
      return Response.json(
        { error: "User is already a member" },
        { status: 400 }
      );
    }

    // Add member
    await db.insert(sferaMember).values({
      sferaId,
      userId,
      role,
      joinedAt: new Date(),
    });

    return Response.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Failed to add member:", error);
    return Response.json({ error: "Failed to add member" }, { status: 500 });
  }
}

// DELETE /api/sfera/[id]/members/[userId] - Remove member from Sfera
export async function DELETE(request: Request, context: RouteContext) {
  const session = await auth();

  if (!session || !session.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: sferaId } = await context.params;
  const url = new URL(request.url);
  const userIdToRemove = url.searchParams.get("userId");

  if (!userIdToRemove) {
    return Response.json({ error: "User ID is required" }, { status: 400 });
  }

  try {
    // Check if requester is admin or owner
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

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    // Cannot remove owner
    const [sferaData] = await db
      .select()
      .from(sfera)
      .where(eq(sfera.id, sferaId))
      .limit(1);

    if (sferaData.ownerId === userIdToRemove) {
      return Response.json(
        { error: "Cannot remove owner from Sfera" },
        { status: 400 }
      );
    }

    // Remove member
    await db
      .delete(sferaMember)
      .where(
        and(
          eq(sferaMember.sferaId, sferaId),
          eq(sferaMember.userId, userIdToRemove)
        )
      );

    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to remove member:", error);
    return Response.json(
      { error: "Failed to remove member" },
      { status: 500 }
    );
  }
}
