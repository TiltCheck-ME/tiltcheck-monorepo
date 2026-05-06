// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-06
// Playwright e2e test configuration for TiltCheck critical user paths.

import { defineConfig, devices } from "@playwright/test";

const degensLocal = process.env.PLAYWRIGHT_DEGENS_LOCAL === "1";

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
  // Set PLAYWRIGHT_DEGENS_LOCAL=1 when running tests/e2e/degens-activity-trivia.spec.ts to boot Vite (Degens Activity) on 127.0.0.1:5174.
  ...(degensLocal
    ? {
        webServer: {
          command:
            "pnpm --filter @tiltcheck/degens-activity exec vite --host 127.0.0.1 --port 5174 --strictPort",
          url: "http://127.0.0.1:5174",
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      }
    : {}),
});
