/**
 * Onboarding bootstrap
 *
 * Creates the onboarding space ("Давай познакомимся") for a new user and
 * prepares the first exchange with the onboarding agent.
 *
 * This lives outside the route layer because a user can arrive through several
 * sign-in paths (magic-link URL, manual code entry, direct token verification),
 * and every one of them must land in the same place. `streamAgentResponse` has
 * no dependency on the request context, so the only piece that must stay in the
 * route is scheduling it via `after()`.
 */

import { eq } from "drizzle-orm";
import { after } from "next/server";
import { streamAgentResponse } from "@/lib/ai/agents/base-streamer";
import { getAgentById } from "@/lib/ai/agents/registry";
import { db } from "@/lib/db";
import { sfera, sferaMember, sferaMessage, user } from "@/lib/db/schema";
import { mergeOnboarding } from "./merge-settings";

const ONBOARDING_AGENT_ID = "00000000-0000-0000-0000-000000000009";
const ONBOARDING_AGENT_EMAIL = "onboarding@avrora.click";

/**
 * Written to the agent message when the interview cannot be generated, so the
 * user gets a warm dead end instead of a raw `Error: ...` string.
 */
const FALLBACK_GREETING =
  "Привет! Рада, что ты здесь 🙂 Я — Аврора, твой проводник. " +
  "Сейчас я немного не в форме и не могу ответить, но это не помешает тебе начать. " +
  "Просто закрой это окно и создай свою первую мысль — я подключусь позже.";

export type EnsureOnboardingResult = {
  /** The onboarding space, or null when onboarding is already completed. */
  sferaId: string | null;
  /** True only when this call created the space. */
  created: boolean;
  /**
   * Generates the agent's opening question. Present only when `created` is
   * true. Callers in a route handler should pass this to `after()` so the
   * response is not blocked by the model call.
   */
  runInterview?: () => Promise<void>;
};

/**
 * Idempotent: safe to call on every sign-in. Returns the existing space when
 * one is already recorded, and does nothing once onboarding is completed.
 */
export async function ensureOnboardingSpace(
  userId: string
): Promise<EnsureOnboardingResult> {
  const [currentUser] = await db
    .select({ settings: user.settings })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!currentUser) {
    return { sferaId: null, created: false };
  }

  const settings = currentUser.settings ?? {};

  if (settings.onboarding?.completed) {
    return { sferaId: null, created: false };
  }

  if (settings.onboarding?.sferaId) {
    return { sferaId: settings.onboarding.sferaId, created: false };
  }

  const onboardingAgent = getAgentById("onboarding");
  if (!onboardingAgent) {
    throw new Error("Onboarding agent not found in registry");
  }

  // The agent posts as a real user row, which may not exist on a fresh install.
  const [agentUser] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.id, ONBOARDING_AGENT_ID))
    .limit(1);

  if (!agentUser) {
    await db
      .insert(user)
      .values({ id: ONBOARDING_AGENT_ID, email: ONBOARDING_AGENT_EMAIL })
      .onConflictDoNothing();
  }

  const [newSfera] = await db
    .insert(sfera)
    .values({
      title: "Давай познакомимся",
      description: "Первое знакомство с Orbital",
      ownerId: userId,
      visibility: "private",
    })
    .returning();

  await db.insert(sferaMember).values([
    {
      sferaId: newSfera.id,
      userId,
      role: "owner",
      joinedAt: new Date(),
    },
    {
      sferaId: newSfera.id,
      userId: ONBOARDING_AGENT_ID,
      role: "member",
      joinedAt: new Date(),
    },
  ]);

  // The user's opening line is what the agent responds to.
  const [userMessage] = await db
    .insert(sferaMessage)
    .values({
      sferaId: newSfera.id,
      userId,
      content: "@гид Привет!",
      isForked: false,
      forkCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

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

  await mergeOnboardingSettings(userId, { sferaId: newSfera.id });

  const runInterview = async () => {
    // streamAgentResponse handles its own errors and reports them through the
    // return value rather than throwing, so success is checked, not caught.
    let failed: boolean;

    try {
      const result = await streamAgentResponse({
        sferaId: newSfera.id,
        triggerMessageId: userMessage.id,
        targetMessageId: agentMessage.id,
        requestingUserId: userId,
        agent: onboardingAgent,
      });
      failed = !result.success;
      if (failed) {
        console.error("Onboarding agent streaming failed:", result.error);
      }
    } catch (err) {
      failed = true;
      console.error("Onboarding agent streaming threw:", err);
    }

    if (!failed) {
      return;
    }

    // On failure the agent message holds either an empty body or a raw error
    // string, and would otherwise be the first thing a new user ever sees.
    try {
      await db
        .update(sferaMessage)
        .set({
          content: FALLBACK_GREETING,
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
  };

  return { sferaId: newSfera.id, created: true, runInterview };
}

type OnboardingSettings = NonNullable<
  NonNullable<typeof user.$inferSelect.settings>["onboarding"]
>;

/**
 * Read-modify-write of `settings.onboarding`.
 *
 * `settings` is a single JSONB column, so a blind write drops every sibling
 * key. Callers must never `set({ settings })` from a partial object.
 */
export async function mergeOnboardingSettings(
  userId: string,
  patch: Partial<OnboardingSettings>
): Promise<void> {
  const [currentUser] = await db
    .select({ settings: user.settings })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!currentUser) {
    return;
  }

  await db
    .update(user)
    .set({ settings: mergeOnboarding(currentUser.settings, patch) })
    .where(eq(user.id, userId));
}

/**
 * Starts onboarding for the freshly signed-in user and schedules the interview.
 *
 * Takes the email rather than reading the session, because `auth()` cannot see
 * a session created by `signIn()` earlier in the same request — the cookie is
 * still travelling out in the response. Looking the user up by the email that
 * was just authenticated is the only reliable handle at this point.
 *
 * Best-effort by design: a failure here must never turn a successful sign-in
 * into an error, so the caller simply gets `null` and the user lands on the
 * home page.
 *
 * Routes using this must set `maxDuration` high enough to cover the interview,
 * since `after()` is bounded by the route's max duration.
 */
export async function startOnboardingAfterSignIn(
  email: string
): Promise<string | null> {
  try {
    const [signedInUser] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    if (!signedInUser) {
      return null;
    }

    const { sferaId, created, runInterview } = await ensureOnboardingSpace(
      signedInUser.id
    );

    if (created && runInterview) {
      after(runInterview);
    }

    return sferaId;
  } catch (err) {
    console.error("Failed to start onboarding after sign-in:", err);
    return null;
  }
}
