/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-28 */
/**
 * Instant Redeem casino eligibility gate.
 * No Instant Redeem at scam / critically low-trust shops. Period.
 */

import { trustEngines } from '@tiltcheck/trust-engines';
import { loadDomainBlacklist } from './live-feed-data.js';
import { normalizeCapabilityDomain } from './instant-redeem-registry.js';

/** Overall casino trust floor for Instant Redeem eligibility. */
export const INSTANT_REDEEM_MIN_TRUST_SCORE = 40;

/** Domain tokens that are an automatic no — sandbox + obvious skem markers. */
const DOMAIN_DENY_PATTERNS: RegExp[] = [
  /(^|\.)scam(\.|-)/i,
  /fakepayout/i,
  /drainwallet/i,
  /phishing/i,
  /rugpull/i,
  /honeypot-casino/i,
];

export type InstantRedeemCasinoGateCode =
  | 'CASINO_CLEAR'
  | 'SCAM_DOMAIN_BLOCKED'
  | 'TRUST_SCORE_BLOCKED'
  | 'DOMAIN_REQUIRED';

export type InstantRedeemCasinoGateResult = {
  allowed: boolean;
  code: InstantRedeemCasinoGateCode;
  domain: string | null;
  reasons: string[];
  trustScore: number | null;
  note: string;
};

function matchesDenyPattern(domain: string): boolean {
  return DOMAIN_DENY_PATTERNS.some((pattern) => pattern.test(domain));
}

function isBlacklistMatch(domain: string, blacklist: string[]): boolean {
  return blacklist.some(
    (entry) =>
      entry === domain ||
      domain.endsWith(`.${entry}`) ||
      entry.endsWith(`.${domain}`),
  );
}

/**
 * Evaluate whether Instant Redeem is allowed for a casino domain.
 * Fail closed on known scam blacklist / deny patterns / critically low trust.
 */
export async function evaluateInstantRedeemCasinoGate(
  rawDomain: string | null | undefined,
): Promise<InstantRedeemCasinoGateResult> {
  if (!rawDomain || !String(rawDomain).trim()) {
    return {
      allowed: false,
      code: 'DOMAIN_REQUIRED',
      domain: null,
      reasons: ['Casino domain required for Instant Redeem eligibility'],
      trustScore: null,
      note: 'No domain, no Instant Redeem. We do not cash out into the void.',
    };
  }

  const domain = normalizeCapabilityDomain(rawDomain);
  const reasons: string[] = [];

  if (matchesDenyPattern(domain)) {
    return {
      allowed: false,
      code: 'SCAM_DOMAIN_BLOCKED',
      domain,
      reasons: ['Domain matches Instant Redeem scam deny pattern'],
      trustScore: null,
      note: 'Instant Redeem denied. We do not cash out at scam casinos.',
    };
  }

  try {
    const blacklist = await loadDomainBlacklist();
    if (
      (blacklist.availability === 'available' || blacklist.availability === 'empty') &&
      isBlacklistMatch(domain, blacklist.domains)
    ) {
      return {
        allowed: false,
        code: 'SCAM_DOMAIN_BLOCKED',
        domain,
        reasons: ['Domain is on the TiltCheck scam domain blacklist'],
        trustScore: null,
        note: 'Instant Redeem denied. Blacklisted domain — no payout rail for skem shops.',
      };
    }
  } catch {
    // Blacklist load failure should not silently allow obvious deny patterns (already checked).
    reasons.push('Scam blacklist unavailable; other gates still apply');
  }

  const breakdown = trustEngines.getCasinoBreakdown(domain);
  const trustScore = typeof breakdown?.score === 'number' ? breakdown.score : null;
  const hasHistory = Array.isArray(breakdown?.history) && breakdown.history.length > 0;

  if (
    hasHistory &&
    trustScore != null &&
    trustScore < INSTANT_REDEEM_MIN_TRUST_SCORE
  ) {
    return {
      allowed: false,
      code: 'TRUST_SCORE_BLOCKED',
      domain,
      reasons: [
        `Casino trust score ${trustScore} is below Instant Redeem floor ${INSTANT_REDEEM_MIN_TRUST_SCORE}`,
      ],
      trustScore,
      note: 'Instant Redeem denied. Trust score is cooked — fix the house before you get a payout rail.',
    };
  }

  return {
    allowed: true,
    code: 'CASINO_CLEAR',
    domain,
    reasons,
    trustScore,
    note: 'Casino cleared Instant Redeem eligibility gates.',
  };
}
