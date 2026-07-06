import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:3000",
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
    command: "pnpm start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
