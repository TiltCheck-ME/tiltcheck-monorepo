// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-04
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PUBLIC_NAV } from './public-nav';

describe('PUBLIC_NAV', () => {
  it('offers download, discord, and account', () => {
    expect(PUBLIC_NAV).toEqual({
      downloadHref: '/#install',
      downloadLabel: 'Download',
      discordLabel: 'Discord',
      accountLabel: 'Account',
    });
  });

  it('is the only product link in the nav component', () => {
    const source = readFileSync(
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../components/Nav.tsx'),
      'utf8',
    );
    expect(source).toContain('PUBLIC_NAV');
    expect(source).not.toContain("href: '/casinos'");
    expect(source).not.toContain("href: '/tools'");
    expect(source).not.toContain("href: '/operators'");
    expect(source).not.toContain('href="/extension"');
  });
});
