import { after } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { ensureOnboardingSpace } from "@/lib/onboarding/ensure-onboarding";

// The interview is generated in `after()`, so the route must stay alive past
// the response for the length of a model call.
export const maxDuration = 60;

// POST /api/onboarding/start - Create onboarding sfera and kick off the interview
export async function POST(_request: Request) {
  const session = await auth();

  if (!session || !session.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { sferaId, created, runInterview } = await ensureOnboardingSpace(
      session.user.id
    );

    if (!sferaId) {
      return Response.json(
        { error: "Onboarding already completed" },
        { status: 400 }
      );
    }

    if (created && runInterview) {
      after(runInterview);
    }

    return Response.json({ sferaId }, { status: created ? 201 : 200 });
  } catch (error) {
    console.error("Failed to start onboarding:", error);
    return Response.json(
      { error: "Failed to start onboarding" },
      { status: 500 }
    );
  }
}
