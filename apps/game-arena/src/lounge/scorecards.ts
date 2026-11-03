/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-28 */

import { createHash } from 'node:crypto';
import { LOUNGE_RECEIPTS_LINE } from './sanitize.js';

export const MIN_PAYOUT_SAMPLES = 50;

export type ScorecardEvidence = {
  kind: 'terms' | 'screenshot' | 'logger' | 'diff';
  url?: string;
  note: string;
};

export type ScorecardClaim = {
  id: string;
  label: string;
  value: string;
  negative: boolean;
  evidence: ScorecardEvidence | null;
};

export type ScorecardEvent = {
  at: string;
  title: string;
  evidence: ScorecardEvidence | null;
};

export type CasinoScorecard = {
  slug: string;
  name: string;
  domains: string[];
  termsUrl: string;
  termsHash: string | null;
  launchedAt: string | null;
  launchedMidCrackdown: boolean;
  legalNote: string;
  claims: ScorecardClaim[];
  timeline: ScorecardEvent[];
  payoutSamples: number;
  trend: 'up' | 'down' | 'flat';
};

export function rejectUnevidencedNegative(claim: ScorecardClaim): { ok: true } | { ok: false; reason: string } {
  if (claim.negative && !claim.evidence) {
    return { ok: false, reason: LOUNGE_RECEIPTS_LINE };
  }
  return { ok: true };
}

export function hashTermsBody(body: string): string {
  return createHash('sha256').update(body).digest('hex');
}

export function termsChanged(previousHash: string | null, nextBody: string): boolean {
  if (!previousHash) return true;
  return previousHash !== hashTermsBody(nextBody);
}

export function payoutLabel(samples: number, observedRate: number | null): string {
  if (samples < MIN_PAYOUT_SAMPLES || observedRate == null) {
    return 'probably just variance';
  }
  return `observed payout ${observedRate.toFixed(2)} over ${samples} opt-in rounds`;
}

export function trendFromTimeline(events: ScorecardEvent[]): 'up' | 'down' | 'flat' {
  const negatives = events.filter((event) => event.title.toLowerCase().includes('worse')).length;
  const positives = events.filter((event) => event.title.toLowerCase().includes('better')).length;
  if (positives > negatives) return 'up';
  if (negatives > positives) return 'down';
  return 'flat';
}

export function publishClaim(card: CasinoScorecard, claim: ScorecardClaim): { ok: true; card: CasinoScorecard } | { ok: false; reason: string } {
  const gate = rejectUnevidencedNegative(claim);
  if (!gate.ok) return gate;
  return { ok: true, card: { ...card, claims: [...card.claims, claim], trend: trendFromTimeline(card.timeline) } };
}

export const SEEDED_SCORECARDS: CasinoScorecard[] = [
  {
    slug: 'bink-bet',
    name: 'Bink.bet',
    domains: ['bink.bet'],
    termsUrl: 'https://bink.bet/terms',
    termsHash: null,
    launchedAt: null,
    launchedMidCrackdown: false,
    legalNote: 'Manually curated placeholder. Not a staff claim. Update when a filing or terms page is hashed.',
    claims: [
      {
        id: 'bink-terms',
        label: 'Rules published',
        value: 'yes — terms page linked as evidence',
        negative: false,
        evidence: { kind: 'terms', url: 'https://bink.bet/terms', note: 'Operator terms URL. Not an affiliate link.' },
      },
    ],
    timeline: [{ at: '2026-10-28', title: 'Scorecard opened', evidence: { kind: 'terms', url: 'https://bink.bet/terms', note: 'Record created from public terms URL.' } }],
    payoutSamples: 0,
    trend: 'flat',
  },
  {
    slug: 'nuts-gg',
    name: 'nuts.gg',
    domains: ['nuts.gg'],
    termsUrl: 'https://nuts.gg/terms',
    termsHash: null,
    launchedAt: null,
    launchedMidCrackdown: false,
    legalNote: 'Manually curated placeholder. AutoVault userscript exists in-repo. Not a staff claim.',
    claims: [
      {
        id: 'nuts-terms',
        label: 'Rules published',
        value: 'yes — terms page linked as evidence',
        negative: false,
        evidence: { kind: 'terms', url: 'https://nuts.gg/terms', note: 'Operator terms URL. Not an affiliate link.' },
      },
    ],
    timeline: [{ at: '2026-10-28', title: 'Scorecard opened', evidence: { kind: 'terms', url: 'https://nuts.gg/terms', note: 'Record created from public terms URL.' } }],
    payoutSamples: 0,
    trend: 'flat',
  },
];
