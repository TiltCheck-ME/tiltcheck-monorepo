// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-29
import { describe, expect, it } from 'vitest';
import { decidePublicRoute } from './public-route-gate';

describe('decidePublicRoute', () => {
  it('keeps launch pages, live marketing routes, and the zip', () => {
    for (const path of [
      '/',
      '/privacy',
      '/terms',
      '/legal',
      '/login',
      '/dashboard',
      '/touch-grass',
      '/touch-grass/trivia',
      '/touch-grass/dad',
      '/touch-grass/trivia/',
      '/extension',
      '/bonuses',
      '/cooldown',
      '/cooldown/casino-demo',
      '/intel/rtp',
      '/blog',
      '/blog/hello',
      '/microgrant',
      '/casinos',
      '/casinos/stake',
      '/sitemap.xml',
      '/robots.txt',
      '/downloads/tiltcheck-extension.zip',
      '/tools/auto-vault',
      '/tools/auto-vault/android',
      '/tools/auto-vault/share',
      '/nuts',
      '/stake',
    ]) {
      expect(decidePublicRoute(path)).toEqual({ action: 'next' });
    }
  });

  it('keeps api, next assets, intel share tokens, and files with an extension', () => {
    for (const path of ['/api/funnel', '/_next/static/chunk.js', '/ask/v/abc', '/icon.png']) {
      expect(decidePublicRoute(path)).toEqual({ action: 'next' });
    }
  });

  it('sends retired marketing paths home with a temporary redirect', () => {
    for (const path of ['/tools', '/operators', '/operators/instant-redeem', '/docs', '/legal/limit', '/ask', '/site-map']) {
      expect(decidePublicRoute(path)).toEqual({ action: 'redirect', status: 307, destination: '/' });
    }
  });

  it('ignores a trailing slash and does not treat /legal/limit as /legal', () => {
    expect(decidePublicRoute('/privacy/')).toEqual({ action: 'next' });
    expect(decidePublicRoute('/legal/limit/')).toEqual({ action: 'redirect', status: 307, destination: '/' });
  });
});
