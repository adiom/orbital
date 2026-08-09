import { describe, expect, it } from "vitest";
import { ORBIT_VISIBILITY_OPTIONS } from "../components/orbit/orbit-settings";

describe("orbit visibility options", () => {
  it("includes DAO alongside private and public", () => {
    const values = ORBIT_VISIBILITY_OPTIONS.map((option) => option.value);

    expect(values).toEqual(["private", "public", "dao"]);
  });
});
