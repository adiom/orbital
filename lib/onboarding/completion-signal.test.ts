/**
 * Onboarding completion signal tests
 *
 * The signal decides two things at once: whether to show the completion
 * card instead of a raw tool plaque, and whether to close the chat and
 * leave for the living map. A false positive navigates the user away
 * unasked, so the shape-handling is pinned here.
 */

import { describe, expect, it } from "vitest";
import type { Message, ToolResult } from "@/components/chat/shared-message-type";
import {
  getOnboardingCompletionMessage,
  hasOnboardingCompleted,
  isOnboardingCompletionResult,
} from "./completion-signal";

const message = (overrides: Partial<Message>): Message => ({
  id: "m1",
  content: "",
  userId: "u1",
  userEmail: "user@example.com",
  parentMessageId: null,
  isForked: false,
  forkedSferaId: null,
  createdAt: new Date("2026-08-01T00:00:00.000Z"),
  ...overrides,
});

describe("isOnboardingCompletionResult", () => {
  it("recognises the flat shape written by the streamer", () => {
    const result: ToolResult = {
      toolName: "saveOnboardingProfile",
      success: true,
      message: "Профиль сохранён. Онбординг завершён.",
    };

    expect(isOnboardingCompletionResult(result)).toBe(true);
  });

  it("recognises the payload nested under `output`", () => {
    const result = {
      toolName: "saveOnboardingProfile",
      output: { success: true, message: "Профиль сохранён." },
    } as unknown as ToolResult;

    expect(isOnboardingCompletionResult(result)).toBe(true);
  });

  it("recognises the legacy payload nested under `result`", () => {
    const result = {
      toolName: "saveOnboardingProfile",
      result: { success: true, message: "Профиль сохранён." },
    } as unknown as ToolResult;

    expect(isOnboardingCompletionResult(result)).toBe(true);
  });

  it("does not fire when the tool failed", () => {
    const result: ToolResult = {
      toolName: "saveOnboardingProfile",
      success: false,
      error: "User not found",
    };

    expect(isOnboardingCompletionResult(result)).toBe(false);
  });

  it("does not fire for another tool", () => {
    const result: ToolResult = {
      toolName: "generateImage",
      success: true,
      imageUrl: "https://example.com/a.png",
    };

    expect(isOnboardingCompletionResult(result)).toBe(false);
  });
});

describe("getOnboardingCompletionMessage", () => {
  it("reads the copy the tool wrote, through either shape", () => {
    expect(
      getOnboardingCompletionMessage({
        toolName: "saveOnboardingProfile",
        success: true,
        message: "Готово.",
      })
    ).toBe("Готово.");

    expect(
      getOnboardingCompletionMessage({
        toolName: "saveOnboardingProfile",
        output: { success: true, message: "Готово." },
      } as unknown as ToolResult)
    ).toBe("Готово.");
  });

  it("returns undefined when the tool wrote no message", () => {
    expect(
      getOnboardingCompletionMessage({
        toolName: "saveOnboardingProfile",
        success: true,
      })
    ).toBeUndefined();
  });
});

describe("hasOnboardingCompleted", () => {
  it("is false for an interview still in progress", () => {
    expect(
      hasOnboardingCompleted([
        message({ id: "m1", content: "Привет!" }),
        message({ id: "m2", content: "Чем ты занимаешься?" }),
      ])
    ).toBe(false);
  });

  it("is true once any message carries the completion", () => {
    expect(
      hasOnboardingCompleted([
        message({ id: "m1", content: "Как тебя зовут?" }),
        message({
          id: "m2",
          content: "Готово!",
          toolResults: [
            { toolName: "saveOnboardingProfile", success: true },
          ],
        }),
      ])
    ).toBe(true);
  });

  it("ignores unrelated tool results", () => {
    expect(
      hasOnboardingCompleted([
        message({
          id: "m1",
          toolResults: [{ toolName: "webSearch", success: true }],
        }),
      ])
    ).toBe(false);
  });
});
