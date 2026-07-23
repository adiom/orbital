import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    // tests/** holds Playwright specs (run via `pnpm test`), not Vitest.
    // cf-kristina-mcp.test.ts is a smoke test that needs a live agent on
    // localhost:31337 — run it manually, not as part of the unit suite.
    exclude: [
      "node_modules",
      ".next",
      "e2e",
      "routes",
      "tests/**",
      "lib/ai/agents/cf-kristina-mcp.test.ts",
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
