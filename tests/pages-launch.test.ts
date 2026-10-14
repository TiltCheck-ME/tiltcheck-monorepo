// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-14
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CTA_GATED_HINT,
  CTA_READY,
  LAUNCH_CARDS,
  LAUNCH_HONESTY,
  SECONDARY_CTAS,
  SITE_KICKER,
  SITE_PRIVACY,
} from '../scripts/pages-product-data.mjs';

describe('GitHub Pages launch copy', () => {
  it('keeps the hero punch and wen, without a lede blob', () => {
    expect(SITE_KICKER).toEqual([
      'The house banks on your tilt.',
      'Harm reduction made for degens, by degens. Tested tools — not a lecture from your mom.',
      'Cooldown v2: you sign. No keys. Wen mainnet? soon.',
    ]);
    expect(SITE_PRIVACY).toBe('No wallet keys. No casino passwords.');
    expect(CTA_READY).toBe(false);
    expect(CTA_GATED_HINT).toBe('Zip is not public yet. Cooldown is the lock that ships today.');
  });

  it('makes Cooldown the real primary and Extension a same-origin page', () => {
    expect(SECONDARY_CTAS[0]).toEqual({
      label: 'SET A COOLDOWN LOCK',
      href: '/cooldown',
      primary: true,
    });
    expect(SECONDARY_CTAS[1]).toEqual({
      label: 'EXTENSION DETAILS',
      href: '/extension',
      primary: false,
    });
  });

  it('puts product facts in three short cards and three honesty bullets', () => {
    expect(LAUNCH_CARDS).toHaveLength(3);
    expect(LAUNCH_CARDS[0]?.body).toMatch(/No cancel in v1/);
    expect(LAUNCH_HONESTY).toHaveLength(3);
    expect(LAUNCH_HONESTY.join(' ')).not.toContain('JustTheTip');
    expect(LAUNCH_HONESTY.join(' ')).not.toContain('SusLink');
  });
});

describe('GitHub Pages home HTML source', () => {
  const source = readFileSync(path.join(process.cwd(), 'scripts/convert-markdown.js'), 'utf8').replace(/\r\n/g, '\n');

  it('orders Cooldown primary ahead of the gated zip and has no live-stack card', () => {
    expect(source).toContain('landing-hero-wen');
    expect(source).toContain('landing-hero-privacy');
    expect(source).toContain('Wen zip');
    expect(source).not.toContain('Live stack');
    expect(source).not.toContain('LAUNCH_MOCK');
    const cooldownBtn = source.indexOf('SET A COOLDOWN LOCK');
    const zipFn = source.indexOf('zipCtaHtml()');
    expect(cooldownBtn).toBeGreaterThan(-1);
    expect(zipFn).toBeGreaterThan(-1);
    expect(source).toContain(`<div class="hero-actions">
  <a class="btn btn-primary" href="/cooldown">SET A COOLDOWN LOCK</a>
  \${zipCtaHtml()}
  <a class="btn btn-secondary" href="/extension">EXTENSION DETAILS</a>
</div>`);
  });
});

describe('GitHub Pages builder source', () => {
  const source = readFileSync(path.join(process.cwd(), 'scripts/convert-markdown.js'), 'utf8');

  it('writes cooldown and extension index pages and does not retire extension home', () => {
    expect(source).toContain("path.join(siteRoot, 'cooldown')");
    expect(source).toContain("path.join(siteRoot, 'extension')");
    expect(source).toContain('buildCooldownPage()');
    expect(source).toContain('buildExtensionPage()');
    expect(source).toContain("retired of ['casinos.html', 'tools.html']");
    expect(source).toContain('COOLDOWN_PAGE');
    expect(source).toContain('COOLDOWN_PAGE.title');
  });
});
