import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { getUser } from "@/lib/db/queries";

/**
 * GET /api/users/by-email?email=xxx
 * Find user by email address
 */
export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email parameter is required" },
        { status: 400 }
      );
    }

    const users = await getUser(email);

    if (!users || users.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = users[0];

    // Return only safe user data
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Error finding user:", error);
    return NextResponse.json({ error: "Failed to find user" }, { status: 500 });
  }
}
