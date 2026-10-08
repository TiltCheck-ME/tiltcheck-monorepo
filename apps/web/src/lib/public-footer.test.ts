// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-04
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PUBLIC_FOOTER_LINKS } from './public-footer';

describe('PUBLIC_FOOTER_LINKS', () => {
  it('lists privacy, terms, and legal', () => {
    expect(PUBLIC_FOOTER_LINKS).toEqual([
      { href: '/privacy', label: 'Privacy' },
      { href: '/terms', label: 'Terms' },
      { href: '/legal', label: 'Legal' },
    ]);
  });

  it('is what the footer renders', () => {
    const source = readFileSync(
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../components/Footer.tsx'),
      'utf8',
    );
    expect(source).toContain('PUBLIC_FOOTER_LINKS');
    expect(source).toContain('BrandTagline');
    expect(source).toContain('https://www.ncpg.org');
    expect(source).toContain('1-800-GAMBLER');
    expect(source).not.toContain('KOFI_URL');
    expect(source).not.toContain('/operators');
    expect(source).not.toContain('/tools');
    expect(source).not.toContain('Instant Redeem');
    expect(source).not.toContain('QUOTES');
  });
});
