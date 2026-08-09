import { describe, expect, it } from "vitest";
import { buildDemoOrbitPreview, getDemoOrbitPayload } from "../lib/orbit/demo-data";

describe("buildDemoOrbitPreview", () => {
  it("returns a rich preview graph with parent-child branches", () => {
    const { orbits, forkRelationships } = buildDemoOrbitPreview(
      new Date("2026-08-09T12:00:00.000Z")
    );

    expect(orbits.length).toBeGreaterThanOrEqual(6);
    expect(forkRelationships.length).toBeGreaterThanOrEqual(4);

    const parentIds = new Set(
      forkRelationships.map((relation: { parentSferaId: string }) => relation.parentSferaId)
    );
    expect(parentIds.size).toBeGreaterThan(0);
    expect(orbits.some((orbit: { title: string }) => orbit.title.includes("велосипед"))).toBe(true);
  });

  it("returns a demo payload for a known preview orbit", () => {
    const payload = getDemoOrbitPayload("demo-workspace");

    expect(payload).not.toBeNull();
    expect(payload?.sfera.title).toContain("рабочее место");
    expect(payload?.messages.length).toBeGreaterThan(0);
  });
});
