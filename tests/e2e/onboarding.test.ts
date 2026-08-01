import { expect, test } from "@playwright/test";
import {
  signInWithMagicLink,
  signInWithManualCode,
  waitForStreamToSettle,
} from "./support/auth";

const ONBOARDING_TITLE = "Давай познакомимся";

test.describe("onboarding", () => {
  test("starts the interview after signing in via the magic link", async ({
    page,
  }) => {
    await signInWithMagicLink(page);

    await expect(
      page.getByRole("heading", { name: ONBOARDING_TITLE })
    ).toBeVisible();
    await expect(page.getByText("@гид Привет!")).toBeVisible();
  });

  // Regression: this path signed the user in but never created the onboarding
  // space, so a new user landed on an empty map with no interview.
  test("starts the interview after signing in with a manually entered code", async ({
    page,
  }) => {
    await signInWithManualCode(page);

    await expect(
      page.getByRole("heading", { name: ONBOARDING_TITLE })
    ).toBeVisible();
    await expect(page.getByText("@гид Привет!")).toBeVisible();
  });

  test("streams the agent's first question to completion", async ({ page }) => {
    await signInWithManualCode(page);

    // No fixed timeout: `data-generating` mirrors SferaMessage.isGenerating,
    // so the test waits exactly as long as the model takes.
    await waitForStreamToSettle(page);

    const agentMessage = page
      .locator('[data-testid="orbit-message"]')
      .filter({ hasText: "onboarding@avrora.click" });

    await expect(agentMessage).toHaveCount(1);
    // A settled agent message must carry a real question, not an empty body.
    await expect(agentMessage).not.toHaveText(/^\s*$/);
  });

  test("does not create a second space when onboarding is revisited", async ({
    page,
  }) => {
    await signInWithManualCode(page);
    await expect(
      page.getByRole("heading", { name: ONBOARDING_TITLE })
    ).toBeVisible();

    const response = await page.request.post("/api/onboarding/start");
    expect(response.ok()).toBeTruthy();

    // The endpoint is idempotent: it returns the existing space rather than
    // creating another one.
    await page.goto("/");
    await expect(page.getByText(ONBOARDING_TITLE)).toHaveCount(1);
  });
});
