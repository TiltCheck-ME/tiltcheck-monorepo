// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-04
import { existsSync, readFileSync } from 'node:fs';
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
    expect(CTA_READY).toBe(true);
    expect(SITE_DOPAMINE).toBe("The math isn't rigged. Your dopamine is.");
    expect(SITE_KICKER).toMatch(/thinking you are due/i);
    expect(SECONDARY_CTAS).toHaveLength(2);
    expect(SECONDARY_CTAS[0]).toEqual({
      label: "DON'T FEED THE HOUSE",
      href: 'cooldown/',
      primary: true,
    });
    expect(SECONDARY_CTAS[1]).toEqual({
      label: 'IS THIS CASINO SUS?',
      href: 'casinos/',
      primary: false,
    });
    expect(TERTIARY_LINK.href).toBe('extension.html');
    expect(VAULT.href).toBe('autovault/');
    expect(convertMarkdown).toContain('buildAutovaultPage');
    expect(convertMarkdown).toContain('site-nav__discord');
    expect(convertMarkdown).not.toContain('>Discord</a>');
    expect(VAULT.body).toMatch(/Stake\.us/i);
    expect(convertMarkdown).not.toContain('landing-hud');
    expect(convertMarkdown).toContain("dirHref(depth, 'nudges')");
    expect(convertMarkdown).toContain('buildNudgesPage');
    expect(convertMarkdown).toContain('buildCooldownPage');
    expect(convertMarkdown).toContain('Terminal Cooldown (No Wallet Needed)');
    expect(convertMarkdown).not.toContain('Offline Cryptographic Lock');
    expect(convertMarkdown).toContain('buildCasinosPage');
    expect(convertMarkdown).not.toContain('>Touch Grass<');
    expect(convertMarkdown).toContain('>Casinos</a>');
    expect(convertMarkdown).toContain('site-footer__more');
    expect(convertMarkdown).not.toMatch(/Bonuses/i);
    expect(convertMarkdown).not.toContain('pit-hero');
    expect(convertMarkdown).not.toMatch(/Zip soon™/);
    expect(convertMarkdown).not.toMatch(/lounge/i);
  });

  it('emits a live zip download when sideload is ungated', () => {
    expect(convertMarkdown).toContain(
      'href="downloads/tiltcheck-extension.zip" download>DOWNLOAD THE ZIP',
    );
    const extensionHtmlPath = path.join(process.cwd(), 'out/extension.html');
    if (existsSync(extensionHtmlPath)) {
      const extensionHtml = readFileSync(extensionHtmlPath, 'utf8');
      expect(extensionHtml).toContain(
        'href="downloads/tiltcheck-extension.zip" download>DOWNLOAD THE ZIP',
      );
    }
  });

  it('renders audited evidence and RTP profiles for Stake, Roobet, BC.Game, Shuffle, and audited operators', () => {
    expect(convertMarkdown).toContain('buildAuditedShowcase');
    expect(convertMarkdown).toContain('Stake, Roobet & BC.Game: The Receipts.');
    expect(convertMarkdown).toContain('data-audited');

    const casinosData = JSON.parse(
      readFileSync(path.join(process.cwd(), 'apps/web/src/data/casinos.json'), 'utf8'),
    );
    const audited = casinosData.filter((c: any) => c.audited);
    expect(audited.map((c: any) => c.name)).toEqual([
      'Chumba Casino',
      'Global Poker',
      'LuckyLand Slots',
      'Pulsz',
      'WOW Vegas',
      'High 5 Casino',
      'Stake.us',
      'McLuck',
      'Fortune Coins',
      'Hello Millions',
      'Modo Casino',
      'Funrize',
      'Zula Casino',
      'Crown Coins Casino',
      'Real Prize',
      'Jackpota',
      'NoLimitCoins',
      'Funzpoints',
      'Roobet',
      'Stake.com',
      'Rollbit',
      'Gamdom',
      'BC.Game',
      'Shuffle',
      'Duelbits',
      'DraftKings Casino',
      'FanDuel Casino',
      'BetMGM',
      'Caesars Casino',
      'BetRivers',
    ]);

    for (const c of audited) {
      expect(c.license).toBeTruthy();
      expect(c.rtpSummary).toMatch(/RTP/i);
      expect(c.rtpOriginals).toMatch(/99\.00%|97\.00%|99\.50%|95\.50%/);
      expect(c.rtpSlots).toBeTruthy();
      expect(c.evidence.length).toBeGreaterThanOrEqual(4);
      expect(c.vaultSupport).toBeTruthy();
    }
  });
});
