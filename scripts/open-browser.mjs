/**
 * Opens a headed Playwright Chromium and leaves it open.
 *
 * Playwright closes the browser when a test ends; this script has no test, so
 * the page stays live and clickable until you close the window or Ctrl+C.
 *
 *   node scripts/open-browser.mjs [url]
 */
import { chromium } from "@playwright/test";

const url = process.argv[2] ?? "http://localhost:3000";

// A persistent profile keeps the session cookie between runs, so signing in
// once survives a restart of this script.
const context = await chromium.launchPersistentContext(".playwright-profile", {
  headless: false,
  viewport: null,
});

const page = context.pages()[0] ?? (await context.newPage());
await page.goto(url);

console.log(`Opened ${url} — close the window or press Ctrl+C to stop.`);

await context.waitForEvent("close", { timeout: 0 });
