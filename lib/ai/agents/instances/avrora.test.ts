import { describe, expect, it } from "vitest";
import { avroraAgent } from "./avrora";

describe("local Avrora runtime policy", () => {
  it("is a single-step text-only agent", () => {
    expect(avroraAgent.maxSteps).toBe(1);
    expect(Object.keys(avroraAgent.tools ?? {})).toEqual([]);
  });
});
