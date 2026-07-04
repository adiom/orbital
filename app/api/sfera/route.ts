import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import { auth } from "@/app/(auth)/auth";
import { db } from "@/lib/db";
import {
  sfera,
  sferaForkedSfera,
  sferaMember,
  sferaMessage,
  user,
} from "@/lib/db/schema";

// GET /api/sfera - List all Sferas for current user with fork relationships and activity
export async function GET(_request: Request) {
  const session = await auth();

  if (!session || !session.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
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

    // Activity data
    const messageCountsMap = new Map<string, number>();
    const lastMessageAtMap = new Map<string, Date | null>();
    const memberCountsMap = new Map<string, number>();
    const participantsMap = new Map<
      string,
      Array<{ id: string; name: string; image: string | null }>
    >();

    if (sferaIds.length > 0) {
      const messageStats = await db
        .select({
          sferaId: sferaMessage.sferaId,
          messageCount: count(),
          lastMessageAt: sql<Date>`max(${sferaMessage.createdAt})`,
        })
        .from(sferaMessage)
        .where(inArray(sferaMessage.sferaId, sferaIds))
        .groupBy(sferaMessage.sferaId);

      for (const row of messageStats) {
        messageCountsMap.set(row.sferaId, row.messageCount);
        lastMessageAtMap.set(row.sferaId, row.lastMessageAt);
      }

      const memberStats = await db
        .select({
          sferaId: sferaMember.sferaId,
          memberCount: count(),
        })
        .from(sferaMember)
        .where(inArray(sferaMember.sferaId, sferaIds))
        .groupBy(sferaMember.sferaId);

      for (const row of memberStats) {
        memberCountsMap.set(row.sferaId, row.memberCount);
      }

      const recentAuthorRows = await db
        .select({
          sferaId: sferaMessage.sferaId,
          userId: sferaMessage.userId,
          userName: user.name,
          userAvatar: user.avatarUrl,
        })
        .from(sferaMessage)
        .innerJoin(user, eq(sferaMessage.userId, user.id))
        .where(inArray(sferaMessage.sferaId, sferaIds))
        .orderBy(desc(sferaMessage.createdAt))
        .limit(sferaIds.length * 3);

      for (const row of recentAuthorRows) {
        const existing = participantsMap.get(row.sferaId) || [];
        if (existing.length < 3 && !existing.some((p) => p.id === row.userId)) {
          existing.push({
            id: row.userId,
            name: row.userName || "Unknown",
            image: row.userAvatar,
          });
        }
        participantsMap.set(row.sferaId, existing);
      }
    }

    const sferasWithActivity = userSferas.map((sfera) => ({
      ...sfera,
      messageCount: messageCountsMap.get(sfera.id) || 0,
      memberCount: memberCountsMap.get(sfera.id) || 0,
      lastMessageAt: lastMessageAtMap.get(sfera.id) || null,
      recentParticipants: participantsMap.get(sfera.id) || [],
    }));

    return Response.json({
      sferas: sferasWithActivity,
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
