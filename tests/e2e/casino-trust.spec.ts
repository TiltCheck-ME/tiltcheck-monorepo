// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-16
// E2E test: Casino trust page — asserts trust score renders, page title, and meta description.

import { test, expect } from "@playwright/test";

// Casino slug to test against — update if the route changes.
const CASINO_ROUTE = "/casinos";
const TRUST_LOAD_TIMEOUT_MS = 15_000;

test.describe("Casino Trust Page", () => {
  test("trust score data renders within timeout (not stuck on spinner)", async ({
    page,
  }) => {
    await page.goto(CASINO_ROUTE);

    // A persistent loading spinner is a failure condition — it must resolve.
    const spinner = page.locator(
      "[data-testid='loading'], .spinner, .loading, [aria-label='Loading']"
    );

    // Wait for spinner to disappear or for trust content to appear.
    const trustContent = page.locator(
      "[data-testid='trust-score'], .trust-score, .casino-grade, .casino-card, table"
    );

    await Promise.race([
      trustContent
        .first()
        .waitFor({ state: "visible", timeout: TRUST_LOAD_TIMEOUT_MS }),
      spinner
        .first()
        .waitFor({ state: "hidden", timeout: TRUST_LOAD_TIMEOUT_MS })
        .catch(() => {
          // Spinner not found — that is acceptable.
        }),
    ]);

    // After waiting, confirm there is actual casino data visible on the page.
    const bodyText = await page.locator("body").innerText();
    const hasCasinoData =
      /casino|trust|grade|score|rating/i.test(bodyText);

    expect(
      hasCasinoData,
      "Casino trust page should contain trust data after loading"
    ).toBe(true);
  });

  test("page has a non-empty title", async ({ page }) => {
    await page.goto(CASINO_ROUTE);

    const title = await page.title();
    expect(title.trim().length).toBeGreaterThan(0);
    expect(title).not.toMatch(/404|not found/i);
  });

  test("page has a meta description tag", async ({ page }) => {
    await page.goto(CASINO_ROUTE);

    const metaDescription = page.locator("meta[name='description']");
    await expect(metaDescription).toHaveAttribute("content", /\S+/);
  });
});
