// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-30
import { readFileSync } from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';
import { PUBLIC_NAV } from './public-nav';

describe('PUBLIC_NAV', () => {
  it('lists Cooldown, extension, Touch Grass, and trust intel', () => {
    expect(PUBLIC_NAV.links.map((link) => link.href)).toEqual([
      '/cooldown',
      '/extension',
      '/touch-grass',
      '/intel/rtp',
    ]);
    expect(PUBLIC_NAV.links.map((link) => link.label)).not.toContain('Bonuses');
    expect(PUBLIC_NAV.downloadHref).toBe('/extension');
    expect(PUBLIC_NAV.downloadLabel).toBe('Extension');
  });

  it('renders product links from PUBLIC_NAV in the nav component', () => {
    const source = readFileSync(
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../components/Nav.tsx'),
      'utf8',
    );
    expect(source).toContain('PUBLIC_NAV.links');
    expect(source).not.toContain("href: '/operators'");
    expect(source).not.toContain("href: '/tools'");
  });
});
