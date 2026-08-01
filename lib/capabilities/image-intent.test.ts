import { describe, expect, it } from "vitest";
import {
  buildBanitaPrompt,
  detectImageIntent,
  isIncompleteImageIntent,
} from "./image-intent";

describe("detectImageIntent", () => {
  it.each([
    ["нарисуй кота", "кота"],
    ["создай картинку космического корабля", "космического корабля"],
    ["сгенерируй изображение города", "города"],
    ["сделай рисунок в стиле акварели", "в стиле акварели"],
    ["@banita нарисуй закат", "закат"],
  ])("detects %s", (content, prompt) => {
    expect(detectImageIntent(content)).toEqual({ prompt });
  });

  it.each([
    "обсудим картинку",
    "мне нравится это изображение",
    "как нарисовать кота карандашом?",
    "создай картинку",
  ])("avoids false positive for %s", (content) => {
    expect(detectImageIntent(content)).toBeNull();
  });
});

describe("image intent follow-up", () => {
  it("recognizes an incomplete drawing command", () => {
    expect(isIncompleteImageIntent("нарисуй")).toBe(true);
    expect(isIncompleteImageIntent("нарисуй кота")).toBe(false);
  });

  it("keeps the visible prompt separate from bounded chat context", () => {
    expect(
      buildBanitaPrompt("нарисуй что-то к чату", [
        { author: "alice@example.com", content: "Мы обсуждаем космический корабль" },
      ]),
    ).toContain("Мы обсуждаем космический корабль");
  });
});
