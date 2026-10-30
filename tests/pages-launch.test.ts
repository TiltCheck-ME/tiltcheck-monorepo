// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-30
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CTA_READY,
  SECONDARY_CTAS,
  SITE_DOPAMINE,
  SITE_KICKER,
  TERTIARY_LINK,
  VAULT,
} from '../scripts/pages-product-data.mjs';

const convertMarkdown = readFileSync(
  path.join(process.cwd(), 'scripts/convert-markdown.js'),
  'utf8',
);

describe('GitHub Pages launch twin', () => {
  it('locks brakes hero copy to the Next twin', () => {
    expect(CTA_READY).toBe(false);
    expect(SITE_DOPAMINE).toBe("The math isn't rigged. Your dopamine is.");
    expect(SITE_KICKER).toMatch(/thinking you are due/i);
    expect(SECONDARY_CTAS).toHaveLength(2);
    expect(SECONDARY_CTAS[0]).toEqual({
      label: "DON'T FEED THE HOUSE",
      href: 'https://tiltcheck.me/cooldown',
      primary: true,
    });
    expect(SECONDARY_CTAS[1]).toEqual({
      label: 'IS THIS CASINO SUS?',
      href: 'https://tiltcheck.me/casinos',
      primary: false,
    });
    expect(TERTIARY_LINK.href).toBe('extension.html');
    expect(VAULT.href).toBe('https://tiltcheck.me/tools/auto-vault');
    expect(VAULT.body).toMatch(/Stake\.us/i);
    expect(convertMarkdown).toContain('landing-hud');
    expect(convertMarkdown).toContain('${SITE_URL}/touch-grass">Touch Grass');
    expect(convertMarkdown).not.toMatch(/Bonuses/i);
    expect(convertMarkdown).not.toContain('pit-hero');
    expect(convertMarkdown).not.toMatch(/Zip soon™/);
    expect(convertMarkdown).not.toMatch(/lounge/i);
  });

  it('does not emit a live zip download while the sideload is gated', () => {
    expect(convertMarkdown).not.toContain(
      'href="downloads/tiltcheck-extension.zip" download>DOWNLOAD THE ZIP',
    );
  });
});
