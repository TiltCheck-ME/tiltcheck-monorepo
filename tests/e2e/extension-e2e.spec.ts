// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-13
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

// The popup opens in Easy mode, which hides the tabbed panels. The cooldown sync and
// auto-lock controls live on the Pro "block" tab (labelled Guards, later Settings).
async function openSettingsPanel(page: Page): Promise<void> {
  const proBtn = page.locator("#btn-mode-pro");
  if (await proBtn.isVisible()) {
    await proBtn.click();
  }
  await page.locator('.tab[data-tab="block"]').click();
  await expect(page.locator("#panel-block")).toBeVisible();
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
  test("loads unpacked MV3 extension and verifies popup initial state", async () => {
    const harness = await createExtensionHarness();
    try {
      const page: Page = await harness.context.newPage();
      await page.goto(`chrome-extension://${harness.extensionId}/popup.html`);
      await openSettingsPanel(page);

      // Verify title.
      const pageTitle = await page.title();
      expect(pageTitle).toMatch(/TiltCheck/i);

      // Verify On-Chain Lock Sync section exists.
      const syncWrap = page.locator("#cooldown-wallet-sync-wrap");
      await expect(syncWrap).toBeVisible();

      // Verify auto-lock toggle exists and is checked by default.
      const autoLockToggle = page.locator("#auto-lock-on-tilt-toggle");
      await expect(autoLockToggle).toBeVisible();
      await expect(autoLockToggle).toBeChecked();

      // Verify descriptive text for auto-lock rule.
      const toggleLabel = page.locator("label[for='auto-lock-on-tilt-toggle']");
      await expect(toggleLabel).toContainText("Auto-lock on Level 3+ tilt");

      // Verify Solana wallet input and sync button are visible.
      const walletInput = page.locator("#cooldown-wallet-input");
      const syncBtn = page.locator("#btn-sync-cooldown");
      await expect(walletInput).toBeVisible();
      await expect(syncBtn).toBeVisible();
    } finally {
      await harness.cleanup();
    }
  });

  test("toggling auto-lock updates storage state and survives re-query", async () => {
    const harness = await createExtensionHarness();
    try {
      const page: Page = await harness.context.newPage();
      await page.goto(`chrome-extension://${harness.extensionId}/popup.html`);
      await openSettingsPanel(page);

      const autoLockToggle = page.locator("#auto-lock-on-tilt-toggle");
      await expect(autoLockToggle).toBeChecked();

      // Toggle off.
      await autoLockToggle.uncheck();
      await expect(autoLockToggle).not.toBeChecked();

      // Verify chrome.storage.local reflects disabled state.
      const storedValueDisabled = await page.evaluate(async () => {
        const data = await chrome.storage.local.get("tiltcheck_auto_lock_on_tilt");
        return data.tiltcheck_auto_lock_on_tilt;
      });
      expect(storedValueDisabled).toBe(false);

      // Toggle back on.
      await autoLockToggle.check();
      await expect(autoLockToggle).toBeChecked();

      // Verify chrome.storage.local reflects enabled state.
      const storedValueEnabled = await page.evaluate(async () => {
        const data = await chrome.storage.local.get("tiltcheck_auto_lock_on_tilt");
        return data.tiltcheck_auto_lock_on_tilt;
      });
      expect(storedValueEnabled).toBe(true);
    } finally {
      await harness.cleanup();
    }
  });

  test("syncs Solana cooldown wallet to extension storage via service worker", async () => {
    const harness = await createExtensionHarness();
    try {
      const page: Page = await harness.context.newPage();
      await page.goto(`chrome-extension://${harness.extensionId}/popup.html`);
      await openSettingsPanel(page);

      const walletInput = page.locator("#cooldown-wallet-input");
      const syncBtn = page.locator("#btn-sync-cooldown");

      // Enter test Solana wallet.
      await walletInput.fill(TEST_SOLANA_WALLET);

      // Click sync and assert state transition.
      await syncBtn.click();
      await expect(syncBtn).toHaveText(/Synced/i);

      // Verify chrome.storage.local holds the configured wallet address.
      const storedWallet = await page.evaluate(async () => {
        const data = await chrome.storage.local.get("tiltcheck_cooldown_wallet");
        return data.tiltcheck_cooldown_wallet;
      });
      expect(storedWallet).toBe(TEST_SOLANA_WALLET);
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
