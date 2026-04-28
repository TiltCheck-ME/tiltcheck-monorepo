// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-16
// E2E test: Chrome extension download page — asserts download link and sideload instructions exist.

import { test, expect } from "@playwright/test";

test.describe("Extension Download Page", () => {
  test("download link is present and not a 404", async ({ page, request }) => {
    await page.goto("/extension");

    // Assert the page itself loaded successfully.
    await expect(page).not.toHaveTitle(/404|not found/i);

    // Find the primary download link (an <a> pointing to a .zip or .crx file).
    const downloadLink = page
      .locator("a[href*='.zip'], a[href*='.crx'], a[download]")
      .first();
    await expect(downloadLink).toBeVisible();

    // Resolve the href and confirm the resource does not return 404.
    const href = await downloadLink.getAttribute("href");
    expect(href).toBeTruthy();

    const resolvedHref = href!.startsWith("http")
      ? href!
      : new URL(href!, page.url()).href;

    const response = await request.head(resolvedHref);
    expect(
      response.status(),
      `Download link ${resolvedHref} returned ${response.status()}`
    ).not.toBe(404);
  });

  test("page contains sideload install instructions", async ({ page }) => {
    await page.goto("/extension");

    // The page must include guidance on how to sideload the extension.
    // Acceptable keywords: "sideload", "load unpacked", "developer mode".
    const bodyText = await page.locator("body").innerText();
    const hasInstructions =
      /sideload|load unpacked|developer mode/i.test(bodyText);

    expect(
      hasInstructions,
      "Page should contain sideload or developer mode installation instructions"
    ).toBe(true);
  });
});
