// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-09
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

  it('explains the two-second spin lock and the scam-link check', () => {
    expect(HOME_LAUNCH.lede).toBe(
      'Download the zip and load it in Chrome. Open a casino you already use. Every spin locks the spin button for two seconds. The countdown sits on the button. Click it early and the click does not go through.',
    );
    expect(HOME_LAUNCH.cards.map((card) => card.title)).toEqual([
      'Locks the spin',
      'Swallows the mash',
      'Gives the button back',
    ]);
    expect(HOME_LAUNCH.cards[0]?.body).toBe(
      'Every spin goes through, then the spin button locks for two seconds. Other clicks on the page do not start the lock.',
    );
    expect(HOME_LAUNCH.cards[1]?.body).toBe(
      'A click while the button is locked does not spin and does not add time. The line is: No cap, the balance is still catching that last spin.',
    );
    expect(HOME_LAUNCH.cards[2]?.body).toBe(
      'At zero the button works again. The next spin starts a fresh two seconds.',
    );
    expect(HOME_LAUNCH.installSteps[2]).toBe(
      'Open a supported casino and play. Every spin locks the button for two seconds.',
    );
    expect(HOME_LAUNCH.mock).toMatchObject({
      status: 'Button locked',
      signal: '2s',
      footer: 'Balance still catching up',
      chip: 'Does not touch your wallet',
    });
    const blob = [
      HOME_LAUNCH.lede,
      ...HOME_LAUNCH.cards.map((card) => `${card.title} ${card.body}`),
      ...HOME_LAUNCH.installSteps,
      HOME_LAUNCH.mock.status,
      HOME_LAUNCH.mock.footer,
    ].join(' ');
    expect(blob).not.toContain('tab is covered');
    expect(blob).not.toContain('two minutes');
    expect(blob).not.toContain('cannot close it early');
    expect(HOME_LAUNCH.honesty.join(' ')).toContain('serious scam');
    expect(HOME_LAUNCH.honesty.join(' ')).not.toContain('Approved');
    expect(HOME_LAUNCH.honesty.join(' ')).not.toContain('Instant Redeem');
  });

  it('sets the share title and a short meta description', () => {
    expect(SITE_SEO_TITLE).toBe('TiltCheck | House always wins? FUCK THAT.');
    expect(SITE_ONE_LINER).toBe(
      'Chrome add-on that locks the spin button for two seconds after every spin on a casino tab.',
    );
  });
});
