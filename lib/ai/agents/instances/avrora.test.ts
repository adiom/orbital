import { describe, expect, it } from "vitest";
import { avroraAgent } from "./avrora";

describe("local Avrora runtime policy", () => {
  it("allows multi-step tool execution", () => {
    expect(avroraAgent.maxSteps).toBe(3);
    expect(avroraAgent.tools).toEqual(
      expect.objectContaining({
        webSearch: expect.objectContaining({ name: "webSearch" }),
      })
    );
  });
});
