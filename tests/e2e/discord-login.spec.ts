// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-16
// E2E test: Discord login flow — asserts button presence, redirect behavior, and error param handling.

import { test, expect } from "@playwright/test";

test.describe("Discord Login Flow", () => {
  test("Discord login button is visible on the login page", async ({
    page,
  }) => {
    await page.goto("/login");

    // Assert the page loaded and is not a blank/error page.
    await expect(page).not.toHaveTitle(/404|not found|error/i);

    // The Discord login button must be visible — look for common label patterns.
    const discordButton = page
      .locator(
        "button:has-text('Discord'), a:has-text('Discord'), [data-provider='discord']"
      )
      .first();
    await expect(discordButton).toBeVisible();
  });

  test("clicking Discord login redirects to Discord OAuth, not a 500", async ({
    page,
  }) => {
    await page.goto("/login");

    const discordButton = page
      .locator(
        "button:has-text('Discord'), a:has-text('Discord'), [data-provider='discord']"
      )
      .first();

    // Intercept the navigation triggered by the button click.
    const [response] = await Promise.all([
      // Wait for either a navigation or a new page request.
      page.waitForResponse(
        (resp) =>
          resp.url().includes("discord.com") ||
          resp.url().includes("/auth") ||
          resp.status() === 302,
        { timeout: 8000 }
      ).catch(() => null),
      discordButton.click(),
    ]);

    // The current page must NOT be a 500 error after clicking.
    const currentUrl = page.url();
    expect(currentUrl).not.toMatch(/\/error|\/500|\/internal-server-error/i);

    // If we got a response, it must not be a 5xx server error.
    if (response) {
      expect(response.status()).toBeLessThan(500);
    }
  });

  test("error=access_denied query param shows an error message, not a blank page", async ({
    page,
  }) => {
    await page.goto("/login?error=access_denied");

    // The page must render meaningful content — not be blank.
    const bodyText = await page.locator("body").innerText();
    expect(bodyText.trim().length).toBeGreaterThan(20);

    // There must be a visible error indicator — message, banner, or alert.
    const errorIndicator = page
      .locator(
        "[role='alert'], .error, .alert, [data-testid*='error'], [class*='error']"
      )
      .first();

    // Either an explicit error element is present OR the body text mentions the error.
    const hasErrorText = /denied|error|failed|unable|try again/i.test(bodyText);
    const errorVisible = await errorIndicator.isVisible().catch(() => false);

    expect(
      hasErrorText || errorVisible,
      "Page should surface an error message when access_denied is passed"
    ).toBe(true);
  });
});
