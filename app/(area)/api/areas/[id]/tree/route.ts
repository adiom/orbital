import { auth } from "@/app/(auth)/auth";
import { getAreaById, getAreasByUserId } from "@/lib/db/queries";
import { NextResponse } from "next/server";

interface AreaTreeNode {
  id: string;
  title: string;
  description: string | null;
  parentAreaId: string | null;
  forkedAt: Date | null;
  children: AreaTreeNode[];
  hasAccess: boolean;
}

async function buildAreaTree(
  areaId: string,
  userId: string,
  userAreas: Set<string>
): Promise<AreaTreeNode | null> {
  try {
    const area = await getAreaById({ id: areaId });
    if (!area) return null;

    const hasAccess = userAreas.has(area.id);

    // Get all areas and find children
    const allAreas = await getAreasByUserId({ userId });
    const children = allAreas
      .filter((a) => a.parentAreaId === areaId)
      .map((child) => ({
        id: child.id,
        title: child.title,
        description: child.description,
        parentAreaId: child.parentAreaId,
        forkedAt: child.forkedAt,
        children: [],
        hasAccess: userAreas.has(child.id),
      }));

    return {
      id: area.id,
      title: area.title,
      description: area.description,
      parentAreaId: area.parentAreaId,
      forkedAt: area.forkedAt,
      children,
      hasAccess,
    };
  } catch (error) {
    console.error(`Error building tree for area ${areaId}:`, error);
    return null;
  }
}

// GET /api/areas/[id]/tree - Get area tree (parent + children)
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

    // Get all user's areas for access checking
    const userAreas = await getAreasByUserId({ userId: session.user.id });
    const userAreaIds = new Set(userAreas.map((a) => a.id));

    // Check access to current area
    if (!userAreaIds.has(params.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Build tree starting from root
    let rootAreaId = params.id;
    let currentArea = area;

    // Find root area
    while (currentArea.parentAreaId) {
      const parent = await getAreaById({ id: currentArea.parentAreaId });
      if (!parent) break;
      rootAreaId = parent.id;
      currentArea = parent;
    }

    // Build complete tree from root
    const tree = await buildAreaTree(rootAreaId, session.user.id, userAreaIds);

    // Find path from root to current area
    const path: string[] = [];
    let pathArea = area;
    while (pathArea) {
      path.unshift(pathArea.id);
      if (!pathArea.parentAreaId) break;
      const parent = await getAreaById({ id: pathArea.parentAreaId });
      if (!parent) break;
      pathArea = parent;
    }

    return NextResponse.json({
      tree,
      currentAreaId: params.id,
      path,
    });
  } catch (error) {
    console.error("Error getting area tree:", error);
    return NextResponse.json(
      { error: "Failed to get area tree" },
      { status: 500 }
    );
  }
}
