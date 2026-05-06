// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-06
/**
 * Central SKU env parsing for Discord monetization policy (TIL-36).
 * Platform subscription SKUs are retired from sale/fulfillment hooks;
 * game add-on SKUs remain configurable via DISCORD_SKU_GAME_ADDON_IDS.
 */

const REPLACE_SENTINEL = 'REPLACE_ME';

export function normalizeSkuEnv(value: string | undefined): string | undefined {
  const v = value?.trim();
  if (!v || v === REPLACE_SENTINEL) return undefined;
  return v;
}

export function parseCommaSkuList(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s !== REPLACE_SENTINEL);
}

/**
 * Retired non-game-add-on SKUs (Degen/Platinum/Lifetime/Support style).
 * Used to suppress auto-role fulfillment while still logging purchases.
 */
export function getLegacyPlatformMonetizationSkuIds(): string[] {
  const singles = [
    normalizeSkuEnv(process.env.DISCORD_SKU_PRO_ID),
    normalizeSkuEnv(process.env.DISCORD_SKU_ELITE_ID),
    normalizeSkuEnv(process.env.DISCORD_SKU_LIFETIME_ID),
    normalizeSkuEnv(process.env.DISCORD_SKU_OG_LIFETIME_ID),
    normalizeSkuEnv(process.env.DISCORD_SKU_SUPPORT_ID),
  ].filter((v): v is string => Boolean(v));
  return [...new Set(singles)];
}

/** Game add-on SKU IDs (comma-separated) — sole SKUs exposed via /upgrade. */
export function getConfiguredGameAddonSkuIds(): string[] {
  return [...new Set(parseCommaSkuList(process.env.DISCORD_SKU_GAME_ADDON_IDS))];
}

/**
 * SKUs that grant JustTheTip protocol fee waiver (checked via Discord entitlements API).
 * Must be set explicitly; do not implicitly reuse game add-on IDs.
 */
export function getJitFeeWaiverSkuIds(): string[] {
  return [...new Set(parseCommaSkuList(process.env.DISCORD_SKU_JTT_FEE_WAIVER_IDS))];
}

export function isLegacyPlatformMonetizationSku(skuId: string): boolean {
  return getLegacyPlatformMonetizationSkuIds().includes(skuId);
}

export function isConfiguredGameAddonSku(skuId: string): boolean {
  return getConfiguredGameAddonSkuIds().includes(skuId);
}
