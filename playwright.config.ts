// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-13
// Playwright e2e test configuration for TiltCheck critical user paths.

import { defineConfig, devices } from "@playwright/test";

const degensLocal = process.env.PLAYWRIGHT_DEGENS_LOCAL === "1";
const webLocal = process.env.PLAYWRIGHT_WEB_LOCAL === "1";
const webLocalUrl = "http://127.0.0.1:3001";

const webServers: Array<{
  command: string;
  url: string;
  reuseExistingServer: boolean;
  timeout: number;
  env?: Record<string, string>;
}> = [];

if (webLocal) {
  webServers.push({
    command: "pnpm -C apps/web exec next dev --port 3001 --hostname 127.0.0.1",
    url: webLocalUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      ...Object.fromEntries(
        Object.entries(process.env).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
      ),
      SKIP_ENV_VALIDATION: "true",
      SKIP_DISCORD_LOGIN: "true",
    },
  });
}

if (degensLocal) {
  webServers.push({
    command:
      "pnpm --filter @tiltcheck/degens-activity exec vite --host 127.0.0.1 --port 5174 --strictPort",
    url: "http://127.0.0.1:5174",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  });
}

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    // PR jobs set PLAYWRIGHT_WEB_LOCAL=1 and BASE_URL to the local Next.js server.
    // Nightly/live jobs keep pointing at tiltcheck.me.
    baseURL: process.env.BASE_URL || (webLocal ? webLocalUrl : "https://tiltcheck.me"),
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
  ...(webServers.length === 1
    ? { webServer: webServers[0] }
    : webServers.length > 1
      ? { webServer: webServers }
      : {}),
});
