import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { createArea, getAreasByUserId } from "@/lib/db/queries";

// GET /api/areas - Get all areas for current user
export async function GET() {
  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const areas = await getAreasByUserId({ userId: session.user.id });
    return NextResponse.json({ areas });
  } catch (error) {
    console.error("Failed to get areas:", error);
    return NextResponse.json({ error: "Failed to get areas" }, { status: 500 });
  }
}

// POST /api/areas - Create new area
export async function POST(request: Request) {
  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, description, visibility = "private" } = body;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const area = await createArea({
      title,
      description,
      ownerId: session.user.id,
      visibility,
    });

    return NextResponse.json({ area }, { status: 201 });
  } catch (error) {
    console.error("Failed to create area:", error);
    return NextResponse.json(
      { error: "Failed to create area" },
      { status: 500 }
    );
  }
}
