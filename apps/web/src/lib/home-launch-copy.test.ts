// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-30
import { describe, expect, it } from 'vitest';
import { HOME_LAUNCH } from './home-launch-copy';
import { SITE_ONE_LINER, SITE_OG_SUBLINE, SITE_SEO_TITLE } from './site-copy';
import { TOOL_REGISTRY } from './tool-registry';

const homeBlob = JSON.stringify(HOME_LAUNCH).toLowerCase();

describe('HOME_LAUNCH', () => {
  it('locks brakes-only hero copy', () => {
    expect(HOME_LAUNCH.h1).toEqual(['House always wins?', 'FUCK THAT.']);
    expect(HOME_LAUNCH.dopamine).toBe("The math isn't rigged. Your dopamine is.");
    expect(HOME_LAUNCH.kicker).toBe(
      'Chasing the loss, chasing the win, thinking you are due. That is feeding the house.',
    );
    expect(HOME_LAUNCH.lede).toMatch(/Brakes for degens who still play/i);
    expect(HOME_LAUNCH.lede).toMatch(/Sign a Cooldown/i);
    expect(HOME_LAUNCH.lede).toMatch(/stack back on the table/i);
    expect(HOME_LAUNCH.lede).not.toMatch(/weasel/i);
    expect(HOME_LAUNCH.lede).not.toMatch(/Pro only/i);
  });

  it('uses two hero buttons and a text tertiary', () => {
    expect(HOME_LAUNCH.ctaReady).toBe(false);
    expect(HOME_LAUNCH.secondaryCtas).toEqual([
      { label: "DON'T FEED THE HOUSE", href: '/cooldown' },
      { label: 'IS THIS CASINO SUS?', href: '/casinos' },
    ]);
    expect(HOME_LAUNCH.tertiaryLink).toEqual({
      label: 'How the Chrome brakes work',
      href: '/extension',
    });
    expect(HOME_LAUNCH.privacy).toMatch(/You sign a Cooldown/i);
    expect(HOME_LAUNCH.privacy).toMatch(/Zip is not on this site/i);
  });

  it('names how-it-works moves without weasel', () => {
    expect(HOME_LAUNCH.installMoves.map((m) => m.title)).toEqual([
      'Look up the house',
      "Don't feed it",
      'Slow the next click',
    ]);
    expect(HOME_LAUNCH.installMoves[1]?.body).toMatch(/Sign a Cooldown/i);
    expect(HOME_LAUNCH.installMoves[2]?.body).toMatch(/two seconds/i);
    expect(homeBlob).not.toContain('weasel');
    expect(homeBlob).not.toContain('self-exclusion');
  });

  it('scopes AutoVault to two casinos and keeps honesty on devnet', () => {
    expect(HOME_LAUNCH.vault.href).toBe('/tools/auto-vault');
    expect(HOME_LAUNCH.vault.title).toMatch(/sites we actually support/i);
    expect(HOME_LAUNCH.vault.body).toMatch(/Stake\.us/i);
    expect(HOME_LAUNCH.vault.body).toMatch(/nuts\.gg/i);
    expect(HOME_LAUNCH.honesty).toHaveLength(4);
    expect(HOME_LAUNCH.honesty.join(' ')).toMatch(/devnet/i);
    expect(HOME_LAUNCH.honesty.join(' ')).toMatch(/two casinos/i);
    expect(HOME_LAUNCH.honesty.join(' ')).not.toMatch(/lounge/i);
    expect(homeBlob).not.toContain('lounge');
  });

  it('does not call Cooldown self-exclusion in the pitch', () => {
    expect(SITE_OG_SUBLINE.toLowerCase()).not.toContain('self-exclusion');
    expect(TOOL_REGISTRY[0]?.href).toBe('/cooldown');
    expect(SITE_SEO_TITLE).toMatch(/Brakes/i);
    expect(SITE_ONE_LINER).toMatch(/never hold your keys/i);
  });
});
