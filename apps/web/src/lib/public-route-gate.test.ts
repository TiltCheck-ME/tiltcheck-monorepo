// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-04
import { describe, expect, it } from 'vitest';
import { decidePublicRoute } from './public-route-gate';

describe('decidePublicRoute', () => {
  it('keeps the launch pages and the zip', () => {
    for (const path of ['/', '/privacy', '/terms', '/legal', '/login', '/dashboard', '/touch-grass', '/sitemap.xml', '/robots.txt', '/downloads/tiltcheck-extension.zip']) {
      expect(decidePublicRoute(path)).toEqual({ action: 'next' });
    }
  });

  it('keeps api, next assets, intel share tokens, and files with an extension', () => {
    for (const path of ['/api/funnel', '/_next/static/chunk.js', '/ask/v/abc', '/icon.png']) {
      expect(decidePublicRoute(path)).toEqual({ action: 'next' });
    }
  });

  it('sends retired marketing paths home with a temporary redirect', () => {
    for (const path of ['/casinos', '/casinos/stake', '/tools', '/tools/auto-vault', '/operators', '/operators/instant-redeem', '/extension', '/blog', '/blog/hello', '/docs', '/legal/limit', '/ask', '/site-map']) {
      expect(decidePublicRoute(path)).toEqual({ action: 'redirect', status: 307, destination: '/' });
    }
  });

  it('ignores a trailing slash and does not treat /legal/limit as /legal', () => {
    expect(decidePublicRoute('/privacy/')).toEqual({ action: 'next' });
    expect(decidePublicRoute('/legal/limit/')).toEqual({ action: 'redirect', status: 307, destination: '/' });
  });
});
