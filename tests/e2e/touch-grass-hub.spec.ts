// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-13
// Optional smoke: /touch-grass games hub. Local Next.js only (PLAYWRIGHT_WEB_LOCAL=1).
// Source scans remain the gate. Do not stub a live drop.

import { test, expect } from "@playwright/test";

const webLocal = process.env.PLAYWRIGHT_WEB_LOCAL === "1";

test.describe("Touch Grass games hub", () => {
  test.skip(
    !webLocal,
    "Needs PLAYWRIGHT_WEB_LOCAL=1 (local Next.js). Live tiltcheck.me is not this branch.",
  );

  test("public hub shows two panes and idle or unknown copy", async ({
    page,
  }) => {
    // Empty feed only. Do not stub a live drop. 404 -> kind unknown.
    await page.route("**/arena/trivia/status", (route) =>
      route.fulfill({
        status: 404,
        contentType: "application/json",
        body: "{}",
      }),
    );

    await page.goto("/touch-grass");

    await expect(page).not.toHaveTitle(/404|not found|error/i);

    const triviaPane = page.getByRole("heading", { name: "Live Trivia" });
    const dadPane = page.getByRole("heading", {
      name: "Degens Against Decency",
    });
    await expect(triviaPane).toBeVisible();
    await expect(dadPane).toBeVisible();

    const frames = page.locator("iframe");
    await expect(frames).toHaveCount(2);
    await expect(
      page.locator('iframe[title="Live Trivia"]'),
    ).toBeVisible();
    await expect(
      page.locator('iframe[title="Degens Against Decency"]'),
    ).toBeVisible();

    const hero = page.locator("#main-content .landing-shell").first();
    await expect(hero.getByRole("heading", { name: "Touch Grass" })).toBeVisible();
    await expect(hero).toContainText(
      "Casino tab is cooked. Sit at a table that is not a spin.",
    );
    await expect(hero).not.toContainText("1-800-GAMBLER");

    await expect(hero.getByText(/No drop running|round status unknown/i)).toBeVisible({
      timeout: 15_000,
    });
  });

  test("pause mode hides treasury, jackpot, and join-drop CTAs", async ({
    page,
  }) => {
    await page.goto("/touch-grass?mode=pause");

    await expect(page).not.toHaveTitle(/404|not found|error/i);

    await expect(
      page.getByRole("heading", { name: "Live Trivia" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Degens Against Decency" }),
    ).toBeVisible();

    const main = page.locator("#main-content");
    const mainText = await main.innerText();
    expect(mainText).not.toContain("treasury");
    expect(mainText).not.toContain("jackpot");
    expect(mainText).not.toContain("/pay/jackpot");
    expect(mainText).not.toContain("Join drop");

    await expect(page.locator('a[href*="/pay/jackpot"]')).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Join drop/i })).toHaveCount(0);
  });
});
