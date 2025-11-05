import { auth } from "@/app/(auth)/auth";
import {
  getAreaById,
  deleteAreaById,
  updateAreaById,
  getAreaMembers,
} from "@/lib/db/queries";
import { NextResponse } from "next/server";

// GET /api/areas/[id] - Get area by ID
export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const area = await getAreaById({ id: params.id });

    if (!area) {
      return NextResponse.json({ error: "Area not found" }, { status: 404 });
    }

    // Check if user has access
    const members = await getAreaMembers({ areaId: params.id });
    const hasAccess = members.some((m) => m.userId === session.user.id);

    if (!hasAccess && area.visibility === "private") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ area, members });
  } catch (error) {
    console.error("Failed to get area:", error);
    return NextResponse.json({ error: "Failed to get area" }, { status: 500 });
  }
}

// PATCH /api/areas/[id] - Update area
export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const area = await getAreaById({ id: params.id });

    if (!area) {
      return NextResponse.json({ error: "Area not found" }, { status: 404 });
    }

    // Check if user is owner or admin
    const members = await getAreaMembers({ areaId: params.id });
    const userMember = members.find((m) => m.userId === session.user.id);

    if (!userMember || !["owner", "admin"].includes(userMember.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, visibility } = body;

    const updated = await updateAreaById({
      id: params.id,
      title,
      description,
      visibility,
    });

    return NextResponse.json({ area: updated });
  } catch (error) {
    console.error("Failed to update area:", error);
    return NextResponse.json(
      { error: "Failed to update area" },
      { status: 500 }
    );
  }
}

// DELETE /api/areas/[id] - Delete area
export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const area = await getAreaById({ id: params.id });

    if (!area) {
      return NextResponse.json({ error: "Area not found" }, { status: 404 });
    }

    // Only owner can delete
    if (area.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await deleteAreaById({ id: params.id });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete area:", error);
    return NextResponse.json(
      { error: "Failed to delete area" },
      { status: 500 }
    );
  }
}
