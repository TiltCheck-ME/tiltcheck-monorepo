/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-18 */

import {
  extractCasinoNameCandidate,
  extractDomainCandidate,
  parseListFiltersFromText,
} from '@tiltcheck/intel-tools';
import type { ListFilters } from '@tiltcheck/intel-tools';
import type { RoutedIntent } from './types.js';

/** Strip trailing ?, . and ! characters without a backtracking regex (ReDoS-safe). */
function stripTrailingPunctuation(value: string): string {
  let end = value.length;
  while (end > 0) {
    const ch = value[end - 1];
    if (ch !== '?' && ch !== '.' && ch !== '!') break;
    end -= 1;
  }
  return value.slice(0, end);
}

// Linear equivalent of replacing /\s+a\s+scam.*/i with '' ('.' stops at a newline).
function stripScamSuffix(value: string): string {
  const idx = value.search(/\sa\s+scam/i);
  if (idx === -1) return value;
  const newline = value.indexOf('\n', idx + 1);
  const rest = newline === -1 ? '' : value.slice(newline);
  return value.slice(0, idx).trimEnd() + rest;
}

function buildListTitle(filters: ListFilters): string {
  if (filters.geo === 'us-crypto') {
    return 'US crypto casinos';
  }
  if (filters.geo === 'us-sweeps') {
    return 'US sweeps casinos';
  }
  if (filters.category) {
    return `${filters.category} casinos`;
  }
  return 'Tracked casinos';
}

function extractCurrencyHint(text: string): string | undefined {
  const lower = text.toLowerCase();
  if (/\bgold coins?\b/.test(lower)) {
    return 'gold coins';
  }
  if (/\bsweeps coins?\b/.test(lower)) {
    return 'sweeps coins';
  }
  if (/\bgc\b/.test(lower)) {
    return 'GC';
  }
  if (/\bsc\b/.test(lower)) {
    return 'SC';
  }
  return undefined;
}

function extractGeoTag(text: string): string | undefined {
  const lower = text.toLowerCase();
  if (/\bflorida\b/.test(lower)) {
    return 'US-FL';
  }
  return undefined;
}

const PRONOUN_SUBJECTS = new Set(['it', 'a withdrawal', 'a cash out', 'a cashout', 'a payout', 'a redemption']);

function extractOperatorName(text: string): string | null {
  const fromCandidate = extractCasinoNameCandidate(text);
  if (fromCandidate) {
    return fromCandidate;
  }

  const domain = extractDomainCandidate(text);
  if (domain) {
    return domain.split('.')[0] ?? domain;
  }

  const howLongMatch = text.match(/\bhow long does\s+([A-Za-z][A-Za-z0-9.\s-]{1,30}?)(?:\s+redemption\b|\s+take\b|\?|$)/i);
  if (howLongMatch?.[1]) {
    const candidate = stripTrailingPunctuation(howLongMatch[1]).trim();
    if (!PRONOUN_SUBJECTS.has(candidate.toLowerCase())) {
      return candidate;
    }
  }

  const onMatch = text.match(/\b(?:on|at|from)\s+([A-Za-z][A-Za-z0-9.\s-]{1,30}?)(?:\s+in\b|\?|$)/i);
  if (onMatch?.[1]) {
    return stripTrailingPunctuation(onMatch[1]).trim();
  }

  const coinsMatch = text.match(/\b([a-z]+(?:\s+[a-z]+)?)\s+coins?\b/i);
  if (coinsMatch?.[1]) {
    return coinsMatch[1].trim();
  }

  const dealMatch = text.match(/\b(?:deal|program)\s+on\s+(\S.*?)(?:\?|$)/i);
  if (dealMatch?.[1]) {
    return stripTrailingPunctuation(dealMatch[1]).trim();
  }

  return null;
}

function matchesVipCurrencyFact(lower: string): boolean {
  const hasCurrency =
    /\b(gold coins?|sweeps coins?|gc|sc)\b/.test(lower) ||
    extractCurrencyHint(lower) !== undefined;
  const hasVipSignal =
    /\b(vip|loyalty)\b/.test(lower) ||
    /\blevel(?:ing| up)?\b/.test(lower) ||
    (/\blevel\b/.test(lower) && /\b(with|using)\b/.test(lower));

  return hasCurrency && hasVipSignal;
}

function matchesRedemptionFact(lower: string): boolean {
  return /\b(redemptions?|redeem|payouts?|pays? out|cash(?:es)?[\s-]?out|withdraw(?:al|als|s)?)\b/.test(lower);
}

function includesAny(lower: string, terms: readonly string[]): boolean {
  return terms.some((term) => lower.includes(term));
}

const PAYOUT_TERMS = [
  'payout',
  'pay out',
  'pays out',
  'paying out',
  'cash out',
  'cashout',
  'cash-out',
  'cashes out',
  'withdraw',
] as const;

const SPEED_RANKING_TERMS = [
  'fastest',
  'quickest',
  'instant',
  'same day',
  'same-day',
  'fast payout',
  'quick payout',
  'fast cash',
  'quick cash',
  'fast withdraw',
] as const;

const GENERIC_CASINO_TERMS = [
  'casinos',
  'which casino',
  'what casino',
  'sites',
  'apps',
  'list',
  'top ',
  'best ',
  'ranking',
  'ranked',
] as const;

/** "fastest payout casinos", "which casinos pay out instantly", "fastest cash out". Plain string checks (ReDoS-safe). */
function matchesPayoutSpeedRanking(lower: string, trimmed: string, knownOperator: string | null): boolean {
  if (!includesAny(lower, PAYOUT_TERMS) || !includesAny(lower, SPEED_RANKING_TERMS)) {
    return false;
  }
  // A named operator ("Does DraftKings pay out instantly?") gets its own sourced answer, not the ranking.
  if (knownOperator) {
    return false;
  }
  // The benchmark covers regulated real-money casinos only; sweeps questions stay on their own path.
  if (lower.includes('sweep')) {
    return false;
  }
  if (includesAny(lower, GENERIC_CASINO_TERMS)) {
    return true;
  }
  return extractOperatorName(trimmed) === null;
}

function matchesWelcomeBonusFact(lower: string): boolean {
  if (/\bmy bonus\b/.test(lower)) {
    return false;
  }
  return (
    /\b(welcome|new player|sign\s?up)\b.*\bbonus/.test(lower) ||
    /\bbonus(?:es)?\b.*\b(welcome|new player|sign\s?up|available)\b/.test(lower) ||
    /\bnew player bonuses?\b/.test(lower)
  );
}

function matchesOperatorFactLookup(lower: string): boolean {
  return (
    /\b(vip deal|loyalty program|vip program)\b/.test(lower) ||
    /\bwhat is the vip\b/.test(lower)
  );
}

export interface RouteIntelIntentOptions {
  /** Returns the name of a known operator mentioned anywhere in the text, or null. */
  findKnownOperator?: (text: string) => string | null;
}

export function routeIntelIntent(message: string, options: RouteIntelIntentOptions = {}): RoutedIntent {
  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();

  if (!trimmed) {
    return { kind: 'unknown' };
  }

  // Known operators are matched against the facts data first, so names in plain
  // subject position ("Does DraftKings pay out instantly?") are not missed.
  const knownOperator = options.findKnownOperator?.(trimmed) ?? null;
  const operatorName = (): string | null => knownOperator ?? extractOperatorName(trimmed);

  if (/\b(my bonus|reload|re-up|collectclock)\b/.test(lower)) {
    return { kind: 'personal', topic: 'bonus' };
  }
  if (/\b(my session|session stats|rtp|how am i doing)\b/.test(lower)) {
    return { kind: 'personal', topic: 'session' };
  }
  if (/\b(vault|lockvault|should i vault)\b/.test(lower)) {
    return { kind: 'personal', topic: 'vault' };
  }

  if (matchesVipCurrencyFact(lower)) {
    const name = operatorName();
    if (name) {
      const currencyHint = extractCurrencyHint(trimmed);
      return { kind: 'operator_vip_fact', name, ...(currencyHint ? { currencyHint } : {}) };
    }
  }

  if (matchesPayoutSpeedRanking(lower, trimmed, knownOperator)) {
    return { kind: 'payout_speed_ranking' };
  }

  if (matchesRedemptionFact(lower)) {
    const name = operatorName();
    if (name) {
      return { kind: 'operator_redemption_fact', name };
    }
  }

  if (matchesWelcomeBonusFact(lower)) {
    const name = operatorName();
    if (name) {
      const geoTag = extractGeoTag(trimmed);
      return { kind: 'operator_welcome_bonus_fact', name, ...(geoTag ? { geoTag } : {}) };
    }
  }

  if (matchesOperatorFactLookup(lower)) {
    const name = operatorName();
    if (name) {
      return { kind: 'operator_fact_lookup', name };
    }
  }

  if (/\b(how (?:do|are) grades|grading methodology|trust score work)\b/.test(lower)) {
    return { kind: 'methodology' };
  }

  const domain = extractDomainCandidate(trimmed);
  if (domain && (/\b(check|scan|verify|domain)\b/.test(lower) || domain.includes('.'))) {
    return { kind: 'domain', domain };
  }

  if (/\blist\b/.test(lower) || /\bshow me\b/.test(lower) || /\bcasinos\b/.test(lower)) {
    const filters = parseListFiltersFromText(trimmed);
    if (filters.category || filters.geo !== 'all' || /\bcasinos\b/.test(lower)) {
      return { kind: 'list', filters, title: buildListTitle(filters) };
    }
  }

  const scamCheck = /\bscam\b|\bskem\b|\bsus\b|\blegit\b|\bsafe\b/.test(lower);
  const name = extractCasinoNameCandidate(trimmed);
  if (name) {
    return { kind: 'lookup', name, checkScam: scamCheck };
  }

  if (scamCheck) {
    const fallbackName = stripTrailingPunctuation(
      stripScamSuffix(trimmed.replace(/is\s+/i, '')),
    ).trim();
    if (fallbackName.length >= 2) {
      return { kind: 'lookup', name: fallbackName, checkScam: true };
    }
  }

  if (domain) {
    return { kind: 'domain', domain };
  }

  return { kind: 'unknown' };
}
