// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-13
import { describe, expect, it } from 'vitest';
import { HOME_LAUNCH } from './home-launch-copy';
import { SITE_ONE_LINER, SITE_SEO_TITLE } from './site-copy';
import { TOOL_REGISTRY } from './tool-registry';

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

  it('does not sell Core as a two-minute fullscreen lock', () => {
    expect(HOME_LAUNCH.lede).toContain('two-second');
    expect(HOME_LAUNCH.lede).toContain('Pro only');
    expect(HOME_LAUNCH.installSteps.join(' ')).toContain('two seconds');
    expect(HOME_LAUNCH.installSteps.join(' ')).not.toMatch(/two minutes/i);
    expect(HOME_LAUNCH.cards[1]?.body).toContain('two seconds');
    expect(HOME_LAUNCH.cards[1]?.body).toContain('Pro monolith');
    expect(HOME_LAUNCH.honesty.join(' ')).toContain('2s spin lock');
  });

  it('lists Cooldown first in the public tool registry', () => {
    expect(TOOL_REGISTRY[0]?.href).toBe('/cooldown');
    expect(TOOL_REGISTRY[0]?.status).toBe('live');
  });
});
