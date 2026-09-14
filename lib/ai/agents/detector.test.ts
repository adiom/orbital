/**
 * Agent Detection and Dispatch Tests
 *
 * Tests mention pattern detection, agent config, and dispatch logic
 * for Avrora and the external Kristina agent.
 *
 * NOTE: We test patterns directly (not via registry) to avoid
 * server-only import chain from avrora/kristina instances.
 */

import { describe, expect, it } from "vitest";
import {
  AVRORA_USER_ID,
  CLAUDE_CODE_USER_ID,
  CF_KRISTINA_USER_ID,
  CF_KRISTINA_EMAIL,
} from "@/lib/constants/system-users";
import { cfKristinaAgent } from "./instances/cf-kristina";
import type { AIAgent } from "./types";

// Mention patterns per agent (mirrors instances without importing server-only deps)
const AGENT_PATTERNS: Record<string, (string | RegExp)[]> = {
  avrora: [/@avrora/i, /@аврора/i],
  "cf-kristina": [/@kristina/i, /@кристина/i, /@cf-kristina/i],
};

function detectByPatterns(content: string): string[] {
  const found: string[] = [];
  for (const [id, patterns] of Object.entries(AGENT_PATTERNS)) {
    const matched = patterns.some((p) => {
      if (p instanceof RegExp) return p.test(content);
      return content.toLowerCase().includes(p.toLowerCase());
    });
    if (matched && !found.includes(id)) found.push(id);
  }
  return found;
}

describe("Mention Pattern Detection", () => {
  it("detects @avrora", () => {
    expect(detectByPatterns("@avrora привет")).toEqual(["avrora"]);
  });

  it("detects @аврора (Cyrillic)", () => {
    expect(detectByPatterns("@аврора привет")).toEqual(["avrora"]);
  });

  it("detects @kristina as external Kristina", () => {
    expect(detectByPatterns("@kristina что думаешь?")).toEqual(["cf-kristina"]);
  });

  it("detects @кристина (Cyrillic) as external Kristina", () => {
    expect(detectByPatterns("@кристина привет!")).toEqual(["cf-kristina"]);
  });

  it("detects legacy @cf-kristina as external Kristina", () => {
    expect(detectByPatterns("@cf-kristina что думаешь?")).toEqual([
      "cf-kristina",
    ]);
  });

  it("detects multiple agents", () => {
    const found = detectByPatterns("@avrora и @kristina обсудите это");
    expect(found).toContain("avrora");
    expect(found).toContain("cf-kristina");
    expect(found.length).toBe(2);
  });

  it("returns empty when no mentions", () => {
    expect(detectByPatterns("привет всем")).toEqual([]);
  });

  it("detects agent mid-sentence", () => {
    expect(detectByPatterns("Кто-нибудь @кристина может помочь?")).toEqual([
      "cf-kristina",
    ]);
  });

  it("case insensitive @KRISTINA", () => {
    expect(detectByPatterns("@KRISTINA test")).toEqual(["cf-kristina"]);
  });
});

describe("cf-kristina Agent Config", () => {
  it("has correct mention patterns", () => {
    expect(cfKristinaAgent.mentionPatterns.length).toBe(3);
    expect(cfKristinaAgent.mentionPatterns[0]).toEqual(/@kristina/i);
    expect(cfKristinaAgent.mentionPatterns[1]).toEqual(/@кристина/i);
    expect(cfKristinaAgent.mentionPatterns[2]).toEqual(/@cf-kristina/i);
  });

  it("has runtime external-mcp", () => {
    expect(cfKristinaAgent.runtime).toBe("external-mcp");
  });

  it("has externalMcp config with endpoint", () => {
    expect(cfKristinaAgent.externalMcp).toBeDefined();
    expect(cfKristinaAgent.externalMcp!.endpoint).toMatch(/^https?:\/\//);
  });

  it("uses CF_KRISTINA_USER_ID", () => {
    expect(cfKristinaAgent.userId).toBe(CF_KRISTINA_USER_ID);
  });

  it("uses CF_KRISTINA_EMAIL", () => {
    expect(cfKristinaAgent.email).toBe(CF_KRISTINA_EMAIL);
  });

  it("buildSystemPrompt returns empty string (not used for external)", () => {
    const prompt = cfKristinaAgent.buildSystemPrompt({
      sfera: { title: "Test", description: "Test" },
    });
    expect(prompt).toBe("");
  });

  it("id is cf-kristina", () => {
    expect(cfKristinaAgent.id).toBe("cf-kristina");
  });
});

describe("System User Constants", () => {
  it("CF_KRISTINA_USER_ID is unique", () => {
    expect(CF_KRISTINA_USER_ID).not.toBe(AVRORA_USER_ID);
    expect(CF_KRISTINA_USER_ID).not.toBe(CLAUDE_CODE_USER_ID);
  });

  it("CF_KRISTINA_EMAIL format", () => {
    expect(CF_KRISTINA_EMAIL).toMatch(/^[\w.-]+@[\w.-]+\.\w+$/);
    expect(CF_KRISTINA_EMAIL).toBe("cf-kristina@avrora.click");
  });
});

describe("Runtime Dispatch Logic", () => {
  it("external-mcp triggers streamExternalMcpAgentResponse", () => {
    const agent = cfKristinaAgent;
    // Simulates: if (agent.runtime === "external-mcp") { ... }
    const isExternal = agent.runtime === "external-mcp";
    expect(isExternal).toBe(true);
  });

  it("internal runtime does NOT trigger external dispatch", () => {
    const internalAgent: AIAgent = {
      id: "test",
      name: "Test",
      mentionPatterns: [/@test/i],
      userId: "test-user-id",
      email: "test@test.com",
      model: "test-model",
      runtime: "internal",
      buildSystemPrompt: () => "test",
    };
    const isExternal = internalAgent.runtime === "external-mcp";
    expect(isExternal).toBe(false);
  });

  it("undefined runtime defaults to internal dispatch", () => {
    const legacyAgent: AIAgent = {
      id: "legacy",
      name: "Legacy",
      mentionPatterns: [/@legacy/i],
      userId: "legacy-user-id",
      email: "legacy@test.com",
      model: "test-model",
      buildSystemPrompt: () => "test",
    };
    // undefined !== "external-mcp" → uses streamAgentResponse
    const isExternal = legacyAgent.runtime === "external-mcp";
    expect(isExternal).toBe(false);
  });
});
