/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-13 */
/**
 * cashout-minimums.ts
 * Per-site minimum cash-out / prize redemption amounts, and the check every
 * cash-out nudge runs before it tells a player to cash out.
 *
 * Rules for the table:
 * - Every number comes from the operator's own published terms, rules or help
 *   page. The source URL and the date it was read sit next to it.
 * - No source, no number. A site with nothing published (or a per-coin crypto
 *   minimum that cannot be compared with the balance on screen) stays `null`
 *   and is treated as unknown.
 * - Sweepstakes minimums are in Sweeps Coins (1 SC = US$1 prize value on every
 *   site listed). The balance the extension reads on those sites is the SC
 *   balance: readBalance() returns null while Gold Coin / play-money mode is on.
 *
 * Behaviour (cash-out copy only; nothing here moves money):
 * - balance >= minimum: `clear`, the cash-out nudge runs as before.
 * - balance <  minimum: `below`, no "cash out" copy and no cashier button. The
 *   copy says how far under the minimum the player is and points at stopping or
 *   a break. It never suggests depositing or playing on to reach the minimum.
 * - minimum unknown:    `unknown`, neutral copy that does not promise a
 *   withdrawal is possible.
 *
 * Non-custodial: pure client-side lookup and copy.
 */

export type CashoutMinimumUnit = 'SC' | 'USD';

export interface CashoutMinimumEntry {
  /** Same id as the matching route in cashout-router.ts. */
  siteId: string;
  siteName: string;
  domainMatches: string[];
  /** Minimum for a cash prize / withdrawal. null = not sourced, treat as unknown. */
  minAmount: number | null;
  unit: CashoutMinimumUnit | null;
  /** Operator's own page the number was read from. null when blank. */
  sourceUrl: string | null;
  /** YYYY-MM-DD the source was read. */
  lastChecked: string;
  note?: string;
}

const CHECKED = '2026-11-13';

export const CASHOUT_MINIMUMS: readonly CashoutMinimumEntry[] = [
  // Sweepstakes operators with a published cash-prize minimum
  {
    siteId: 'chumba',
    siteName: 'Chumba Casino',
    domainMatches: ['chumbacasino.com'],
    minAmount: 100,
    unit: 'SC',
    sourceUrl: 'https://www.vgw.co/wp-content/uploads/2026/05/260318-POL-CHU-Sweeps-Rules-23.0.pdf',
    lastChecked: CHECKED,
    note: 'Sweeps Rules v23.0 cl. 6.5 (VGW, the operator). chumbacasino.com/sweeps-rules blocks automated fetches.',
  },
  {
    siteId: 'luckyland',
    siteName: 'LuckyLand Slots',
    domainMatches: ['luckylandslots.com'],
    minAmount: 50,
    unit: 'SC',
    sourceUrl: 'https://www.vgw.co/wp-content/uploads/2026/05/260318-POL-LLS-Sweeps-Rules-29.0.pdf',
    lastChecked: CHECKED,
    note: 'Sweeps Rules v29.0 cl. 6.5 (VGW, the operator).',
  },
  {
    siteId: 'globalpoker',
    siteName: 'Global Poker',
    domainMatches: ['globalpoker.com'],
    minAmount: 50,
    unit: 'SC',
    sourceUrl: 'https://media.globalpoker.com/vgwholdings89e8-vgw-prod-817c/media/261030-POL-POK-Sweeps-Rules-26-0.pdf',
    lastChecked: CHECKED,
    note: 'Sweeps Rules v26.0 (Oct 30, 2026) cl. 6.5.',
  },
  {
    siteId: 'wowvegas',
    siteName: 'WOW Vegas',
    domainMatches: ['wowvegas.com'],
    minAmount: 50,
    unit: 'SC',
    sourceUrl: 'https://help.wowvegas.com/en/articles/10676686-how-do-i-redeem',
    lastChecked: CHECKED,
    note: 'Cash prize SC 50; gift cards SC 20.',
  },
  {
    siteId: 'high5casino',
    siteName: 'High 5 Casino',
    domainMatches: ['high5casino.com'],
    minAmount: 100,
    unit: 'SC',
    sourceUrl: 'https://high5casino.com/helpcenter/how-to-redeem-real-prizes/',
    lastChecked: CHECKED,
    note: '100 SC for real prizes; 50 SC for Prizeout digital cards.',
  },
  {
    siteId: 'mcluck',
    siteName: 'McLuck',
    domainMatches: ['mcluck.com'],
    minAmount: 75,
    unit: 'SC',
    sourceUrl: 'https://blog.mcluck.com/faq/minimum-redemption-amount',
    lastChecked: CHECKED,
    note: 'Operator FAQ, last reviewed Sep 21, 2026. Cash prize 75 SC; gift card 10 SC.',
  },
  {
    siteId: 'zulacasino',
    siteName: 'Zula Casino',
    domainMatches: ['zulacasino.com', 'zula.casino'],
    minAmount: 50,
    unit: 'SC',
    sourceUrl: 'https://www.zulacasino.com/api/Document/ContentPage/sweeps-rules.pdf',
    lastChecked: CHECKED,
    note: 'Sweepstakes Rules v2.7 (Oct 27, 2026) cl. 5.3.',
  },
  {
    siteId: 'crowncoins',
    siteName: 'Crown Coins',
    domainMatches: ['crowncoinscasino.com'],
    minAmount: 50,
    unit: 'SC',
    sourceUrl: 'https://crowncoinscasino.com/blog/glossary/sweeps-coins',
    lastChecked: CHECKED,
  },
  {
    siteId: 'lonestar',
    siteName: 'LoneStar Casino',
    domainMatches: ['lonestarcasino.com'],
    minAmount: 100,
    unit: 'SC',
    sourceUrl: 'https://cms.lonestarcasino.com/ssr/',
    lastChecked: CHECKED,
    note: 'Promotional Play Rules v1.9 (Nov 1, 2026) cl. 9.1.2: US$100 cash; US$45 gift card.',
  },
  {
    siteId: 'realprize',
    siteName: 'Real Prize',
    domainMatches: ['realprize.com'],
    minAmount: 100,
    unit: 'SC',
    sourceUrl: 'https://realprize.com/p/ppr',
    lastChecked: CHECKED,
    note: 'Promotional Play Rules v3.2 (Nov 1, 2026) cl. 9.1.2: US$100 cash; US$45 gift card.',
  },

  // Blank: no minimum found on the operator's own pages
  blank('stake_us', 'Stake.us', ['stake.us'], 'Terms 13.3 reserve the right to set a minimum but print no figure.'),
  blank('pulsz', 'Pulsz', ['pulsz.com'], 'Sweepstakes rules page needs a login; no figure on the public help pages.'),
  blank('funzpoints', 'Funzpoints', ['funzpoints.com'], 'No figure found on the operator site.'),
  blank('funrize', 'Funrize', ['funrize.com'], 'No figure found in the public terms.'),
  blank('jackpota', 'Jackpota', ['jackpota.com'], 'Sweepstakes rules URL returned 404; only third-party figures found.'),
  blank('nolimitcoins', 'NoLimitCoins', ['nolimitcoins.com'], 'No figure found on the operator site.'),

  // Blank: crypto casinos set minimums per coin in the cashier
  blank('stake', 'Stake.com', ['stake.com'], 'Per-coin minimums in the wallet; not comparable with the balance on screen.'),
  blank('roobet', 'Roobet', ['roobet.com'], 'Per-coin minimums in the cashier.'),
  blank('bcgame', 'BC.Game', ['bc.game'], 'Per-coin minimums in the wallet.'),
  blank('rollbit', 'Rollbit', ['rollbit.com'], 'Per-coin minimums in the wallet.'),
  blank('shuffle', 'Shuffle', ['shuffle.com'], 'Per-coin minimums in the wallet.'),
  blank('gamdom', 'Gamdom', ['gamdom.com'], 'Per-coin minimums in the cashier.'),
  blank('csgoempire', 'CSGOEmpire', ['csgoempire.com'], 'Per-coin / per-method minimums in the cashier.'),
];

function blank(siteId: string, siteName: string, domainMatches: string[], note: string): CashoutMinimumEntry {
  return { siteId, siteName, domainMatches, minAmount: null, unit: null, sourceUrl: null, lastChecked: CHECKED, note };
}

function hostMatches(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

export function findCashoutMinimum(hostname: string | null | undefined): CashoutMinimumEntry | null {
  if (!hostname) return null;
  const host = hostname.toLowerCase().replace(/^www\./, '');
  for (const entry of CASHOUT_MINIMUMS) {
    if (entry.domainMatches.some((d) => hostMatches(host, d))) return entry;
  }
  return null;
}

export type CashoutGateStatus = 'clear' | 'below' | 'unknown';

export interface CashoutGate {
  status: CashoutGateStatus;
  siteName: string;
  balance: number | null;
  minAmount: number | null;
  unit: CashoutMinimumUnit | null;
  /** How far under the minimum (rounded to cents). 0 unless status is `below`. */
  shortfall: number;
  sourceUrl: string | null;
}

/**
 * Decide whether a cash-out nudge may say "cash out" on this site at this balance.
 * A missing or unreadable balance on a site with a known minimum is `unknown`,
 * never `clear`.
 */
export function evaluateCashoutGate(hostname: string | null | undefined, balance: number | null | undefined): CashoutGate {
  const entry = findCashoutMinimum(hostname);
  const siteName = entry?.siteName ?? (hostname ? hostname.replace(/^www\./, '') : 'this site');
  const bal = typeof balance === 'number' && Number.isFinite(balance) ? balance : null;

  if (!entry || entry.minAmount === null || entry.unit === null) {
    return { status: 'unknown', siteName, balance: bal, minAmount: null, unit: null, shortfall: 0, sourceUrl: null };
  }
  if (bal === null) {
    return { status: 'unknown', siteName, balance: null, minAmount: entry.minAmount, unit: entry.unit, shortfall: 0, sourceUrl: entry.sourceUrl };
  }
  if (bal >= entry.minAmount) {
    return { status: 'clear', siteName, balance: bal, minAmount: entry.minAmount, unit: entry.unit, shortfall: 0, sourceUrl: entry.sourceUrl };
  }
  const shortfall = Math.round((entry.minAmount - bal) * 100) / 100;
  return { status: 'below', siteName, balance: bal, minAmount: entry.minAmount, unit: entry.unit, shortfall, sourceUrl: entry.sourceUrl };
}

export function formatCashoutAmount(amount: number, unit: CashoutMinimumUnit | null): string {
  const fixed = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
  if (unit === 'SC') return `${fixed} SC`;
  return `$${amount.toFixed(2)}`;
}

export interface CashoutGateCopy {
  /** Short label for the toast/modal tag. */
  tag: string;
  /** One or two plain sentences. */
  body: string;
  /** Label for the primary button. */
  actionLabel: string;
  /** What the primary button does. `cashier` only when status is clear or unknown. */
  action: 'cashier' | 'break';
}

/**
 * Copy for the below-minimum and unknown cases. For `clear` the caller keeps its
 * existing cash-out copy; this returns null so nothing changes there.
 */
export function getCashoutGateCopy(gate: CashoutGate): CashoutGateCopy | null {
  if (gate.status === 'clear') return null;

  if (gate.status === 'below' && gate.minAmount !== null) {
    const min = formatCashoutAmount(gate.minAmount, gate.unit);
    const short = formatCashoutAmount(gate.shortfall, gate.unit);
    return {
      tag: 'Under the cash-out minimum',
      body: `${gate.siteName} won't pay out under ${min}. You're ${short} under that. Playing on to reach it is how balances go to zero. This is a good place to stop or take a break.`,
      actionLabel: 'Take a break',
      action: 'break',
    };
  }

  if (gate.minAmount !== null) {
    return {
      tag: 'Balance not read',
      body: `TiltCheck couldn't read your balance. ${gate.siteName} won't pay out under ${formatCashoutAmount(gate.minAmount, gate.unit)}. Check the cashier before counting on a withdrawal.`,
      actionLabel: 'Check the cashier',
      action: 'cashier',
    };
  }

  return {
    tag: 'Cash-out minimum unknown',
    body: `TiltCheck doesn't have ${gate.siteName}'s minimum cash-out on file. Check the cashier before counting on a withdrawal.`,
    actionLabel: 'Check the cashier',
    action: 'cashier',
  };
}

/** True when a "Cashier" / cash-out button may be shown. False only when the balance is known to be under the minimum. */
export function shouldOfferCashier(gate: CashoutGate): boolean {
  return gate.status !== 'below';
}

/** Default length of the break a below-minimum nudge offers. */
export const BELOW_MINIMUM_BREAK_MS = 5 * 60_000;
