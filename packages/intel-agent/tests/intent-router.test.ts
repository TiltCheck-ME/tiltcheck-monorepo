/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-18 */

import { describe, expect, it } from 'vitest';
import { routeIntelIntent } from '../src/intent-router.js';

describe('routeIntelIntent', () => {
  it('routes scam lookup', () => {
    const intent = routeIntelIntent('is roobet a scam?');
    expect(intent).toEqual({ kind: 'lookup', name: 'roobet', checkScam: true });
  });

  it('routes US crypto list', () => {
    const intent = routeIntelIntent('list of us crypto casinos');
    expect(intent.kind).toBe('list');
    if (intent.kind === 'list') {
      expect(intent.filters.category).toBe('Crypto');
      expect(intent.filters.geo).toBe('us-crypto');
    }
  });

  it('routes personal bonus to login tier', () => {
    const intent = routeIntelIntent('what is my bonus status');
    expect(intent).toEqual({ kind: 'personal', topic: 'bonus' });
  });

  it('routes domain check', () => {
    const intent = routeIntelIntent('check domain stake.com');
    expect(intent).toEqual({ kind: 'domain', domain: 'stake.com' });
  });

  it('routes VIP currency leveling questions', () => {
    expect(routeIntelIntent('Can you level with gold coins on metawin.us?')).toEqual({
      kind: 'operator_vip_fact',
      name: expect.stringMatching(/metawin/i),
      currencyHint: expect.stringMatching(/gold/i),
    });
  });

  it('routes redemption timing questions', () => {
    const intent = routeIntelIntent('How long does crown coins take for redemption?');
    expect(intent.kind).toBe('operator_redemption_fact');
    if (intent.kind === 'operator_redemption_fact') {
      expect(intent.name.toLowerCase()).toContain('crown');
    }
  });

  it('routes redemption timing questions when the operator name appears before redemption', () => {
    const intent = routeIntelIntent('How long does MetaWin redemption take?');
    expect(intent.kind).toBe('operator_redemption_fact');
    if (intent.kind === 'operator_redemption_fact') {
      expect(intent.name.toLowerCase()).toContain('metawin');
    }
  });

  it('does not route generic how-long questions without redemption keywords', () => {
    const intent = routeIntelIntent('How long does support take on Stake?');
    expect(intent.kind).not.toBe('operator_redemption_fact');
  });

  it('routes welcome bonus with florida geo', () => {
    const intent = routeIntelIntent('What new player bonuses are available on McLuck in Florida?');
    expect(intent.kind).toBe('operator_welcome_bonus_fact');
    if (intent.kind === 'operator_welcome_bonus_fact') {
      expect(intent.geoTag).toBe('US-FL');
    }
  });

  it('does not steal personal bonus intent for my bonus', () => {
    expect(routeIntelIntent('what is my bonus status')).toEqual({ kind: 'personal', topic: 'bonus' });
  });

  it('routes vague VIP deal questions to fact lookup', () => {
    expect(routeIntelIntent('what is the VIP deal on Stake').kind).toBe('operator_fact_lookup');
  });

  it('routes cash-out timing questions with "take to cash out" to the operator', () => {
    expect(routeIntelIntent('how long does BetRivers take to cash out')).toEqual({
      kind: 'operator_redemption_fact',
      name: 'BetRivers',
    });
  });

  it('routes "how long does it take to withdraw from X" to X, not "it"', () => {
    expect(routeIntelIntent('how long does it take to withdraw from FanDuel?')).toEqual({
      kind: 'operator_redemption_fact',
      name: 'FanDuel',
    });
  });

  it('routes withdrawals at a named casino to the redemption fact', () => {
    expect(routeIntelIntent('how long do withdrawals take at Caesars Palace?')).toEqual({
      kind: 'operator_redemption_fact',
      name: 'Caesars Palace',
    });
  });

  it.each([
    'fastest payout casinos',
    'fastest payout casino',
    'which casinos pay out instantly',
    'fastest cash out',
    'What are the quickest withdrawal casinos?',
    'best same day payout sites',
  ])('routes "%s" to the payout speed ranking', (message) => {
    expect(routeIntelIntent(message)).toEqual({ kind: 'payout_speed_ranking' });
  });

  it('keeps a named operator on the redemption fact even with a speed word', () => {
    expect(routeIntelIntent("what's the fastest way to cash out on BetRivers?")).toEqual({
      kind: 'operator_redemption_fact',
      name: 'BetRivers',
    });
  });

  it('does not send sweeps questions to the real-money payout ranking', () => {
    expect(routeIntelIntent('fastest redemption sweeps casinos').kind).not.toBe('payout_speed_ranking');
    expect(routeIntelIntent('fastest payout sweepstakes casinos').kind).not.toBe('payout_speed_ranking');
  });

  it('does not route speed words without a payout term', () => {
    expect(routeIntelIntent('fastest loading casinos').kind).not.toBe('payout_speed_ranking');
  });

  it('routes long hostile payout input in linear time', () => {
    const message = `fastest ${'cash out '.repeat(5_000)}casinos`;
    const started = Date.now();
    expect(routeIntelIntent(message).kind).toBe('payout_speed_ranking');
    expect(Date.now() - started).toBeLessThan(500);
  });
});
