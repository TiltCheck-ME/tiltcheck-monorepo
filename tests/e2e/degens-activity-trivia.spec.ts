// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-06
// E2E: Degens Activity trivia shell — tab navigation, host UI gate, fairness copy, footer.
// Full multiplayer (schedule + join-game + answers) needs game-arena plus Discord/session auth; run that manually or point BASE_URL at a staffed environment.

import { expect, test } from "@playwright/test";

const localBase = "http://127.0.0.1:5174";
const remoteBase =
  process.env.DEGENS_ACTIVITY_E2E_URL || "https://activity.tiltcheck.me";

test.use({
  baseURL: process.env.PLAYWRIGHT_DEGENS_LOCAL === "1" ? localBase : remoteBase,
});

test.describe("Degens Activity — Trivia shell", () => {
  test("trivia tab shows live room copy and botbar footer", async ({
    page,
  }) => {
    await page.goto("/");

    await page.locator('button.tab[data-view="trivia"]').click();

    const triviaView = page.locator("#view-trivia");

    await expect(
      triviaView.getByRole("heading", { name: "Waiting for game" }),
    ).toBeVisible({ timeout: 15_000 });

    await expect(triviaView.getByText("Live Trivia").first()).toBeVisible();
    await expect(
      triviaView.getByText(/auto-join the socket room/i),
    ).toBeVisible();

    await expect(
      page.getByText("Made for Degens. By Degens."),
    ).toBeVisible();
  });

  test("triviaHost=1 exposes host controls and start CTA", async ({
    page,
  }) => {
    await page.goto("/?triviaHost=1");

    await page.locator('button.tab[data-view="trivia"]').click();

    const triviaView = page.locator("#view-trivia");

    await expect(triviaView.getByText(/Host controls/i)).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      triviaView.getByRole("button", { name: /Start 3-round test/i }),
    ).toBeVisible();
    await expect(
      triviaView.getByRole("button", { name: /Reset trivia/i }),
    ).toBeVisible();
  });
});
