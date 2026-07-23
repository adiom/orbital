import { expect, test } from "@playwright/test";
import { signInWithMagicLink } from "./support/auth";

test.describe("auth", () => {
  test("redirects an anonymous visitor to /login", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL(/\/login/);
    await expect(page).toHaveURL(/\/login/);
  });

  test("signs in via the dev magic-link code and reaches the living map", async ({
    page,
  }) => {
    await signInWithMagicLink(page);
    await page.goto("/");

    await expect(
      page.getByRole("button", { name: "Создать..." })
    ).toBeVisible();
    await expect(page.getByText("Orbital", { exact: true })).toBeVisible();
  });
});
