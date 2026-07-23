import { expect, test } from "@playwright/test";
import { signInWithMagicLink } from "./support/auth";

test.describe("create and chat", () => {
  test.beforeEach(async ({ page }) => {
    await signInWithMagicLink(page);
    await page.goto("/");
  });

  test("creates a new cell via Создать... and opens its chat", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Создать..." }).click();
    await page
      .getByPlaceholder("О чём хотите подумать?")
      .fill("Первая мысль для теста");
    await page.keyboard.press("Enter");

    // Matching against a RegExp compares the full URL, not just the
    // pathname, and router.push() never fires a browser `load` event —
    // so match on url.pathname via a predicate instead.
    await page.waitForURL((url) => url.pathname !== "/" && !url.pathname.startsWith("/login"));
    await expect(
      page.getByPlaceholder("Share your thoughts in this orbit...")
    ).toBeVisible();
  });

  test("sends a message and it persists after reload", async ({ page }) => {
    await page.getByRole("button", { name: "Создать..." }).click();
    await page
      .getByPlaceholder("О чём хотите подумать?")
      .fill("Ячейка для сообщения");
    await page.keyboard.press("Enter");
    // Matching against a RegExp compares the full URL, not just the
    // pathname, and router.push() never fires a browser `load` event —
    // so match on url.pathname via a predicate instead.
    await page.waitForURL((url) => url.pathname !== "/" && !url.pathname.startsWith("/login"));

    const messageText = `Тестовое сообщение ${Date.now()}`;
    const chatInput = page.getByPlaceholder(
      "Share your thoughts in this orbit..."
    );
    await chatInput.fill(messageText);
    // Wait for the actual persistence request to complete before reloading —
    // otherwise the reload can abort the in-flight POST before it saves.
    const [response] = await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes("/messages") && res.request().method() === "POST"
      ),
      page.keyboard.press("Enter"),
    ]);
    expect(response.ok()).toBeTruthy();

    await expect(page.getByText(messageText)).toBeVisible();

    await page.reload();
    await expect(page.getByText(messageText)).toBeVisible();
  });
});
