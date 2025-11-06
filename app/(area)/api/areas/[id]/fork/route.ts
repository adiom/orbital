import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { generateAreaSummary } from "@/lib/ai/area-summary";
import { createArea, getAreaById, getAreaMembers } from "@/lib/db/queries";

// POST /api/areas/[id]/fork - Fork an area
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
    const parentArea = await getAreaById({ id: params.id });

    if (!parentArea) {
      return NextResponse.json(
        { error: "Parent area not found" },
        { status: 404 }
      );
    }

    // Check if user has access to parent area
    const members = await getAreaMembers({ areaId: params.id });
    const hasAccess = members.some((m) => m.userId === session.user.id);

    if (!hasAccess && parentArea.visibility === "private") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { title, description } = body;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // TODO: Gather chat history from parent area
    // For now, we'll use a simple approach
    const chatHistory = `Area was forked from "${parentArea.title}".`;

    // Generate AI summary of parent area
    const inheritedSummary = await generateAreaSummary({
      areaTitle: parentArea.title,
      areaDescription: parentArea.description || undefined,
      chatHistory,
    });

    // Create forked area
    const forkedArea = await createArea({
      title,
      description,
      ownerId: session.user.id,
      visibility: "private", // Forked areas start as private
      parentAreaId: params.id,
      inheritedSummary,
    });

    // Update parent area merge status
    // TODO: Implement updateAreaMergeStatus in queries

    return NextResponse.json(
      {
        area: forkedArea,
        inheritedSummary,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to fork area:", error);
    return NextResponse.json({ error: "Failed to fork area" }, { status: 500 });
  }
}
