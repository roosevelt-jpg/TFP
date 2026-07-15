import { defineConfig, devices } from "@playwright/test";

// Overridable so local runs can dodge whatever else is parked on 3000 —
// reuseExistingServer would otherwise happily test a different app.
const rawPort = process.env.E2E_PORT;
const port = rawPort && /^\d+$/.test(rawPort) ? Number(rawPort) : 3000;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "on-first-retry",
    // Deterministic axe contrast results: entrance animations otherwise get
    // snapshotted mid-fade.
    contextOptions: { reducedMotion: "reduce" },
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    {
      // The launch audience is overwhelmingly mobile Instagram traffic.
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"] },
      testIgnore: /a11y/,
    },
  ],
  globalSetup: "./tests/e2e/global-setup.ts",
  webServer: {
    command: `pnpm start --port ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
