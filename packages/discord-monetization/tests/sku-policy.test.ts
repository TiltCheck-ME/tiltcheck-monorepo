// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-06
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getConfiguredGameAddonSkuIds,
  getJitFeeWaiverSkuIds,
  getLegacyPlatformMonetizationSkuIds,
  isConfiguredGameAddonSku,
  isLegacyPlatformMonetizationSku,
  parseCommaSkuList,
} from '../src/sku-policy.js';

describe('sku-policy', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('parses comma SKU lists and drops REPLACE_ME', () => {
    expect(parseCommaSkuList('a, b ,c')).toEqual(['a', 'b', 'c']);
    expect(parseCommaSkuList('x,REPLACE_ME,y')).toEqual(['x', 'y']);
  });

  it('classifies legacy vs game add-on SKUs from env', () => {
    vi.stubEnv('DISCORD_SKU_PRO_ID', 'pro-1');
    vi.stubEnv('DISCORD_SKU_ELITE_ID', 'REPLACE_ME');
    vi.stubEnv('DISCORD_SKU_GAME_ADDON_IDS', 'game-a,game-b');

    expect(getLegacyPlatformMonetizationSkuIds()).toEqual(['pro-1']);
    expect(getConfiguredGameAddonSkuIds()).toEqual(['game-a', 'game-b']);
    expect(isLegacyPlatformMonetizationSku('pro-1')).toBe(true);
    expect(isConfiguredGameAddonSku('game-a')).toBe(true);
    expect(isLegacyPlatformMonetizationSku('game-a')).toBe(false);
  });

  it('exposes JTT fee waiver SKUs independently', () => {
    vi.stubEnv('DISCORD_SKU_JTT_FEE_WAIVER_IDS', 'fee-1,fee-2');
    vi.stubEnv('DISCORD_SKU_GAME_ADDON_IDS', 'game-only');

    expect(getJitFeeWaiverSkuIds()).toEqual(['fee-1', 'fee-2']);
  });
});
