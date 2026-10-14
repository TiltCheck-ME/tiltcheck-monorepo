// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-14
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
