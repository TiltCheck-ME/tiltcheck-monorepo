/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-08 */

/**
 * cashout-router.ts
 * One-Click Cashout Link Router & Deep-Link Registry.
 *
 * Provides direct cashier and redemption deep links and DOM triggers across
 * major supported crypto casinos and US sweepstakes operators.
 * Allows one-click escape from tilt sessions directly into the operator's withdrawal flow.
 *
 * Non-custodial: executes client-side DOM navigation with zero custody of player funds.
 */

import { type CashoutGoal } from './profit-lock.js';
import { getAdapterForHost } from './casino-vault-adapters.js';

export interface CasinoCashoutRoute {
  id: string;
  name: string;
  domainMatches: string[];
  cashierUrl: string;
  buttonLabel: string;
  isSweepstakes: boolean;
  domSelectors: string[];
}

export const CASINO_CASHOUT_ROUTES: readonly CasinoCashoutRoute[] = [
  {
    id: 'stake',
    name: 'Stake.com',
    domainMatches: ['stake.com'],
    cashierUrl: 'https://stake.com/?modal=wallet&tab=withdraw',
    buttonLabel: 'Cashier / Withdraw',
    isSweepstakes: false,
    domSelectors: [
      'button[data-test*="withdraw"]',
      'button[data-testid*="withdraw"]',
      'a[href*="tab=withdraw"]',
      'button[data-test="wallet-button"]',
      'button[data-test="cashier-button"]',
      'a[href*="/wallet"]',
    ],
  },
  {
    id: 'stake_us',
    name: 'Stake.us',
    domainMatches: ['stake.us'],
    cashierUrl: 'https://stake.us/?modal=wallet&tab=redeem',
    buttonLabel: 'Redeem Sweeps Cash',
    isSweepstakes: true,
    domSelectors: [
      'button[data-test*="redeem"]',
      'button[data-testid*="redeem"]',
      'a[href*="tab=redeem"]',
      'button[data-test*="withdraw"]',
      'button[data-test="wallet-button"]',
      'a[href*="redeem"]',
      'button[data-test="cashier-button"]',
    ],
  },
  {
    id: 'roobet',
    name: 'Roobet',
    domainMatches: ['roobet.com'],
    cashierUrl: 'https://roobet.com/?modal=cashier&tab=withdraw',
    buttonLabel: 'Cashier / Withdraw',
    isSweepstakes: false,
    domSelectors: [
      '[data-test="cashier-btn"]',
      'button[data-test="cashier"]',
      'a[href*="cashier"]',
      'button[data-test="wallet"]',
    ],
  },
  {
    id: 'bcgame',
    name: 'BC.Game',
    domainMatches: ['bc.game'],
    cashierUrl: 'https://bc.game/wallet/withdraw',
    buttonLabel: 'Cashier / Withdraw',
    isSweepstakes: false,
    domSelectors: [
      'button[data-test="wallet"]',
      'a[href*="/wallet/withdraw"]',
      'a[href*="/wallet"]',
    ],
  },
  {
    id: 'rollbit',
    name: 'Rollbit',
    domainMatches: ['rollbit.com'],
    cashierUrl: 'https://rollbit.com/deposit',
    buttonLabel: 'Wallet / Cashier',
    isSweepstakes: false,
    domSelectors: [
      'button[data-test="deposit-button"]',
      'a[href*="/deposit"]',
      'a[href*="wallet"]',
    ],
  },
  {
    id: 'shuffle',
    name: 'Shuffle',
    domainMatches: ['shuffle.com'],
    cashierUrl: 'https://shuffle.com/wallet',
    buttonLabel: 'Wallet / Cashier',
    isSweepstakes: false,
    domSelectors: [
      'button[data-testid="wallet-button"]',
      'a[href*="/wallet"]',
    ],
  },
  {
    id: 'gamdom',
    name: 'Gamdom',
    domainMatches: ['gamdom.com'],
    cashierUrl: 'https://gamdom.com/cashier',
    buttonLabel: 'Cashier / Withdraw',
    isSweepstakes: false,
    domSelectors: [
      'button[data-test="cashier"]',
      'a[href*="/cashier"]',
      'a[href*="wallet"]',
    ],
  },
  {
    id: 'csgoempire',
    name: 'CSGOEmpire',
    domainMatches: ['csgoempire.com'],
    cashierUrl: 'https://csgoempire.com/withdraw',
    buttonLabel: 'Withdrawal Portal',
    isSweepstakes: false,
    domSelectors: [
      'a[href*="/withdraw"]',
      'button[data-test="withdraw"]',
    ],
  },
  // Sweepstakes Operators
  {
    id: 'chumba',
    name: 'Chumba Casino',
    domainMatches: ['chumbacasino.com'],
    cashierUrl: 'https://lobby.chumbacasino.com/redemption',
    buttonLabel: 'Redeem Sweeps Coins',
    isSweepstakes: true,
    domSelectors: [
      'button[data-testid="redeem"]',
      'a[href*="redemption"]',
      'button[aria-label*="Redeem"]',
    ],
  },
  {
    id: 'luckyland',
    name: 'LuckyLand Slots',
    domainMatches: ['luckylandslots.com'],
    cashierUrl: 'https://play.luckylandslots.com/redeem',
    buttonLabel: 'Redeem Prize',
    isSweepstakes: true,
    domSelectors: [
      'button[data-testid="redeem"]',
      'a[href*="redeem"]',
      'button[aria-label*="Redeem"]',
    ],
  },
  {
    id: 'globalpoker',
    name: 'Global Poker',
    domainMatches: ['globalpoker.com'],
    cashierUrl: 'https://play.globalpoker.com/redemption',
    buttonLabel: 'Redeem Sweeps Coins',
    isSweepstakes: true,
    domSelectors: [
      'a[href*="redemption"]',
      'button[data-testid="redeem"]',
    ],
  },
  {
    id: 'pulsz',
    name: 'Pulsz',
    domainMatches: ['pulsz.com'],
    cashierUrl: 'https://www.pulsz.com/redemption',
    buttonLabel: 'Redeem Cash Prize',
    isSweepstakes: true,
    domSelectors: [
      'button[data-testid="redeem"]',
      'a[href*="redemption"]',
    ],
  },
  {
    id: 'wowvegas',
    name: 'WOW Vegas',
    domainMatches: ['wowvegas.com'],
    cashierUrl: 'https://www.wowvegas.com/profile/redemption',
    buttonLabel: 'Redeem Prize',
    isSweepstakes: true,
    domSelectors: [
      'a[href*="redemption"]',
      'button[data-testid="redeem"]',
    ],
  },
  {
    id: 'high5casino',
    name: 'High 5 Casino',
    domainMatches: ['high5casino.com'],
    cashierUrl: 'https://club5.high5casino.com/redemption',
    buttonLabel: 'Redemption Center',
    isSweepstakes: true,
    domSelectors: [
      'a[href*="redemption"]',
      'button[data-testid="redeem"]',
    ],
  },
  {
    id: 'mcluck',
    name: 'McLuck',
    domainMatches: ['mcluck.com'],
    cashierUrl: 'https://www.mcluck.com/redemption',
    buttonLabel: 'Redeem Prize',
    isSweepstakes: true,
    domSelectors: [
      'a[href*="redemption"]',
      'button[data-testid="redeem"]',
    ],
  },
  {
    id: 'zulacasino',
    name: 'Zula Casino',
    domainMatches: ['zulacasino.com', 'zula.casino'],
    cashierUrl: 'https://www.zulacasino.com/redemption',
    buttonLabel: 'Redeem Sweeps Coins',
    isSweepstakes: true,
    domSelectors: [
      'a[href*="redemption"]',
      'button[data-testid="redeem"]',
    ],
  },
  {
    id: 'funzpoints',
    name: 'Funzpoints',
    domainMatches: ['funzpoints.com'],
    cashierUrl: 'https://funzpoints.com/cashout',
    buttonLabel: 'Cash Out Points',
    isSweepstakes: true,
    domSelectors: [
      'a[href*="cashout"]',
      'button[data-testid="cashout"]',
    ],
  },
  {
    id: 'funrize',
    name: 'Funrize',
    domainMatches: ['funrize.com'],
    cashierUrl: 'https://funrize.com/redemption',
    buttonLabel: 'Redeem Winnings',
    isSweepstakes: true,
    domSelectors: [
      'a[href*="redemption"]',
      'button[data-testid="redeem"]',
    ],
  },
  {
    id: 'crowncoins',
    name: 'Crown Coins',
    domainMatches: ['crowncoinscasino.com'],
    cashierUrl: 'https://crowncoinscasino.com/redemption',
    buttonLabel: 'Redeem Sweeps Coins',
    isSweepstakes: true,
    domSelectors: [
      'a[href*="redemption"]',
      'button[data-testid="redeem"]',
      'button[aria-label*="Redeem"]',
    ],
  },
  {
    id: 'lonestar',
    name: 'LoneStar Casino',
    domainMatches: ['lonestarcasino.com'],
    cashierUrl: 'https://lonestarcasino.com/redemption',
    buttonLabel: 'Redeem Sweeps Coins',
    isSweepstakes: true,
    domSelectors: [
      'a[href*="redemption"]',
      'button[data-testid="redeem"]',
      'button[aria-label*="Redeem"]',
    ],
  },
  {
    id: 'realprize',
    name: 'Real Prize',
    domainMatches: ['realprize.com'],
    cashierUrl: 'https://realprize.com/redemption',
    buttonLabel: 'Redeem Prize',
    isSweepstakes: true,
    domSelectors: [
      'a[href*="redemption"]',
      'button[data-testid="redeem"]',
    ],
  },
  {
    id: 'jackpota',
    name: 'Jackpota',
    domainMatches: ['jackpota.com'],
    cashierUrl: 'https://jackpota.com/redemption',
    buttonLabel: 'Redeem Prize',
    isSweepstakes: true,
    domSelectors: [
      'a[href*="redemption"]',
      'button[data-testid="redeem"]',
    ],
  },
  {
    id: 'nolimitcoins',
    name: 'NoLimitCoins',
    domainMatches: ['nolimitcoins.com'],
    cashierUrl: 'https://nolimitcoins.com/redemption',
    buttonLabel: 'Redeem Super Coins',
    isSweepstakes: true,
    domSelectors: [
      'a[href*="redemption"]',
      'button[data-testid="redeem"]',
    ],
  },
];

export const GENERIC_CASHIER_SELECTORS = [
  'a[href*="withdraw"]',
  'a[href*="redemption"]',
  'a[href*="redeem"]',
  'a[href*="cashier"]',
  'a[href*="wallet"]',
  'button[data-test*="cashier"]',
  'button[data-test*="wallet"]',
  'button[data-test*="withdraw"]',
  'button[data-testid*="redeem"]',
  'button[data-testid*="cashier"]',
];

export function findRouteForHostname(hostname: string): CasinoCashoutRoute | null {
  if (!hostname) return null;
  const host = hostname.toLowerCase();
  for (const route of CASINO_CASHOUT_ROUTES) {
    if (route.domainMatches.some((d) => host.includes(d))) {
      return route;
    }
  }
  return null;
}

export interface CashoutTargetResult {
  route: CasinoCashoutRoute | null;
  clickTarget: HTMLElement | null;
  cashierUrl: string | null;
  buttonLabel: string;
  isSweepstakes: boolean;
  casinoName: string | null;
  cooldownVaultUrl: string;
}

export const TILTCHECK_COOLDOWN_VAULT_URL = 'https://tiltcheck.me/cooldown';

export interface CooldownVaultOptions {
  casino?: string;
  amount?: number;
  currency?: string;
  scope?: 'all' | 'category' | 'game';
  durationSecs?: number;
  origin?: string;
}

export function buildCooldownVaultUrl(options?: CooldownVaultOptions): string {
  const base = options?.origin || TILTCHECK_COOLDOWN_VAULT_URL;
  try {
    const url = new URL(base);
    url.searchParams.set('source', 'extension');
    if (options?.casino) url.searchParams.set('casino', options.casino);
    if (typeof options?.amount === 'number' && Number.isFinite(options.amount)) {
      url.searchParams.set('amount', options.amount.toFixed(2));
    }
    if (options?.currency) url.searchParams.set('currency', options.currency);
    if (options?.scope) url.searchParams.set('scope', options.scope);
    if (typeof options?.durationSecs === 'number' && Number.isFinite(options.durationSecs)) {
      url.searchParams.set('duration', String(options.durationSecs));
    }
    return url.toString();
  } catch {
    return base;
  }
}

export function triggerCooldownVaultNavigation(
  doc: Document = document,
  options?: CooldownVaultOptions,
): NavigationResult {
  const targetUrl = buildCooldownVaultUrl(options);
  if (doc.location) {
    doc.location.href = targetUrl;
  }
  return {
    navigated: true,
    method: 'href',
    target: targetUrl,
  };
}

export function detectCashoutTarget(
  doc: Document,
  hostnameOverride?: string,
): CashoutTargetResult {
  const hostname =
    hostnameOverride ??
    doc.location?.hostname ??
    (typeof window !== 'undefined' ? window.location?.hostname : '') ??
    '';
  const route = findRouteForHostname(hostname);
  let clickTarget: HTMLElement | null = null;

  if (route) {
    for (const selector of route.domSelectors) {
      const el = doc.querySelector(selector) as HTMLElement | null;
      if (el) {
        clickTarget = el;
        break;
      }
    }
  }

  if (!clickTarget) {
    for (const selector of GENERIC_CASHIER_SELECTORS) {
      const el = doc.querySelector(selector) as HTMLElement | null;
      if (el) {
        clickTarget = el;
        break;
      }
    }
  }

  const cashierUrl = route?.cashierUrl || null;
  const buttonLabel = route?.buttonLabel || 'Cashier / Withdraw';
  const isSweepstakes = route?.isSweepstakes || false;
  const casinoName = route?.name || (hostname ? hostname.replace(/^www\./, '') : null);
  const cooldownVaultUrl = buildCooldownVaultUrl({
    casino: casinoName || undefined,
  });

  return {
    route,
    clickTarget,
    cashierUrl,
    buttonLabel,
    isSweepstakes,
    casinoName,
    cooldownVaultUrl,
  };
}

export interface NavigationResult {
  navigated: boolean;
  method: 'click' | 'href' | 'none';
  target: string;
}

export function triggerCashoutNavigation(
  doc: Document,
  hostnameOverride?: string,
): NavigationResult {
  const { clickTarget, cashierUrl } = detectCashoutTarget(doc, hostnameOverride);

  if (clickTarget) {
    try {
      clickTarget.click();
      return {
        navigated: true,
        method: 'click',
        target: clickTarget.tagName.toLowerCase(),
      };
    } catch {
      // Fall through to href navigation
    }
  }

  if (cashierUrl) {
    if (doc.location) {
      doc.location.href = cashierUrl;
    }
    return {
      navigated: true,
      method: 'href',
      target: cashierUrl,
    };
  }

  const host =
    hostnameOverride ??
    doc.location?.hostname ??
    (typeof window !== 'undefined' ? window.location?.hostname : '') ??
    '';
  if (host) {
    const fallbackUrl = `https://${host}/cashier`;
    if (doc.location) {
      doc.location.href = fallbackUrl;
    }
    return {
      navigated: true,
      method: 'href',
      target: fallbackUrl,
    };
  }

  return { navigated: false, method: 'none', target: '' };
}

// ---------------------------------------------------------------------------
// Smart Cashout Goals Progress Evaluator
// ---------------------------------------------------------------------------

export interface GoalProgressItem {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  percent: number;
  isAchieved: boolean;
  metric: 'balance' | 'profit';
  linkUrl?: string;
}

export function calculateGoalsProgress(
  goals: readonly CashoutGoal[],
  currentBalance: number | null,
  netPnl: number,
): GoalProgressItem[] {
  if (!Array.isArray(goals)) return [];

  const active = goals.filter((g) => g.enabled && g.targetAmount > 0);
  return active.map((goal) => {
    const current = goal.metric === 'profit'
      ? Math.max(0, netPnl)
      : Math.max(0, currentBalance ?? 0);

    const rawPct = (current / goal.targetAmount) * 100;
    const percent = Math.min(999, Math.round(rawPct));
    const isAchieved = rawPct >= 100;

    return {
      id: goal.id,
      name: goal.name,
      targetAmount: goal.targetAmount,
      currentAmount: Math.round(current * 100) / 100,
      percent,
      isAchieved,
      metric: goal.metric,
      linkUrl: goal.linkUrl,
    };
  });
}

// ---------------------------------------------------------------------------
// Non-Custodial Session Auto-Vaulting
// ---------------------------------------------------------------------------

export interface AutoVaultResult {
  vaulted: boolean;
  method: 'api' | 'dom' | 'none';
  amount: number;
  currency: string;
  casinoName: string | null;
  error?: string;
}

export async function triggerAutoVault(
  amount: number,
  currency = 'usd',
  doc: Document = document,
  hostnameOverride?: string,
): Promise<AutoVaultResult> {
  const hostname =
    hostnameOverride ??
    doc.location?.hostname ??
    (typeof window !== 'undefined' ? window.location?.hostname : '') ??
    '';

  const adapter = getAdapterForHost(hostname);
  if (!adapter) {
    return {
      vaulted: false,
      method: 'none',
      amount,
      currency,
      casinoName: null,
      error: 'No vault adapter available for this operator.',
    };
  }

  try {
    const success = await adapter.vaultAmount(amount, currency);
    const method = adapter.name === 'stake' ? 'api' : 'dom';
    return {
      vaulted: success,
      method: success ? method : 'none',
      amount,
      currency,
      casinoName: adapter.name,
      error: success ? undefined : 'Vault transaction failed or button not found.',
    };
  } catch (err) {
    return {
      vaulted: false,
      method: 'none',
      amount,
      currency,
      casinoName: adapter.name,
      error: err instanceof Error ? err.message : 'Unknown error during auto-vault.',
    };
  }
}

