/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-18 */

import {
  extractCasinoNameCandidate,
  extractDomainCandidate,
  parseListFiltersFromText,
} from '@tiltcheck/intel-tools';
import type { ListFilters } from '@tiltcheck/intel-tools';
import type { RoutedIntent } from './types.js';

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

function extractOperatorName(text: string): string | null {
  const fromCandidate = extractCasinoNameCandidate(text);
  if (fromCandidate) {
    return fromCandidate;
  }

  const domain = extractDomainCandidate(text);
  if (domain) {
    return domain.split('.')[0] ?? domain;
  }

  const onMatch = text.match(/\bon\s+([A-Za-z][A-Za-z0-9.\s-]{1,30}?)(?:\s+in\b|\?|$)/i);
  if (onMatch?.[1]) {
    return onMatch[1].replace(/[?.!]+$/, '').trim();
  }

  const coinsMatch = text.match(/\b([a-z]+(?:\s+[a-z]+)?)\s+coins?\b/i);
  if (coinsMatch?.[1]) {
    return coinsMatch[1].trim();
  }

  const dealMatch = text.match(/\b(?:deal|program)\s+on\s+(.+?)(?:\?|$)/i);
  if (dealMatch?.[1]) {
    return dealMatch[1].replace(/[?.!]+$/, '').trim();
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
  return (
    /\b(redemption|redeem|payout|cash\s?out|withdraw(?:al)?)\b/.test(lower) ||
    (/\bhow long\b/.test(lower) && /\b(take|takes)\b/.test(lower))
  );
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

export function routeIntelIntent(message: string): RoutedIntent {
  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();

  if (!trimmed) {
    return { kind: 'unknown' };
  }

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
    const name = extractOperatorName(trimmed);
    if (name) {
      const currencyHint = extractCurrencyHint(trimmed);
      return { kind: 'operator_vip_fact', name, ...(currencyHint ? { currencyHint } : {}) };
    }
  }

  if (matchesRedemptionFact(lower)) {
    const name = extractOperatorName(trimmed);
    if (name) {
      return { kind: 'operator_redemption_fact', name };
    }
  }

  if (matchesWelcomeBonusFact(lower)) {
    const name = extractOperatorName(trimmed);
    if (name) {
      const geoTag = extractGeoTag(trimmed);
      return { kind: 'operator_welcome_bonus_fact', name, ...(geoTag ? { geoTag } : {}) };
    }
  }

  if (matchesOperatorFactLookup(lower)) {
    const name = extractOperatorName(trimmed);
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
    const fallbackName = trimmed
      .replace(/is\s+/i, '')
      .replace(/\s+a\s+scam.*/i, '')
      .replace(/[?.!]+$/, '')
      .trim();
    if (fallbackName.length >= 2) {
      return { kind: 'lookup', name: fallbackName, checkScam: true };
    }
  }

  if (domain) {
    return { kind: 'domain', domain };
  }

  return { kind: 'unknown' };
}
