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
  triggerAutoVault,
  triggerCashoutNavigation,
  buildCooldownVaultUrl,
  triggerCooldownVaultNavigation,
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

describe('triggerAutoVault', () => {
  it('returns failure when no vault adapter is available for operator', async () => {
    const result = await triggerAutoVault(50, 'usd', document, 'unknown-casino.xyz');
    expect(result.vaulted).toBe(false);
    expect(result.method).toBe('none');
    expect(result.error).toContain('No vault adapter');
  });

  it('invokes vaultAmount on Stake adapter when host matches Stake', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          createVaultDeposit: { id: 'deposit_123', amount: 25 },
        },
      }),
    });
    globalThis.fetch = mockFetch;

    const result = await triggerAutoVault(25, 'usd', document, 'stake.com');
    expect(result.vaulted).toBe(true);
    expect(result.method).toBe('api');
    expect(result.amount).toBe(25);
    expect(result.casinoName).toBe('stake');
  });
});

describe('Cooldown Vault routing & deep linking', () => {
  it('builds cooldown vault url with proper query parameters', () => {
    const defaultUrl = buildCooldownVaultUrl();
    expect(defaultUrl).toBe('https://tiltcheck.me/cooldown?source=extension');

    const customUrl = buildCooldownVaultUrl({
      casino: 'Stake.us',
      amount: 150.5,
      currency: 'usd',
      scope: 'category',
      durationSecs: 604800,
    });
    const parsed = new URL(customUrl);
    expect(parsed.origin).toBe('https://tiltcheck.me');
    expect(parsed.pathname).toBe('/cooldown');
    expect(parsed.searchParams.get('source')).toBe('extension');
    expect(parsed.searchParams.get('casino')).toBe('Stake.us');
    expect(parsed.searchParams.get('amount')).toBe('150.50');
    expect(parsed.searchParams.get('currency')).toBe('usd');
    expect(parsed.searchParams.get('scope')).toBe('category');
    expect(parsed.searchParams.get('duration')).toBe('604800');
  });

  it('triggers navigation to cooldown vault url', () => {
    const fakeDoc = {
      location: { href: 'https://stake.us' },
    } as unknown as Document;

    const navResult = triggerCooldownVaultNavigation(fakeDoc, { casino: 'Stake.us', amount: 200 });
    expect(navResult.navigated).toBe(true);
    expect(navResult.method).toBe('href');
    expect(navResult.target).toContain('https://tiltcheck.me/cooldown');
    expect(navResult.target).toContain('casino=Stake.us');
    expect(navResult.target).toContain('amount=200.00');
    expect(fakeDoc.location.href).toBe(navResult.target);
  });

  it('detectCashoutTarget provides cooldownVaultUrl with detected casino', () => {
    const result = detectCashoutTarget(document, 'roobet.com');
    expect(result.cooldownVaultUrl).toContain('https://tiltcheck.me/cooldown');
    expect(result.cooldownVaultUrl).toContain('casino=Roobet');
  });
});
