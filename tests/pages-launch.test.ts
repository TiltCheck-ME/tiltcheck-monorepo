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
      'Non-custodial brakes for casino sessions. Made for degens, by degens — not a lecture from your mom.',
      'You sign a Cooldown lock this wallet cannot cancel. Our tools honor it. Casino tabs do not. Wen zip + mainnet? soon.',
    ]);
    expect(SITE_PRIVACY).toBe('No wallet keys. No casino passwords.');
    expect(CTA_READY).toBe(false);
    expect(CTA_GATED_HINT).toBe('Phase 2. Zip is not public. Cooldown is the live lock.');
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
    expect(LAUNCH_CARDS[0]?.title).toBe('Cooldown');
    expect(LAUNCH_CARDS[0]?.step).toBe('Now');
    expect(LAUNCH_CARDS[1]?.step).toBe('Next');
    expect(LAUNCH_CARDS[0]?.body).toMatch(/No cancel in v1/);
    expect(LAUNCH_CARDS[0]?.body).toMatch(/Not a casino-tab lock/);
    expect(LAUNCH_HONESTY).toHaveLength(3);
    expect(LAUNCH_HONESTY[0]).toMatch(/does not lock Stake/);
    expect(LAUNCH_HONESTY.join(' ')).not.toContain('JustTheTip');
    expect(LAUNCH_HONESTY.join(' ')).not.toContain('SusLink');
  });
});

describe('GitHub Pages home HTML source', () => {
  const source = readFileSync(path.join(process.cwd(), 'scripts/convert-markdown.js'), 'utf8').replace(/\r\n/g, '\n');

  it('puts Cooldown in the hero and parks the gated zip in Phase 2', () => {
    expect(source).toContain('landing-hero-wen');
    expect(source).toContain('landing-hero-privacy');
    expect(source).toContain('Wen zip');
    expect(source).toContain('Phase 2 — coming soon');
    expect(source).not.toContain('Live stack');
    expect(source).not.toContain('LAUNCH_MOCK');
    expect(source).toContain(`<div class="hero-actions">
  <a class="btn btn-primary" href="/cooldown">SET A COOLDOWN LOCK</a>
  <a class="btn btn-secondary" href="/extension">EXTENSION DETAILS</a>
</div>`);
    const hero = source.slice(source.indexOf('function buildRootLanding()'), source.indexOf('function buildHomeRedirect'));
    expect(hero.indexOf('SET A COOLDOWN LOCK')).toBeGreaterThan(-1);
    expect(hero.indexOf('zipCtaHtml()')).toBeGreaterThan(hero.indexOf('id="install"'));
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

  it('uses root-absolute zip href so /extension can download', () => {
    expect(source).toContain('href="/downloads/tiltcheck-extension.zip"');
    expect(source).not.toContain('href="downloads/tiltcheck-extension.zip"');
  });

  it('styles the gated zipCtaHtml return as secondary so Cooldown stays the filled primary', () => {
    const start = source.indexOf('function zipCtaHtml()');
    const end = source.indexOf('function kickerHtml()');
    const fn = source.slice(start, end);
    const gatedReturn = fn.slice(fn.lastIndexOf('return `'));
    expect(gatedReturn).toContain('btn btn-secondary btn-disabled');
    expect(gatedReturn).not.toContain('btn-primary');
    expect(fn).toContain('class="btn btn-primary"');
  });
});
