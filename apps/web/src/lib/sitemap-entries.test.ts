// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-13
import { describe, expect, it } from 'vitest';
import { SITEMAP_PAGE_ENTRIES } from './sitemap-entries';

const REQUIRED_PATHS = [
  '/',
  '/cooldown',
  '/cooldown/casino-demo',
  '/extension',
  '/bonuses',
  '/intel/rtp',
  '/blog',
  '/microgrant',
  '/privacy',
  '/terms',
  '/legal',
  '/login',
  '/dashboard',
  '/touch-grass',
];

describe('sitemap-entries', () => {
  it('lists live public marketing and legal routes', () => {
    const paths = SITEMAP_PAGE_ENTRIES.map((entry) => entry.path);
    for (const required of REQUIRED_PATHS) {
      expect(paths).toContain(required);
    }
  });

  it('does not hand the dashboard entry to another host', () => {
    const dashboard = SITEMAP_PAGE_ENTRIES.find((entry) => entry.path === '/dashboard');
    expect(dashboard?.href).toBeUndefined();
  });
});
