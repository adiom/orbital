import { and, desc, eq, inArray } from "drizzle-orm";
import { auth } from "@/app/(auth)/auth";
import { db } from "@/lib/db";
import { sfera, sferaForkedSfera, sferaMember, user } from "@/lib/db/schema";

// GET /api/sfera - List all Sferas for current user with fork relationships
export async function GET(_request: Request) {
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

    // Get fork relationships for these Sferas
    const sferaIds = userSferas.map((s) => s.id);

    let forkRelationships: {
      parentSferaId: string;
      forkedSferaId: string;
      createdAt: Date;
    }[] = [];
    if (sferaIds.length > 0) {
      forkRelationships = await db
        .select({
          parentSferaId: sferaForkedSfera.parentSferaId,
          forkedSferaId: sferaForkedSfera.forkedSferaId,
          createdAt: sferaForkedSfera.createdAt,
        })
        .from(sferaForkedSfera)
        .where(
          and(
            inArray(sferaForkedSfera.parentSferaId, sferaIds),
            inArray(sferaForkedSfera.forkedSferaId, sferaIds)
          )
        );
    }

    return Response.json({
      sferas: userSferas,
      forkRelationships,
    });
  } catch (error) {
    console.error("Failed to fetch sferas:", error);
    return Response.json({ error: "Failed to fetch sferas" }, { status: 500 });
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
    const { title, description, visibility = "private" } = body;

    const DEFAULT_MEMBER_EMAIL = "avrora@avrora.click";
    const orbitTitle =
      title || `Orbit ${Math.floor(1000 + Math.random() * 9000)}`;

    const users = await db
      .select({ id: user.id })
      .from(user)
      .where(inArray(user.email, [DEFAULT_MEMBER_EMAIL]));

    const avroraUserId = users[0]?.id;

    const [newSfera] = await db
      .insert(sfera)
      .values({
        title: orbitTitle,
        description: description || null,
        ownerId: session.user.id,
        visibility,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    await db.insert(sferaMember).values({
      sferaId: newSfera.id,
      userId: session.user.id,
      role: "owner",
      joinedAt: new Date(),
    });

    if (avroraUserId && avroraUserId !== session.user.id) {
      await db.insert(sferaMember).values({
        sferaId: newSfera.id,
        userId: avroraUserId,
        role: "member",
        joinedAt: new Date(),
      });
    }

    return Response.json({ sfera: newSfera }, { status: 201 });
  } catch (error) {
    console.error("Failed to create sfera:", error);
    return Response.json({ error: "Failed to create sfera" }, { status: 500 });
  }
}
