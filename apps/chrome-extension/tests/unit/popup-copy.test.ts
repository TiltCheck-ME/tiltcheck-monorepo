/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-13 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = dirname(fileURLToPath(import.meta.url));
const popupHtml = readFileSync(join(root, '../../src/popup.html'), 'utf8');
const popupTs = readFileSync(join(root, '../../src/popup.ts'), 'utf8');

describe('popup guest-first copy', () => {
  it('opens on Settings, not a Discord wall', () => {
    expect(popupHtml).toContain('data-tab="block">Settings');
    expect(popupHtml).toMatch(/class="tab active"[^>]*data-tab="block"/);
    expect(popupHtml).toContain('id="panel-block" class="panel active"');
    expect(popupHtml).not.toContain('id="panel-status" class="panel active"');
  });

  it('does not tell guests the sidebar is the primary interface', () => {
    expect(popupHtml).not.toContain('sidebar is the primary interface');
    expect(popupHtml).toContain('Core runs guest');
    expect(popupHtml).toContain('tiltcheck.me/cooldown');
  });

  it('lands guests on Settings after init', () => {
    expect(popupTs).toContain("activateTab(userId ? 'status' : 'block')");
    expect(popupTs).not.toContain('Open the sidebar on your casino tab to finish Discord sign-in.');
  });

  it('does not include the placebo Core sensitivity slider (EXT-5)', () => {
    expect(popupHtml).not.toContain('id="slider-controls"');
    expect(popupHtml).not.toContain('id="risk-threshold-slider"');
    expect(popupHtml).not.toContain('<span>Sensitivity</span>');
  });

  it('signposts GAMSTOP and NCPG next to browser filters (RG-1)', () => {
    expect(popupHtml).toContain('class="rg-signpost"');
    expect(popupHtml).toContain('ncpgambling.org');
    expect(popupHtml).toContain('1-800-GAMBLER');
    expect(popupHtml).toContain('gamstop.co.uk');
  });

  it('renders Session Velocity Radar card and wires popup updates', () => {
    expect(popupHtml).toContain('id="session-radar-card"');
    expect(popupHtml).toContain('id="radar-sparkline-wrap"');
    expect(popupHtml).toContain('id="radar-badge"');
    expect(popupHtml).toContain('id="radar-velocity-val"');
    expect(popupHtml).toContain('id="btn-reset-radar"');

    expect(popupTs).toContain('generateSparklineSvg');
    expect(popupTs).toContain('determineVelocityStatus');
    expect(popupTs).toContain('loadSessionRadar');
    expect(popupTs).toContain('updateSessionRadarUI');
  });

  it('renders Smart Cashout Goals Progress Card and One-Click Cashout button', () => {
    expect(popupHtml).toContain('id="cashout-goals-progress-card"');
    expect(popupHtml).toContain('id="cashout-goals-progress-list"');
    expect(popupHtml).toContain('id="btn-quick-cashout"');
    expect(popupHtml).toContain('id="quick-cashout-label"');
    expect(popupHtml).toContain('id="btn-config-goals"');

    expect(popupTs).toContain('calculateGoalsProgress');
    expect(popupTs).toContain('loadCashoutGoalsProgress');
    expect(popupTs).toContain('initCashoutRouterListeners');
    expect(popupTs).toContain('triggerActiveTabCashout');
    expect(popupTs).toContain('triggerActiveTabAutoVault');
  });

  it('renders Session Win-Streak & Volatility Spotter card and wires telemetry', () => {
    expect(popupHtml).toContain('id="streak-volatility-card"');
    expect(popupHtml).toContain('id="streak-badge"');
    expect(popupHtml).toContain('id="streak-current-val"');
    expect(popupHtml).toContain('id="streak-hit-rate"');
    expect(popupHtml).toContain('id="streak-max-dead"');
    expect(popupHtml).toContain('id="btn-reset-streak"');

    expect(popupTs).toContain('TILTCHECK_STREAK_VOLATILITY_KEY');
    expect(popupTs).toContain('updateStreakVolatilityUI');
    expect(popupTs).toContain('loadStreakVolatility');
    expect(popupTs).toContain('initStreakVolatilityListeners');
  });

  it('renders Tip Jar button, modal, and non-custodial Solana wallet address', () => {
    expect(popupHtml).toContain('id="btn-tip-jar"');
    expect(popupHtml).toContain('id="btn-footer-tip"');
    expect(popupHtml).toContain('id="tip-jar-overlay"');
    expect(popupHtml).toContain('id="tip-solana-address"');
    expect(popupHtml).toContain('DgeYJvpRQGmYgyXQNqm2nGxwoxABa43dvQY5HJU57ET1');
    expect(popupHtml).toContain('id="btn-copy-tip-address"');
    expect(popupHtml).toContain('id="btn-tip-solscan"');
    expect(popupHtml).toContain('id="btn-tip-web"');

    expect(popupTs).toContain('SOLANA_TIP_ADDRESS');
    expect(popupTs).toContain('DgeYJvpRQGmYgyXQNqm2nGxwoxABa43dvQY5HJU57ET1');
    expect(popupTs).toContain('initTipJarModal');
  });

  it('renders persistent Discord login indicator bar and action controls', () => {
    expect(popupHtml).toContain('id="discord-account-bar"');
    expect(popupHtml).toContain('id="discord-account-info"');
    expect(popupHtml).toContain('id="discord-guest-info"');
    expect(popupHtml).toContain('id="discord-username-display"');
    expect(popupHtml).toContain('id="btn-quick-discord-login"');
    expect(popupHtml).toContain('id="btn-quick-logout"');

    expect(popupTs).toContain('discord-account-info');
    expect(popupTs).toContain('discord-guest-info');
    expect(popupTs).toContain('discord-username-display');
  });

  it('renders standalone window controls and resizing options', () => {
    expect(popupHtml).toContain('id="standalone-window-bar"');
    expect(popupHtml).toContain('id="btn-win-compact"');
    expect(popupHtml).toContain('id="btn-win-standard"');
    expect(popupHtml).toContain('id="btn-win-expanded"');

    expect(popupHtml).toContain('id="btn-easy-detach"');
    expect(popupHtml).toContain('id="btn-size-compact"');
    expect(popupHtml).toContain('id="btn-size-standard"');
    expect(popupHtml).toContain('id="btn-size-expanded"');

    expect(popupTs).toContain('applyUiSizePreset');
    expect(popupTs).toContain('detachToStandaloneWindow');
  });

  it('uses plain wording: no guard, shield or protect framing in what users read', () => {
    const visibleHtml = popupHtml
      .replace(/<style[\s\S]*?<\/style>/g, '')
      .replace(/<script[\s\S]*?<\/script>/g, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      // drop tag internals except user-facing attributes
      .replace(/<[^>]*>/g, (tag) => (tag.match(/\b(title|alt|aria-label|placeholder)="[^"]*"/g) || []).join(' '));
    const banned = /\b(guards?|guardrails?|shield(ed)?|protect(ion|ed|s)?|armed|armory)\b/i;
    expect(visibleHtml).not.toMatch(banned);

    // Sentence-like string literals in popup.ts (toasts, labels), tags stripped.
    const literals = popupTs.match(/'[^'\n]* [^'\n]*'|`[^`\n]* [^`\n]*`/g) || [];
    for (const literal of literals) {
      const text = literal.replace(/<[^>]*>/g, ' ').replace(/\$\{[^}]*\}/g, ' ');
      expect(text, literal).not.toMatch(banned);
    }
  });
});
