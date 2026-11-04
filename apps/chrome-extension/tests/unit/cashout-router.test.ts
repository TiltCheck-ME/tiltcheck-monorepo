/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-04 */
/**
 * @vitest-environment jsdom
 * cashout-router.test.ts
 * Tests for One-Click Cashout Link Router and Smart Cashout Goals Progress Evaluator.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  calculateGoalsProgress,
  CASINO_CASHOUT_ROUTES,
  detectCashoutTarget,
  findRouteForHostname,
  triggerCashoutNavigation,
} from '../../src/cashout-router.js';
import { type CashoutGoal } from '../../src/profit-lock.js';

describe('cashout-router operator registry & route resolution', () => {
  it('contains expected crypto and sweeps operators', () => {
    expect(CASINO_CASHOUT_ROUTES.length).toBeGreaterThanOrEqual(15);

    const ids = CASINO_CASHOUT_ROUTES.map((r) => r.id);
    expect(ids).toContain('stake');
    expect(ids).toContain('stake_us');
    expect(ids).toContain('roobet');
    expect(ids).toContain('bcgame');
    expect(ids).toContain('shuffle');
    expect(ids).toContain('chumba');
    expect(ids).toContain('luckyland');
    expect(ids).toContain('pulsz');
  });

  it('resolves routes accurately for given hostnames', () => {
    expect(findRouteForHostname('stake.com')?.id).toBe('stake');
    expect(findRouteForHostname('play.stake.com')?.id).toBe('stake');
    expect(findRouteForHostname('stake.us')?.id).toBe('stake_us');
    expect(findRouteForHostname('roobet.com')?.id).toBe('roobet');
    expect(findRouteForHostname('bc.game')?.id).toBe('bcgame');
    expect(findRouteForHostname('lobby.chumbacasino.com')?.id).toBe('chumba');
    expect(findRouteForHostname('play.luckylandslots.com')?.id).toBe('luckyland');
    expect(findRouteForHostname('unknown-casino.xyz')).toBeNull();
  });
});

describe('detectCashoutTarget and DOM triggers', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('detects route and clicks DOM target if selector matches', () => {
    const walletBtn = document.createElement('button');
    walletBtn.setAttribute('data-test', 'wallet-button');
    document.body.appendChild(walletBtn);

    const result = detectCashoutTarget(document, 'stake.com');
    expect(result.route?.id).toBe('stake');
    expect(result.clickTarget).toBe(walletBtn);
    expect(result.cashierUrl).toBe('https://stake.com/?tab=wallet&modal=withdraw');
    expect(result.buttonLabel).toBe('Cashier / Withdraw');
  });

  it('falls back to generic cashier selectors on unlisted casinos', () => {
    const withdrawLink = document.createElement('a');
    withdrawLink.setAttribute('href', '/account/withdraw');
    document.body.appendChild(withdrawLink);

    const result = detectCashoutTarget(document, 'random-crypto-casino.io');
    expect(result.route).toBeNull();
    expect(result.clickTarget).toBe(withdrawLink);
    expect(result.casinoName).toBe('random-crypto-casino.io');
  });

  it('triggers cashout navigation via click when target exists', () => {
    const cashierBtn = document.createElement('button');
    cashierBtn.setAttribute('data-test', 'cashier-btn');
    let clicked = false;
    cashierBtn.addEventListener('click', () => {
      clicked = true;
    });
    document.body.appendChild(cashierBtn);

    const navResult = triggerCashoutNavigation(document, 'roobet.com');
    expect(navResult.navigated).toBe(true);
    expect(navResult.method).toBe('click');
    expect(clicked).toBe(true);
  });

  it('triggers cashout navigation via href fallback when no DOM element is found', () => {
    const fakeDoc = {
      location: { href: 'https://bc.game' },
      querySelector: () => null,
    } as unknown as Document;

    const navResult = triggerCashoutNavigation(fakeDoc, 'bc.game');
    expect(navResult.navigated).toBe(true);
    expect(navResult.method).toBe('href');
    expect(navResult.target).toBe('https://bc.game/wallet/withdraw');
    expect(fakeDoc.location.href).toBe('https://bc.game/wallet/withdraw');
  });
});

describe('calculateGoalsProgress', () => {
  const sampleGoals: CashoutGoal[] = [
    {
      id: 'spotify',
      name: 'Spotify Premium',
      targetAmount: 11,
      metric: 'balance',
      enabled: true,
      linkUrl: 'https://spotify.com',
    },
    {
      id: 'gas',
      name: 'Tank of Gas',
      targetAmount: 50,
      metric: 'balance',
      enabled: true,
    },
    {
      id: 'power_bill',
      name: 'Power Bill',
      targetAmount: 250,
      metric: 'balance',
      enabled: true,
    },
    {
      id: 'rent',
      name: 'Rent Portion',
      targetAmount: 500,
      metric: 'profit',
      enabled: true,
    },
    {
      id: 'disabled_goal',
      name: 'Vacation',
      targetAmount: 2000,
      metric: 'balance',
      enabled: false,
    },
  ];

  it('calculates goal progress percentages and achievement states accurately', () => {
    // Current balance: $125, Net PnL: +$25
    const progress = calculateGoalsProgress(sampleGoals, 125, 25);

    // Disabled goal should be filtered out
    expect(progress.length).toBe(4);

    // Spotify: $11 target, balance $125 -> >100% achieved
    const spotify = progress.find((p) => p.id === 'spotify')!;
    expect(spotify.isAchieved).toBe(true);
    expect(spotify.currentAmount).toBe(125);
    expect(spotify.percent).toBeGreaterThanOrEqual(100);
    expect(spotify.linkUrl).toBe('https://spotify.com');

    // Gas: $50 target, balance $125 -> 100% achieved
    const gas = progress.find((p) => p.id === 'gas')!;
    expect(gas.isAchieved).toBe(true);

    // Power Bill: $250 target, balance $125 -> exactly 50%
    const power = progress.find((p) => p.id === 'power_bill')!;
    expect(power.isAchieved).toBe(false);
    expect(power.percent).toBe(50);
    expect(power.currentAmount).toBe(125);

    // Rent Portion: $500 target, metric 'profit', profit $25 -> (25 / 500) * 100 = 5%
    const rent = progress.find((p) => p.id === 'rent')!;
    expect(rent.metric).toBe('profit');
    expect(rent.isAchieved).toBe(false);
    expect(rent.percent).toBe(5);
    expect(rent.currentAmount).toBe(25);
  });

  it('handles zero or negative balance and profit gracefully', () => {
    const progress = calculateGoalsProgress(sampleGoals, 0, -40);
    for (const item of progress) {
      expect(item.currentAmount).toBe(0);
      expect(item.percent).toBe(0);
      expect(item.isAchieved).toBe(false);
    }
  });

  it('handles null balance gracefully', () => {
    const progress = calculateGoalsProgress(sampleGoals, null, 0);
    for (const item of progress) {
      expect(item.currentAmount).toBe(0);
      expect(item.percent).toBe(0);
      expect(item.isAchieved).toBe(false);
    }
  });
});
