import type { Page } from "@playwright/test";

export async function signInWithMagicLink(page: Page): Promise<string> {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

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

  await page.goto(`/login?magic_token=${code}`);
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));

  return email;
}
