import { expect, type Page } from "@playwright/test";

function newEmail(): string {
  return `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

/**
 * Reads the dev-only code rendered on /login after requesting a magic link.
 */
async function requestCode(page: Page, email: string): Promise<string> {
  await page.goto("/login");
  await page.getByLabel("Электронная почта").fill(email);
  await page.getByRole("button", { name: "Создать Magic Link" }).click();

  const codeLocator = page.getByText(/Код:\s*\S+/);
  await codeLocator.waitFor();
  const codeText = await codeLocator.textContent();
  const code = codeText?.split("Код:")[1]?.trim();
  if (!code) {
    throw new Error(
      "Dev magic-link code not found on /login — is the app running with NODE_ENV=development?"
    );
  }

  return code;
}

export async function signInWithMagicLink(page: Page): Promise<string> {
  const email = newEmail();
  const code = await requestCode(page, email);

  await page.goto(`/login?magic_token=${code}`);
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));

  return email;
}

/**
 * The second sign-in path: entering the code by hand instead of following the
 * emailed link. This is the path that used to skip onboarding entirely.
 */
export async function signInWithManualCode(page: Page): Promise<string> {
  const email = newEmail();
  const code = await requestCode(page, email);

  await page.getByRole("button", { name: "Ввести код вручную" }).click();
  await page.getByLabel("8-значный код").fill(code);
  await page.getByRole("button", { name: "Войти по коду" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));

  return email;
}

/**
 * Waits until no message is mid-stream, using the `data-generating` attribute
 * that mirrors `SferaMessage.isGenerating`. Prefer this over a fixed timeout —
 * a model call has no predictable duration.
 */
export async function waitForStreamToSettle(page: Page): Promise<void> {
  await page
    .locator('[data-testid="orbit-message"][data-generating="true"]')
    .first()
    .waitFor({ state: "attached", timeout: 15_000 })
    .catch(() => {
      // The stream may already have finished before we started watching.
    });

  await expect(
    page.locator('[data-testid="orbit-message"][data-generating="true"]')
  ).toHaveCount(0, { timeout: 120_000 });
}
