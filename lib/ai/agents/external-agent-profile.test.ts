import { afterEach, describe, expect, it } from "vitest";

import {
  buildExternalUserProfile,
  buildMemoryDebugToolResult,
  canAccessPrivateKristinaMemory,
} from "./external-agent-profile";

const originalPrivateMemoryUsers = process.env.CF_KRISTINA_PRIVATE_MEMORY_USERS;

afterEach(() => {
  process.env.CF_KRISTINA_PRIVATE_MEMORY_USERS = originalPrivateMemoryUsers;
});

describe("buildExternalUserProfile", () => {
  it("builds a profile from completed onboarding settings", () => {
    expect(
      buildExternalUserProfile({
        onboarding: {
          completed: true,
          name: " Мария ",
          role: "Орбитальный инженер",
          interests: "Плазменные двигатели",
          goals: "Собрать карту технологий",
          context: "Работает в Orbital",
          completedAt: "2026-09-14T10:00:00.000Z",
        },
      })
    ).toEqual({
      completed: true,
      name: "Мария",
      role: "Орбитальный инженер",
      interests: "Плазменные двигатели",
      goals: "Собрать карту технологий",
      context: "Работает в Orbital",
      completedAt: "2026-09-14T10:00:00.000Z",
    });
  });

  it("ignores incomplete onboarding", () => {
    expect(
      buildExternalUserProfile({
        onboarding: {
          completed: false,
          name: "Мария",
        },
      })
    ).toBeUndefined();
  });

  it("ignores malformed settings", () => {
    expect(buildExternalUserProfile(null)).toBeUndefined();
    expect(buildExternalUserProfile({ onboarding: null })).toBeUndefined();
  });
});

describe("buildMemoryDebugToolResult", () => {
  it("normalizes AgentResult sources", () => {
    expect(
      buildMemoryDebugToolResult({
        text: "Ответ",
        sources: [
          {
            id: "profile-1",
            snippet: "Роль: Орбитальный инженер",
            similarity: 1,
            source: "user",
            sourceType: "onboarding",
          },
        ],
        metadata: { profileBootstrap: "stored" },
      })
    ).toEqual({
      toolName: "cf-kristina-memory-debug",
      success: true,
      message: "Кристина прочитала память перед ответом.",
      memories: [
        {
          id: "profile-1",
          snippet: "Роль: Орбитальный инженер",
          similarity: 1,
          source: "user",
          sourceType: "onboarding",
        },
      ],
      metadata: { profileBootstrap: "stored" },
    });
  });

  it("returns an empty memory state", () => {
    expect(buildMemoryDebugToolResult({ text: "Ответ" })).toEqual({
      toolName: "cf-kristina-memory-debug",
      success: true,
      message:
        "Кристина прочитала память, но не нашла подходящих воспоминаний.",
      memories: [],
      metadata: undefined,
    });
  });
});

describe("canAccessPrivateKristinaMemory", () => {
  it("allows only configured users by id or email", () => {
    process.env.CF_KRISTINA_PRIVATE_MEMORY_USERS =
      "adiom@canfly.ai, 00000000-0000-0000-0000-000000000042";

    expect(
      canAccessPrivateKristinaMemory({
        id: "00000000-0000-0000-0000-000000000042",
        email: "someone@example.com",
      })
    ).toBe(true);
    expect(
      canAccessPrivateKristinaMemory({
        id: "another-id",
        email: "ADIOM@canfly.ai",
      })
    ).toBe(true);
    expect(
      canAccessPrivateKristinaMemory({
        id: "another-id",
        email: "someone@example.com",
      })
    ).toBe(false);
  });

  it("denies private memory by default", () => {
    delete process.env.CF_KRISTINA_PRIVATE_MEMORY_USERS;
    expect(
      canAccessPrivateKristinaMemory({
        id: "user-id",
        email: "user@example.com",
      })
    ).toBe(false);
  });
});
