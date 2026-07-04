import { eq } from "drizzle-orm";
import { auth } from "@/app/(auth)/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";

type UserSettings = {
  autoArchive?: boolean;
};

const DEFAULT_SETTINGS: UserSettings = {
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

    // Merge with defaults
    const currentSettings: UserSettings = {
      ...DEFAULT_SETTINGS,
      ...settings,
    };

    await db
      .update(user)
      .set({ settings: currentSettings })
      .where(eq(user.id, session.user.id));

    return Response.json({ settings: currentSettings });
  } catch (error) {
    console.error("Failed to update settings:", error);
    return Response.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
