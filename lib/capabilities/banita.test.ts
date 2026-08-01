import { afterEach, describe, expect, it, vi } from "vitest";
import { generateBanitaImage } from "./banita";
import { BanitaError } from "./types";

const originalKey = process.env.BANITA_API_KEY;
const originalEnabled = process.env.BANITA_ENABLED;

afterEach(() => {
  vi.restoreAllMocks();
  process.env.BANITA_API_KEY = originalKey;
  process.env.BANITA_ENABLED = originalEnabled;
});

describe("generateBanitaImage", () => {
  it("parses an OpenAI-compatible image response", async () => {
    process.env.BANITA_API_KEY = "test-key";
    process.env.BANITA_ENABLED = "true";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      created: 1,
      data: [{ url: "https://images.example/cat.png" }],
    }), { status: 200 })));

    const result = await generateBanitaImage("кот");
    expect(result).toMatchObject({
      imageUrl: "https://images.example/cat.png",
      prompt: "кот",
      model: "banita-sketch",
    });
  });

  it.each([
    [401, "BANITA_UNAUTHORIZED"],
    [500, "BANITA_HTTP_ERROR"],
  ])("normalizes HTTP %s", async (status, code) => {
    process.env.BANITA_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status })));
    await expect(generateBanitaImage("кот")).rejects.toMatchObject({ code });
  });

  it("rejects malformed responses", async () => {
    process.env.BANITA_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [] }), { status: 200 })));
    await expect(generateBanitaImage("кот")).rejects.toMatchObject({ code: "BANITA_INVALID_RESPONSE" });
  });

  it("requires configuration", async () => {
    delete process.env.BANITA_API_KEY;
    await expect(generateBanitaImage("кот")).rejects.toEqual(
      expect.objectContaining<Partial<BanitaError>>({ code: "BANITA_NOT_CONFIGURED" }),
    );
  });
});
