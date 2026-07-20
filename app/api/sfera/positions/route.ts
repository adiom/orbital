import { and, eq, inArray } from "drizzle-orm";
import { auth } from "@/app/(auth)/auth";
import { db } from "@/lib/db";
import { sfera, sferaMember } from "@/lib/db/schema";

type PositionUpdate = {
  id: string;
  positionX: number | null;
  positionY: number | null;
};

const MAX_UPDATES = 200;

function isCoord(v: unknown): v is number | null {
  return v === null || (typeof v === "number" && Number.isFinite(v));
}

function isValidUpdate(u: unknown): u is PositionUpdate {
  if (!u || typeof u !== "object") return false;
  const { id, positionX, positionY } = u as Record<string, unknown>;
  return (
    typeof id === "string" &&
    id.length > 0 &&
    isCoord(positionX) &&
    isCoord(positionY)
  );
}

// PATCH /api/sfera/positions - Batch-update node positions on the living map.
// Only owners/admins of a Sfera may move it. Runs in a transaction so a
// multi-node drag is all-or-nothing.
export async function PATCH(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const updates: unknown = body?.updates;

    if (!Array.isArray(updates) || updates.length === 0) {
      return Response.json({ error: "No updates provided" }, { status: 400 });
    }
    if (updates.length > MAX_UPDATES) {
      return Response.json(
        { error: `Too many updates (max ${MAX_UPDATES})` },
        { status: 400 }
      );
    }
    if (!updates.every(isValidUpdate)) {
      return Response.json({ error: "Invalid update payload" }, { status: 400 });
    }

    const validUpdates = updates as PositionUpdate[];
    const ids = [...new Set(validUpdates.map((u) => u.id))];

    // One query: which of these Sferas does the user own/admin?
    const memberships = await db
      .select({ sferaId: sferaMember.sferaId, role: sferaMember.role })
      .from(sferaMember)
      .where(
        and(
          eq(sferaMember.userId, session.user.id),
          inArray(sferaMember.sferaId, ids)
        )
      );

    const editableIds = new Set(
      memberships
        .filter((m) => m.role === "owner" || m.role === "admin")
        .map((m) => m.sferaId)
    );

    const allowed = validUpdates.filter((u) => editableIds.has(u.id));
    if (allowed.length === 0) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.transaction(async (tx) => {
      for (const u of allowed) {
        await tx
          .update(sfera)
          .set({ positionX: u.positionX, positionY: u.positionY })
          .where(eq(sfera.id, u.id));
      }
    });

    return Response.json({ updated: allowed.length });
  } catch (error) {
    console.error("Failed to update sfera positions:", error);
    return Response.json(
      { error: "Failed to update positions" },
      { status: 500 }
    );
  }
}
