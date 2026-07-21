import { eq } from "drizzle-orm";
import { auth } from "@/app/(auth)/auth";
import { streamAgentResponse } from "@/lib/ai/agents/base-streamer";
import { getAgentById } from "@/lib/ai/agents/registry";
import { db } from "@/lib/db";
import { sfera, sferaMember, sferaMessage, user } from "@/lib/db/schema";

const ONBOARDING_AGENT_ID = "00000000-0000-0000-0000-000000000009";
const ONBOARDING_AGENT_EMAIL = "onboarding@avrora.click";

// POST /api/onboarding/start - Create onboarding sfera and kick off the interview
export async function POST(_request: Request) {
  const session = await auth();

  if (!session || !session.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if user already completed onboarding
    const [currentUser] = await db
      .select({ settings: user.settings })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    const settings = (currentUser?.settings as Record<string, any>) || {};
    if (settings.onboarding?.completed) {
      return Response.json(
        { error: "Onboarding already completed" },
        { status: 400 }
      );
    }

    // Check if onboarding sfera already exists for this user
    const [existingOnboarding] = await db
      .select({ sferaId: user.settings })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    const existingSettings =
      (existingOnboarding?.sferaId as Record<string, any>) || {};
    if (existingSettings.onboarding?.sferaId) {
      return Response.json({ sferaId: existingSettings.onboarding.sferaId });
    }

    // Ensure onboarding agent user exists
    const [agentUser] = await db
      .select()
      .from(user)
      .where(eq(user.id, ONBOARDING_AGENT_ID))
      .limit(1);

    if (!agentUser) {
      await db.insert(user).values({
        id: ONBOARDING_AGENT_ID,
        email: ONBOARDING_AGENT_EMAIL,
      });
    }

    // Create onboarding sfera
    const [newSfera] = await db
      .insert(sfera)
      .values({
        title: "Давай познакомимся",
        description: "Первое знакомство с Orbital",
        ownerId: session.user.id,
        visibility: "private",
      })
      .returning();

    // Add user as owner
    await db.insert(sferaMember).values({
      sferaId: newSfera.id,
      userId: session.user.id,
      role: "owner",
      joinedAt: new Date(),
    });

    // Add onboarding agent as member
    await db.insert(sferaMember).values({
      sferaId: newSfera.id,
      userId: ONBOARDING_AGENT_ID,
      role: "member",
      joinedAt: new Date(),
    });

    // Create first message from user (triggers agent)
    const [userMessage] = await db
      .insert(sferaMessage)
      .values({
        sferaId: newSfera.id,
        userId: session.user.id,
        content: "@гид Привет!",
        isForked: false,
        forkCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Create empty agent message for streaming
    const [agentMessage] = await db
      .insert(sferaMessage)
      .values({
        sferaId: newSfera.id,
        userId: ONBOARDING_AGENT_ID,
        content: "",
        parentMessageId: userMessage.id,
        isForked: false,
        forkCount: 0,
        isGenerating: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Get the onboarding agent config
    const onboardingAgent = getAgentById("onboarding");
    if (!onboardingAgent) {
      throw new Error("Onboarding agent not found in registry");
    }

    // Stream agent response in background (fire-and-forget).
    // On failure the empty agent message must NOT stay `isGenerating: true`,
    // otherwise the user is stuck staring at a permanent spinner. Replace it
    // with a friendly fallback so onboarding degrades gracefully (e.g. when the
    // AI provider is unavailable).
    setTimeout(async () => {
      try {
        await streamAgentResponse({
          sferaId: newSfera.id,
          triggerMessageId: userMessage.id,
          targetMessageId: agentMessage.id,
          requestingUserId: session.user.id,
          agent: onboardingAgent,
        });
      } catch (err) {
        console.error("Onboarding agent streaming failed:", err);
        try {
          await db
            .update(sferaMessage)
            .set({
              content:
                "Привет! Рада, что ты здесь 🙂 Я — Аврора, твой проводник. " +
                "Сейчас я немного не в форме и не могу ответить, но это не помешает тебе начать. " +
                "Просто закрой это окно и создай свою первую мысль — я подключусь позже.",
              isGenerating: false,
              updatedAt: new Date(),
            })
            .where(eq(sferaMessage.id, agentMessage.id));
        } catch (fallbackErr) {
          console.error(
            "Failed to write onboarding fallback message:",
            fallbackErr
          );
        }
      }
    }, 0);

    // Save sfera ID to user settings
    const updatedSettings = {
      ...settings,
      onboarding: {
        ...settings.onboarding,
        sferaId: newSfera.id,
      },
    };
    await db
      .update(user)
      .set({ settings: updatedSettings })
      .where(eq(user.id, session.user.id));

    return Response.json({ sferaId: newSfera.id }, { status: 201 });
  } catch (error) {
    console.error("Failed to start onboarding:", error);
    return Response.json(
      { error: "Failed to start onboarding" },
      { status: 500 }
    );
  }
}
