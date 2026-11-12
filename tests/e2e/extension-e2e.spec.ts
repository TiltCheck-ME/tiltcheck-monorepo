// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// E2E test: Chrome extension packaging, unpacked loading, popup settings, and cooldown auto-lock deep-link.

import { test, expect, chromium, type BrowserContext, type Page } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { fileURLToPath } from "node:url";

const ROOT_DIR = fileURLToPath(new URL("../..", import.meta.url));
const EXT_DIST_PATH = path.join(ROOT_DIR, "apps/chrome-extension/dist");
const EXT_ZIP_PATH = path.join(ROOT_DIR, "apps/chrome-extension/tiltcheck-extension.zip");
const WEB_ZIP_PATH = path.join(ROOT_DIR, "apps/web/public/downloads/tiltcheck-extension.zip");
const OUT_COOLDOWN_PATH = path.join(ROOT_DIR, "out/cooldown/index.html");

const TEST_SOLANA_WALLET = "7guGrKGy9BoTDe7kC9ng5Yn9B1Ykaa7uAp6e4TRZYeB2";

// Configure serial execution so persistent Chromium profiles do not contend for extension files on Windows.
test.describe.configure({ mode: "serial" });

interface ExtensionHarness {
  context: BrowserContext;
  extensionId: string;
  userDataDir: string;
  cleanup: () => Promise<void>;
}

async function createExtensionHarness(): Promise<ExtensionHarness> {
  const uniqueId = `tc-ext-e2e-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const userDataDir = path.join(os.tmpdir(), uniqueId);
  fs.mkdirSync(userDataDir, { recursive: true });

  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: "chromium",
    args: [
      `--disable-extensions-except=${EXT_DIST_PATH}`,
      `--load-extension=${EXT_DIST_PATH}`,
      "--headless=new",
    ],
  });

  let [worker] = context.serviceWorkers();
  if (!worker) {
    worker = await context.waitForEvent("serviceworker", { timeout: 15000 });
  }

  const extensionId = worker.url().split("/")[2];

  const cleanup = async () => {
    try {
      await context.close();
    } catch {
      // Ignore errors on close.
    }
    try {
      if (fs.existsSync(userDataDir)) {
        fs.rmSync(userDataDir, { recursive: true, force: true });
      }
    } catch {
      // Ignore cleanup locks on Windows temp directory.
    }
  };

  return { context, extensionId, userDataDir, cleanup };
}

test.describe("Chrome Extension Packaging & Distribution Verification", () => {
  test("extension build output and zip packages exist with valid payloads", async () => {
    // Assert unpacked extension distribution directory has required MV3 manifest.
    const manifestPath = path.join(EXT_DIST_PATH, "manifest.json");
    expect(fs.existsSync(manifestPath), "dist/manifest.json must exist").toBe(true);

    const manifestRaw = fs.readFileSync(manifestPath, "utf8");
    const manifest = JSON.parse(manifestRaw);
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.name).toBe("TiltCheck");
    expect(manifest.action?.default_popup).toBe("popup.html");
    expect(manifest.background?.service_worker).toBe("background.js");

    // Assert zip packages exist and are greater than 50KB.
    expect(fs.existsSync(EXT_ZIP_PATH), "apps/chrome-extension/tiltcheck-extension.zip must exist").toBe(true);
    const extZipStat = fs.statSync(EXT_ZIP_PATH);
    expect(extZipStat.size, "Extension zip package must be >= 50KB").toBeGreaterThanOrEqual(50_000);

    expect(fs.existsSync(WEB_ZIP_PATH), "apps/web/public/downloads/tiltcheck-extension.zip must exist").toBe(true);
    const webZipStat = fs.statSync(WEB_ZIP_PATH);
    expect(webZipStat.size, "Web download mirror zip must be >= 50KB").toBeGreaterThanOrEqual(50_000);

    // Both zips should have matching size.
    expect(webZipStat.size).toBe(extZipStat.size);
  });
});

test.describe("Chrome Extension In-Browser Flow & Popup Controls", () => {
  test("popup shows only sign-in, the on/off switch, and Open Dashboard", async () => {
    const harness = await createExtensionHarness();
    try {
      const page: Page = await harness.context.newPage();
      await page.goto(`chrome-extension://${harness.extensionId}/popup.html`);
      expect(await page.title()).toMatch(/TiltCheck/i);

      await expect(page.locator("#btn-signin")).toBeVisible();
      await expect(page.locator("#master-switch")).toHaveAttribute("aria-checked", "true");
      await expect(page.locator("#btn-dashboard")).toHaveAttribute("href", "https://tiltcheck.me/dashboard/");
      // Settings moved to the dashboard.
      await expect(page.locator("#auto-lock-on-tilt-toggle")).toHaveCount(0);
      await expect(page.locator("#cooldown-wallet-input")).toHaveCount(0);
    } finally {
      await harness.cleanup();
    }
  });

  test("the on/off switch writes tiltcheck_enabled and survives re-query", async () => {
    const harness = await createExtensionHarness();
    try {
      const page: Page = await harness.context.newPage();
      await page.goto(`chrome-extension://${harness.extensionId}/popup.html`);
      const sw = page.locator("#master-switch");

      await sw.click();
      await expect(sw).toHaveAttribute("aria-checked", "false");
      const off = await page.evaluate(async () => (await chrome.storage.local.get("tiltcheck_enabled")).tiltcheck_enabled);
      expect(off).toBe(false);

      await sw.click();
      await expect(sw).toHaveAttribute("aria-checked", "true");
      const on = await page.evaluate(async () => (await chrome.storage.local.get("tiltcheck_enabled")).tiltcheck_enabled);
      expect(on).toBe(true);
    } finally {
      await harness.cleanup();
    }
  });
});

test.describe("Cooldown Web Deep-Link Integration", () => {
  test("renders critical auto-tilt intervention banner and wallet when deep-linked", async ({ page }) => {
    expect(fs.existsSync(OUT_COOLDOWN_PATH), "out/cooldown/index.html must exist").toBe(true);

    const fileUrl = `file:///${OUT_COOLDOWN_PATH.replace(/\\/g, "/")}?source=auto_tilt&wallet=${TEST_SOLANA_WALLET}&duration=86400`;
    await page.goto(fileUrl);

    // Verify auto-tilt alert banner is visible.
    const alertBanner = page.locator("#auto-tilt-alert-banner");
    await expect(alertBanner).toBeVisible();

    // Verify critical alert messaging and Level 3+ tilt indicator.
    await expect(alertBanner).toContainText("Critical Tilt Intervention: 24h Auto-Lock Triggered");
    await expect(alertBanner).toContainText("LEVEL 3+ TILT");

    // Verify configured wallet address is rendered in banner details.
    const walletText = page.locator("#auto-tilt-wallet");
    await expect(walletText).toBeVisible();
    await expect(walletText).toContainText(TEST_SOLANA_WALLET);
  });

  test("keeps auto-tilt banner hidden on standard cooldown visits without auto_tilt source", async ({ page }) => {
    const fileUrl = `file:///${OUT_COOLDOWN_PATH.replace(/\\/g, "/")}`;
    await page.goto(fileUrl);

    const alertBanner = page.locator("#auto-tilt-alert-banner");
    await expect(alertBanner).toBeHidden();
  });
});
