/**
 * Onboarding: Save User Profile Tool
 *
 * Saves collected onboarding facts into user.settings.onboarding.
 * Used exclusively by the onboarding agent after completing the interview.
 */

import { eq } from "drizzle-orm";
import { tool } from "ai";
import { z } from "zod";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";

export const saveOnboardingProfile = tool({
  description:
    "Save the user's onboarding profile after completing the interview. " +
    "Call this ONCE after all 5-6 questions have been answered and you have a summary. " +
    "This marks the onboarding as completed.",

  inputSchema: z.object({
    userId: z.string().describe("The ID of the user being onboarded"),
    name: z.string().describe("User's name or how they introduced themselves"),
    role: z
      .string()
      .describe("What the user does — their profession, role, or occupation"),
    interests: z
      .string()
      .describe("What the user is interested in — hobbies, topics, domains"),
    goals: z
      .string()
      .describe("What the user wants to achieve with Orbital — their use case"),
    context: z
      .string()
      .describe(
        "Additional context — what they're working on, tools they use, anything notable"
      ),
  }),

  execute: async ({ userId, name, role, interests, goals, context }) => {
    try {
      // Read current user settings
      const [currentUser] = await db
        .select({ settings: user.settings })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);

      if (!currentUser) {
        return {
          success: false,
          error: "User not found",
        };
      }

      const currentSettings = (currentUser.settings as Record<string, any>) || {};

      // Merge onboarding data into settings
      const updatedSettings = {
        ...currentSettings,
        onboarding: {
          completed: true,
          name,
          role,
          interests,
          goals,
          context,
          completedAt: new Date().toISOString(),
        },
      };

      // Write back to user.settings
      await db
        .update(user)
        .set({ settings: updatedSettings })
        .where(eq(user.id, userId));

      console.log(`✅ Onboarding profile saved for user ${userId}`);

      return {
        success: true,
        message: "Профиль сохранён. Онбординг завершён.",
      };
    } catch (error) {
      console.error("❌ Failed to save onboarding profile:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to save profile",
      };
    }
  },
});
