import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import {
  addAreaMember,
  getAreaMembers,
  removeAreaMember,
  updateAreaMemberRole,
} from "@/lib/db/queries";

// GET /api/areas/[id]/members - Get area members
export async function GET(
  _request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const members = await getAreaMembers({ areaId: params.id });
    return NextResponse.json({ members });
  } catch (error) {
    console.error("Failed to get area members:", error);
    return NextResponse.json(
      { error: "Failed to get area members" },
      { status: 500 }
    );
  }
}

// POST /api/areas/[id]/members - Add member to area
export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if user is owner or admin
    const members = await getAreaMembers({ areaId: params.id });
    const userMember = members.find((m) => m.userId === session.user.id);

    if (!userMember || !["owner", "admin"].includes(userMember.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { userId, role = "member" } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    await addAreaMember({
      areaId: params.id,
      userId,
      role,
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Failed to add area member:", error);
    return NextResponse.json(
      { error: "Failed to add area member" },
      { status: 500 }
    );
  }
}

// PATCH /api/areas/[id]/members - Update member role
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
    // Check if user is owner or admin
    const members = await getAreaMembers({ areaId: params.id });
    const userMember = members.find((m) => m.userId === session.user.id);

    if (!userMember || !["owner", "admin"].includes(userMember.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { userId, role } = body;

    if (!userId || !role) {
      return NextResponse.json(
        { error: "userId and role are required" },
        { status: 400 }
      );
    }

    await updateAreaMemberRole({
      areaId: params.id,
      userId,
      role,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update member role:", error);
    return NextResponse.json(
      { error: "Failed to update member role" },
      { status: 500 }
    );
  }
}

// DELETE /api/areas/[id]/members?userId=xxx - Remove member from area
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
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    // Check if user is owner or admin
    const members = await getAreaMembers({ areaId: params.id });
    const userMember = members.find((m) => m.userId === session.user.id);

    if (!userMember || !["owner", "admin"].includes(userMember.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Can't remove owner
    const targetMember = members.find((m) => m.userId === userId);
    if (targetMember?.role === "owner") {
      return NextResponse.json(
        { error: "Cannot remove area owner" },
        { status: 400 }
      );
    }

    await removeAreaMember({
      areaId: params.id,
      userId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to remove area member:", error);
    return NextResponse.json(
      { error: "Failed to remove area member" },
      { status: 500 }
    );
  }
}
