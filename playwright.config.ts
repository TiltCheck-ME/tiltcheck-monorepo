// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-16
// Playwright e2e test configuration for TiltCheck critical user paths.

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    // Default base URL — override with BASE_URL env var in CI or local testing.
    baseURL: process.env.BASE_URL || "https://tiltcheck.me",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    // Do not follow redirects blindly — capture and assert them explicitly in tests.
    ignoreHTTPSErrors: false,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // No webServer block — tests run against the deployed URL or BASE_URL override.
});
