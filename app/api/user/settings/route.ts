import { eq } from "drizzle-orm";
import { auth } from "@/app/(auth)/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { mergePreferences } from "@/lib/onboarding/merge-settings";

/** Only these keys may be written through this endpoint. */
type UserSettings = {
  autoArchive?: boolean;
};

const DEFAULT_SETTINGS: Required<UserSettings> = {
  autoArchive: true,
};

// GET /api/user/settings - Get current user's settings
export async function GET() {
  const session = await auth();

  if (!session || !session.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [row] = await db
      .select({ settings: user.settings })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    const settings: UserSettings = {
      ...DEFAULT_SETTINGS,
      ...((row?.settings as UserSettings) || {}),
    };

    return Response.json({ settings });
  } catch (error) {
    console.error("Failed to fetch settings:", error);
    return Response.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

// PUT /api/user/settings - Update current user's settings
export async function PUT(request: Request) {
  const session = await auth();

  if (!session || !session.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { settings } = body as { settings: Partial<UserSettings> };

    if (!settings || typeof settings !== "object") {
      return Response.json(
        { error: "Settings must be an object" },
        { status: 400 }
      );
    }

    // `settings` is a single JSONB column shared with onboarding state, so it
    // must be read-modify-written. Writing the request body straight through
    // would silently wipe `onboarding.completed` and `onboarding.sferaId`.
    const [row] = await db
      .select({ settings: user.settings })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    const merged = mergePreferences(row?.settings, settings, DEFAULT_SETTINGS);

    await db
      .update(user)
      .set({ settings: merged })
      .where(eq(user.id, session.user.id));

    return Response.json({ settings: merged });
  } catch (error) {
    console.error("Failed to update settings:", error);
    return Response.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
