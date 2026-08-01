import { type NextRequest, NextResponse } from "next/server";
import { signIn } from "@/app/(auth)/auth";
import { startOnboardingAfterSignIn } from "@/lib/onboarding/ensure-onboarding";

// The interview is generated in `after()`, so the route must stay alive past
// the response for the length of a model call.
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

    if (!code || !email) {
      return NextResponse.json(
        { success: false, error: "Missing code or email" },
        { status: 400 }
      );
    }

    const result = await signIn("credentials", {
      token: code,
      email,
      redirect: false,
    });

    if (result?.error) {
      return NextResponse.json(
        { success: false, error: "Неверный или просроченный код" },
        { status: 401 }
      );
    }

    // Onboarding is started server-side so it does not depend on the client
    // surviving long enough to fire a follow-up request.
    const sferaId = await startOnboardingAfterSignIn(email);

    return NextResponse.json({ success: true, sferaId });
  } catch (error: any) {
    if (error?.type === "CredentialsSignin" || error?.code === "credentials") {
      return NextResponse.json(
        { success: false, error: "Неверный или просроченный код" },
        { status: 401 }
      );
    }
    console.error("Error verifying code:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
