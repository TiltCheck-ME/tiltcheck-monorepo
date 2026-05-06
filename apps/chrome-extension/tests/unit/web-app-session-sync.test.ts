/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-06 */
/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import { isTiltCheckMarketingSite, WEB_TOKEN_STORAGE_KEY } from '../../src/web-app-session-sync.ts';

describe('web-app-session-sync', () => {
  it('uses the same localStorage key as apps/web fetchAuthSession default', () => {
    expect(WEB_TOKEN_STORAGE_KEY).toBe('tc_token');
  });

  it('treats apex and www marketing hosts as web app pages', () => {
    expect(isTiltCheckMarketingSite('tiltcheck.me')).toBe(true);
    expect(isTiltCheckMarketingSite('www.tiltcheck.me')).toBe(true);
  });

  it('does not treat other TiltCheck subdomains as the marketing site shell', () => {
    expect(isTiltCheckMarketingSite('dashboard.tiltcheck.me')).toBe(false);
    expect(isTiltCheckMarketingSite('api.tiltcheck.me')).toBe(false);
  });
});
