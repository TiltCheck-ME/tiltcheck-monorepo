/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-18 */

export type OperatorFactStatus = 'live' | 'stale' | 'retracted';

export interface VipCurrencyRule {
  currencyName: string;
  canLevel: boolean;
  notes: string;
  sourceUrl: string;
  asOf: string; // YYYY-MM-DD
}

export interface RedemptionFact {
  claim: string;
  sourceUrl: string;
  asOf: string;
  minHours?: number;
  maxHours?: number;
}

export interface WelcomeBonusFact {
  summary: string;
  sourceUrl: string;
  asOf: string;
  geoTags?: string[]; // e.g. ['US-FL']
}

/**
 * Third-party payout-speed benchmark. Kept separate from RedemptionFact, which is
 * the operator's own claim from its terms. Speeds are as the source states them.
 */
export interface PayoutBenchmarkFact {
  /** Speed as the source gives it, e.g. "Instant", "1-4 hours". */
  fastestSpeed: string;
  topMethods: string[];
  source: 'RotoWire';
  sourceUrl: string;
  asOf: string; // YYYY-MM-DD
  note?: string;
}

export interface OperatorFactRecord {
  slug: string;
  name: string;
  aliases?: string[];
  domains?: string[];
  category?: string;
  status: OperatorFactStatus;
  vipCurrencyRules?: VipCurrencyRule[];
  redemptionTime?: RedemptionFact;
  payoutBenchmark?: PayoutBenchmarkFact;
  welcomeBonusSummary?: WelcomeBonusFact;
  verifiedBy?: string;
  lastVerifiedAt: string;
}

export interface OperatorFactsFile {
  copyright: string;
  operators: OperatorFactRecord[];
}
