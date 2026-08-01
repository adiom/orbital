import { describe, expect, it } from "vitest";
import { detectImageIntent } from "./image-intent";

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
