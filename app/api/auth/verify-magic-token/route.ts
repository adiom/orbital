import { type NextRequest, NextResponse } from "next/server";
import { signIn } from "@/app/(auth)/auth";

export async function POST(request: NextRequest) {
  try {
    const { token, email } = await request.json();

    if (!token || !email) {
      return NextResponse.json(
        { success: false, error: "Missing token or email" },
        { status: 400 }
      );
    }

    const result = await signIn("credentials", {
      token,
      email,
      redirect: false,
    });

    if (result?.error) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error verifying magic token:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
