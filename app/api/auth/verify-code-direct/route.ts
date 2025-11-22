"use server";

import { type NextRequest, NextResponse } from "next/server";
import { signIn } from "@/app/(auth)/auth";

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

    if (!code || !email) {
      return NextResponse.json(
        { success: false, error: "Missing code or email" },
        { status: 400 }
      );
    }

    // Создать сессию через NextAuth - вся логика в auth.ts
    const result = await signIn("credentials", {
      token: code,
      email: email,
      redirect: false,
    });

    if (result?.error) {
      return NextResponse.json(
        { success: false, error: "Неверный или просроченный код" },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error verifying code:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
