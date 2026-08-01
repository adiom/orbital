/**
 * Pure merge helpers for the `User.settings` JSONB column.
 *
 * `settings` is a single column shared by unrelated features (onboarding state,
 * user preferences). Writing a partial object straight to it silently drops
 * every sibling key — that is how `onboarding.completed` and `onboarding.sferaId`
 * used to get wiped by an unrelated preference update.
 *
 * These functions hold no DB or server-only imports so they can be unit tested
 * directly.
 */

import type { user } from "@/lib/db/schema";

export type StoredSettings = NonNullable<typeof user.$inferSelect.settings>;
export type OnboardingSettings = NonNullable<StoredSettings["onboarding"]>;

/**
 * Applies a patch to `settings.onboarding`, preserving both sibling top-level
 * keys and untouched onboarding fields.
 */
export function mergeOnboarding(
  current: StoredSettings | null | undefined,
  patch: Partial<OnboardingSettings>
): StoredSettings {
  const settings = current ?? {};

  return {
    ...settings,
    onboarding: {
      completed: false,
      ...settings.onboarding,
      ...patch,
    },
  };
}

/**
 * Applies user-editable preferences, leaving everything else — onboarding
 * included — exactly as stored.
 */
export function mergePreferences(
  current: StoredSettings | null | undefined,
  patch: { autoArchive?: boolean },
  defaults: { autoArchive: boolean }
): StoredSettings {
  const settings = current ?? {};

  return {
    ...settings,
    autoArchive:
      patch.autoArchive ?? settings.autoArchive ?? defaults.autoArchive,
  };
}
