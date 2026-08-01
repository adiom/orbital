/**
 * Settings merge tests
 *
 * `User.settings` is a single JSONB column shared by onboarding state and user
 * preferences. These tests pin the regression where a partial write wiped
 * unrelated keys.
 */

import { describe, expect, it } from "vitest";
import { mergeOnboarding, mergePreferences } from "./merge-settings";

const DEFAULTS = { autoArchive: true };

describe("mergePreferences", () => {
  it("preserves onboarding state when a preference changes", () => {
    const stored = {
      autoArchive: true,
      onboarding: {
        completed: true,
        sferaId: "abc-123",
        name: "Иван",
      },
    };

    const merged = mergePreferences(stored, { autoArchive: false }, DEFAULTS);

    expect(merged.autoArchive).toBe(false);
    expect(merged.onboarding).toEqual(stored.onboarding);
  });

  it("ignores keys the endpoint does not own", () => {
    const stored = {
      onboarding: { completed: true, sferaId: "abc-123" },
    };

    const merged = mergePreferences(
      stored,
      // A caller trying to smuggle in onboarding state through preferences.
      { autoArchive: false, onboarding: { completed: false } } as never,
      DEFAULTS
    );

    expect(merged.onboarding).toEqual({ completed: true, sferaId: "abc-123" });
  });

  it("falls back to the stored value, then the default", () => {
    expect(mergePreferences({ autoArchive: false }, {}, DEFAULTS).autoArchive).toBe(
      false
    );
    expect(mergePreferences({}, {}, DEFAULTS).autoArchive).toBe(true);
    expect(mergePreferences(null, {}, DEFAULTS).autoArchive).toBe(true);
  });
});

describe("mergeOnboarding", () => {
  it("keeps sferaId when the interview completes", () => {
    const stored = {
      onboarding: { completed: false, sferaId: "abc-123" },
    };

    const merged = mergeOnboarding(stored, {
      completed: true,
      name: "Иван",
      completedAt: "2026-08-01T00:00:00.000Z",
    });

    expect(merged.onboarding).toEqual({
      completed: true,
      sferaId: "abc-123",
      name: "Иван",
      completedAt: "2026-08-01T00:00:00.000Z",
    });
  });

  it("preserves sibling top-level keys", () => {
    const merged = mergeOnboarding(
      { autoArchive: false },
      { sferaId: "abc-123" }
    );

    expect(merged.autoArchive).toBe(false);
    expect(merged.onboarding).toEqual({ completed: false, sferaId: "abc-123" });
  });

  it("defaults completed to false on a fresh record", () => {
    expect(mergeOnboarding(null, { sferaId: "abc-123" })).toEqual({
      onboarding: { completed: false, sferaId: "abc-123" },
    });
  });
});
