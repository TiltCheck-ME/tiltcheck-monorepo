// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-04
import { describe, expect, it } from 'vitest';
import { SITEMAP_PAGE_ENTRIES } from './sitemap-entries';

const STAY_PATHS = ['/', '/privacy', '/terms', '/legal', '/login', '/dashboard', '/touch-grass'];

describe('sitemap-entries', () => {
  it('lists only the pages that stay on the public site', () => {
    expect(SITEMAP_PAGE_ENTRIES.map((entry) => entry.path).sort()).toEqual([...STAY_PATHS].sort());
  });

  it('does not hand the dashboard entry to another host', () => {
    const dashboard = SITEMAP_PAGE_ENTRIES.find((entry) => entry.path === '/dashboard');
    expect(dashboard?.href).toBeUndefined();
  });
});
