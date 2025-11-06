import { db } from "@/lib/db";
import { sfera, sferaMember, user } from "@/lib/db/schema";
import { auth } from "@/app/(auth)/auth";
import { eq, desc, and, inArray } from "drizzle-orm";

// GET /api/sfera - List all Sferas for current user
export async function GET(request: Request) {
  const session = await auth();

  if (!session || !session.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all Sferas where user is a member
    const userSferas = await db
      .select({
        id: sfera.id,
        title: sfera.title,
        description: sfera.description,
        ownerId: sfera.ownerId,
        visibility: sfera.visibility,
        createdAt: sfera.createdAt,
        updatedAt: sfera.updatedAt,
        role: sferaMember.role,
      })
      .from(sfera)
      .innerJoin(sferaMember, eq(sfera.id, sferaMember.sferaId))
      .where(eq(sferaMember.userId, session.user.id))
      .orderBy(desc(sfera.updatedAt));

    return Response.json({ sferas: userSferas });
  } catch (error) {
    console.error("Failed to fetch sferas:", error);
    return Response.json(
      { error: "Failed to fetch sferas" },
      { status: 500 }
    );
  }
}

// POST /api/sfera - Create new Sfera
export async function POST(request: Request) {
  const session = await auth();

  if (!session || !session.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, description, visibility = "private", memberIds = [], memberEmails = [] } = body;

    if (!title) {
      return Response.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    // At least one member must be added (besides owner)
    if ((!memberIds || memberIds.length === 0) && (!memberEmails || memberEmails.length === 0)) {
      return Response.json(
        { error: "At least one member must be added to create a Sfera" },
        { status: 400 }
      );
    }

    // Resolve emails to user IDs if provided
    let resolvedMemberIds = [...memberIds];
    if (memberEmails && memberEmails.length > 0) {
      const users = await db
        .select({ id: user.id })
        .from(user)
        .where(inArray(user.email, memberEmails));

      if (users.length === 0) {
        return Response.json(
          { error: "No users found with provided emails" },
          { status: 400 }
        );
      }

      resolvedMemberIds = [...resolvedMemberIds, ...users.map(u => u.id)];
    }

    // Create Sfera
    const [newSfera] = await db
      .insert(sfera)
      .values({
        title,
        description: description || null,
        ownerId: session.user.id,
        visibility,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Add owner as member
    await db.insert(sferaMember).values({
      sferaId: newSfera.id,
      userId: session.user.id,
      role: "owner",
      joinedAt: new Date(),
    });

    // Add other members
    if (resolvedMemberIds.length > 0) {
      // Remove duplicates and owner
      const uniqueMemberIds = [...new Set(resolvedMemberIds)].filter(
        id => id !== session.user.id
      );

      if (uniqueMemberIds.length > 0) {
        const memberValues = uniqueMemberIds.map((userId: string) => ({
          sferaId: newSfera.id,
          userId,
          role: "member" as const,
          joinedAt: new Date(),
        }));

        await db.insert(sferaMember).values(memberValues);
      }
    }

    return Response.json({ sfera: newSfera }, { status: 201 });
  } catch (error) {
    console.error("Failed to create sfera:", error);
    return Response.json(
      { error: "Failed to create sfera" },
      { status: 500 }
    );
  }
}
