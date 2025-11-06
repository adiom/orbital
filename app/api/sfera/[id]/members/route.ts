import { and, eq } from "drizzle-orm";
import { auth } from "@/app/(auth)/auth";
import { db } from "@/lib/db";
import { sfera, sferaMember, user } from "@/lib/db/schema";

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
    const { userId, email, role = "member" } = body;

    let userIdToAdd = userId;

    // If email provided, resolve to userId
    if (email && !userId) {
      const [foundUser] = await db
        .select({ id: user.id, email: user.email })
        .from(user)
        .where(eq(user.email, email))
        .limit(1);

      if (!foundUser) {
        return Response.json(
          { error: "User not found with this email" },
          { status: 404 }
        );
      }

      userIdToAdd = foundUser.id;
    }

    if (!userIdToAdd) {
      return Response.json(
        { error: "User ID or email is required" },
        { status: 400 }
      );
    }

    // Check if user already a member
    const [existing] = await db
      .select()
      .from(sferaMember)
      .where(
        and(
          eq(sferaMember.sferaId, sferaId),
          eq(sferaMember.userId, userIdToAdd)
        )
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
      userId: userIdToAdd,
      role,
      joinedAt: new Date(),
    });

    // Return member info
    const [addedUser] = await db
      .select({ userId: user.id, email: user.email })
      .from(user)
      .where(eq(user.id, userIdToAdd))
      .limit(1);

    return Response.json(
      {
        success: true,
        member: {
          userId: userIdToAdd,
          email: addedUser.email,
          role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to add member:", error);
    return Response.json({ error: "Failed to add member" }, { status: 500 });
  }
}

// DELETE /api/sfera/[id]/members - Remove member from Sfera
export async function DELETE(request: Request, context: RouteContext) {
  const session = await auth();

  if (!session || !session.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: sferaId } = await context.params;

  try {
    const body = await request.json();
    const { userId: userIdToRemove } = body;

    if (!userIdToRemove) {
      return Response.json({ error: "User ID is required" }, { status: 400 });
    }

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
    return Response.json({ error: "Failed to remove member" }, { status: 500 });
  }
}
