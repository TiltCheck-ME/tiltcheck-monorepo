/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-18 */

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

export interface OperatorFactRecord {
  slug: string;
  name: string;
  aliases?: string[];
  domains?: string[];
  category?: string;
  status: OperatorFactStatus;
  vipCurrencyRules?: VipCurrencyRule[];
  redemptionTime?: RedemptionFact;
  welcomeBonusSummary?: WelcomeBonusFact;
  verifiedBy?: string;
  lastVerifiedAt: string;
}

export interface OperatorFactsFile {
  copyright: string;
  operators: OperatorFactRecord[];
}
