// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-18
// Playwright e2e test configuration for TiltCheck critical user paths.

import { defineConfig, devices } from "@playwright/test";

const degensLocal = process.env.PLAYWRIGHT_DEGENS_LOCAL === "1";
const webLocal = process.env.PLAYWRIGHT_WEB_LOCAL === "1";
const webServers = [
  ...(webLocal
    ? [
        {
          command:
            "pnpm --filter @tiltcheck/shared build && pnpm --filter web exec next dev --hostname 127.0.0.1 --port 3001",
          url: "http://127.0.0.1:3001",
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      ]
    : []),
  ...(degensLocal
    ? [
        {
          command:
            "pnpm --filter @tiltcheck/degens-activity exec vite --host 127.0.0.1 --port 5174 --strictPort",
          url: "http://127.0.0.1:5174",
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      ]
    : []),
];

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    // PR CI tests the checked-out branch; nightly checks may override the live target.
    baseURL: webLocal
      ? "http://127.0.0.1:3001"
      : process.env.BASE_URL || "https://tiltcheck.me",
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
  ...(webServers.length > 0 ? { webServer: webServers } : {}),
});
