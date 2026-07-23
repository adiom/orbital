import { expect, test } from "@playwright/test";

test.describe("liveness routes", () => {
  test("GET /ping responds 200", async ({ request }) => {
    const response = await request.get("/ping");
    expect(response.status()).toBe(200);
  });

  test("GET /api/health returns a well-formed component report", async ({
    request,
  }) => {
    const response = await request.get("/api/health");
    expect([200, 503]).toContain(response.status());

    const body = await response.json();
    expect(body.components).toHaveProperty("db");
    expect(body.components).toHaveProperty("redis");
    expect(body.components).toHaveProperty("ai");
  });
});
