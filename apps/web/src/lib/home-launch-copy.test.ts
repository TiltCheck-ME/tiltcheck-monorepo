// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-12
import { describe, expect, it } from 'vitest';
import { HOME_LAUNCH } from './home-launch-copy';
import { SITE_ONE_LINER, SITE_SEO_TITLE } from './site-copy';

describe('HOME_LAUNCH', () => {
  it('keeps the headline and primary zip CTA', () => {
    expect(HOME_LAUNCH.h1).toEqual(['House always wins?', 'FUCK THAT.']);
    expect(HOME_LAUNCH.ctaLabel).toBe('DOWNLOAD THE ZIP');
    expect(HOME_LAUNCH.ctaHref).toBe('/downloads/tiltcheck-extension.zip');
  });

  it('surfaces Cooldown as the flagship wedge', () => {
    expect(HOME_LAUNCH.kicker.join(' ')).toContain('Cooldown');
    expect(HOME_LAUNCH.lede).toContain('on-chain');
    expect(HOME_LAUNCH.cards[0]?.title).toContain('Cooldown');
    expect(HOME_LAUNCH.secondaryCtas.map((cta) => cta.href)).toContain('/cooldown');
  });

  it('describes the full stack honestly', () => {
    expect(HOME_LAUNCH.honesty.join(' ')).toContain('devnet');
    expect(HOME_LAUNCH.honesty.join(' ')).toContain('Trust scores');
    expect(HOME_LAUNCH.honesty.join(' ')).not.toContain('Approved');
    expect(HOME_LAUNCH.honesty.join(' ')).not.toContain('Instant Redeem');
  });

  it('sets SEO title and meta description for the full product', () => {
    expect(SITE_SEO_TITLE).toContain('Cooldown');
    expect(SITE_ONE_LINER).toContain('trust scores');
    expect(SITE_ONE_LINER).toContain('Non-custodial');
  });
});
