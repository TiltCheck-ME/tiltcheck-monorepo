// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-14
import { describe, expect, it } from 'vitest';
import { HOME_LAUNCH } from './home-launch-copy';
import { SITE_ONE_LINER, SITE_SEO_TITLE } from './site-copy';
import { TOOL_REGISTRY } from './tool-registry';

describe('HOME_LAUNCH', () => {
  it('keeps the headline and gates the zip CTA until the sideload is public', () => {
    expect(HOME_LAUNCH.h1).toEqual(['House always wins?', 'FUCK THAT.']);
    expect(HOME_LAUNCH.ctaReady).toBe(false);
    expect(HOME_LAUNCH.ctaLabel).toBe('DOWNLOAD THE ZIP');
    expect(HOME_LAUNCH.ctaGatedLabel).toBe('ZIP DROPS SOON™');
    expect(HOME_LAUNCH.ctaGatedHint).toBe('Phase 2. Zip is not public. Cooldown is the live lock.');
    expect(HOME_LAUNCH.ctaHref).toBe('/downloads/tiltcheck-extension.zip');
  });

  it('surfaces Cooldown as the flagship wedge', () => {
    expect(HOME_LAUNCH.kicker[0]).toBe('The house banks on your tilt.');
    expect(HOME_LAUNCH.kicker[1]).toMatch(/Non-custodial brakes/i);
    expect(HOME_LAUNCH.kicker[1]).toMatch(/not a lecture from your mom/i);
    expect(HOME_LAUNCH.kicker.join(' ')).toContain('Cooldown');
    expect(HOME_LAUNCH.cards[0]?.title).toContain('Cooldown');
    expect(HOME_LAUNCH.secondaryCtas.map((cta) => cta.href)).toContain('/cooldown');
  });

  it('describes the full stack honestly', () => {
    expect(HOME_LAUNCH.honesty.join(' ')).toMatch(/devnet/i);
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
    expect(HOME_LAUNCH.installSteps.join(' ')).toContain('2s spin lock');
    expect(HOME_LAUNCH.installSteps.join(' ')).not.toMatch(/two minutes/i);
    expect(HOME_LAUNCH.cards[1]?.body).toContain('2s spin lock');
    expect(HOME_LAUNCH.cards[1]?.body).toContain('Touch Grass is Pro');
    expect(HOME_LAUNCH.honesty.join(' ')).toContain('Core is 2s');
    expect(HOME_LAUNCH.honesty.join(' ')).not.toMatch(/two minutes/i);
  });

  it('lists Cooldown first in the public tool registry', () => {
    expect(TOOL_REGISTRY[0]?.href).toBe('/cooldown');
    expect(TOOL_REGISTRY[0]?.status).toBe('live');
  });

  it('matches the Pages punch and does not restack product facts in a lede', () => {
    expect(HOME_LAUNCH.kicker[2]).toContain('Wen zip + mainnet');
    expect(HOME_LAUNCH.kicker[2]).toMatch(/Casino tabs do not/);
    expect(HOME_LAUNCH.privacy).toBe('No wallet keys. No casino passwords.');
    expect(HOME_LAUNCH.honesty).toHaveLength(3);
    expect(HOME_LAUNCH.secondaryCtas[0]).toEqual({ label: 'SET A COOLDOWN LOCK', href: '/cooldown' });
    expect(Object.prototype.hasOwnProperty.call(HOME_LAUNCH, 'lede')).toBe(false);
  });
});
