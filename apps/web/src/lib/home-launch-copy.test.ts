// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-07
import { describe, expect, it } from 'vitest';
import { HOME_LAUNCH } from './home-launch-copy';
import { SITE_ONE_LINER, SITE_SEO_TITLE } from './site-copy';

describe('HOME_LAUNCH', () => {
  it('uses the locked headline, kicker, and zip button', () => {
    expect(HOME_LAUNCH.h1).toEqual(['House always wins?', 'FUCK THAT.']);
    expect(HOME_LAUNCH.kicker).toEqual([
      "The math isn't rigged. Your dopamine is.",
      'The house banks on your tilt.',
    ]);
    expect(HOME_LAUNCH.ctaLabel).toBe('DOWNLOAD THE ZIP');
    expect(HOME_LAUNCH.ctaHref).toBe('/downloads/tiltcheck-extension.zip');
  });

  it('explains the click cover and the scam-link check', () => {
    expect(HOME_LAUNCH.lede).toContain('counts clicks');
    expect(HOME_LAUNCH.lede).toContain('Touch Grass');
    expect(HOME_LAUNCH.cards.map((card) => card.title)).toEqual([
      'Counts your clicks',
      'Covers the tab',
      'Gives the site back',
    ]);
    expect(HOME_LAUNCH.honesty.join(' ')).toContain('serious scam');
    expect(HOME_LAUNCH.honesty.join(' ')).not.toContain('Approved');
    expect(HOME_LAUNCH.honesty.join(' ')).not.toContain('Instant Redeem');
  });

  it('sets the share title and a short meta description', () => {
    expect(SITE_SEO_TITLE).toBe('TiltCheck | House always wins? FUCK THAT.');
    expect(SITE_ONE_LINER).toBe(
      'Chrome add-on that counts clicks on casino tabs and covers the tab for about two minutes when clicking gets frantic.',
    );
  });
});
