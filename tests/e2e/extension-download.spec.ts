// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-18
// E2E test: Chrome extension page. The extension is not public yet (gated since #693/#714),
// so anonymous visitors must see the "not public" notice and no zip download or sideload steps.

import { test, expect } from "@playwright/test";

test.describe("Extension Page (gated)", () => {
  test("loads and tells visitors the extension is not public yet", async ({ page }) => {
    await page.goto("/extension");

    await expect(page).not.toHaveTitle(/404|not found/i);
    await expect(page.getByRole("heading", { name: /not public yet/i })).toBeVisible();

    // The waitlist path is the Discord invite.
    const discordLink = page.locator("a[href*='discord.gg']").first();
    await expect(discordLink).toBeVisible();
  });

  test("does not expose a public zip download or sideload steps", async ({ page }) => {
    await page.goto("/extension");
    await expect(page.getByRole("heading", { name: /not public yet/i })).toBeVisible();

    // No raw build artifacts linked for anonymous visitors.
    await expect(page.locator("a[href$='.zip'], a[href$='.crx']")).toHaveCount(0);

    // Sideload steps live behind the staff gate.
    await expect(page.getByText(/load unpacked/i)).toHaveCount(0);
  });
});
