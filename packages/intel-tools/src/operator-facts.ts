/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-18 */

import type {
  OperatorFactRecord,
  RedemptionFact,
  VipCurrencyRule,
  WelcomeBonusFact,
} from './operator-facts-types.js';

export const STALE_AFTER_DAYS = 90;

export type FactAnswer<T> =
  | { kind: 'hit'; record: OperatorFactRecord; payload: T; stale: boolean }
  | { kind: 'miss'; record: OperatorFactRecord }
  | { kind: 'none' }
  | { kind: 'ambiguous'; matches: OperatorFactRecord[] };

export type VipCurrencyAnswer =
  | { kind: 'hit'; record: OperatorFactRecord; rules: VipCurrencyRule[]; stale: boolean }
  | { kind: 'miss'; record: OperatorFactRecord }
  | { kind: 'none' }
  | { kind: 'ambiguous'; matches: OperatorFactRecord[] };

export type OperatorFactType = 'vip' | 'redemption' | 'welcome';

function normalizeFactQuery(query: string): string {
  return query
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .split('/')[0] ?? '';
}

function domainBase(value: string): string {
  if (!value.includes('.')) {
    return value;
  }

  const labels = value.split('.').filter(Boolean);
  if (labels.length < 2) {
    return labels[0] ?? value;
  }

  return labels.at(-2) ?? value;
}

function fieldMatchRank(field: string | undefined, query: string): 0 | 1 | 2 {
  const normalizedField = normalizeFactQuery(field ?? '');
  if (!normalizedField) {
    return 0;
  }

  if (normalizedField === query) {
    return 2;
  }

  if (normalizedField.includes('.') && domainBase(normalizedField) === domainBase(query)) {
    return 2;
  }

  if (query.length >= 4 && normalizedField.startsWith(query)) {
    return 1;
  }

  return 0;
}

function recordMatchRank(record: OperatorFactRecord, query: string): 0 | 1 | 2 {
  const normalizedQuery = normalizeFactQuery(query);
  if (!normalizedQuery) {
    return 0;
  }

  const slugRank = fieldMatchRank(record.slug, normalizedQuery);
  const nameRank = fieldMatchRank(record.name, normalizedQuery);
  const aliasRank = Math.max(
    ...((record.aliases ?? []).map((alias) => fieldMatchRank(alias, normalizedQuery)) as Array<0 | 1 | 2>),
    0,
  ) as 0 | 1 | 2;
  const domainRank = Math.max(
    ...((record.domains ?? []).map((domain) => fieldMatchRank(domain, normalizedQuery)) as Array<0 | 1 | 2>),
    0,
  ) as 0 | 1 | 2;

  if (slugRank === 2 || nameRank === 2 || aliasRank === 2 || domainRank === 2) {
    return 2;
  }

  if (slugRank === 1 || nameRank === 1 || aliasRank === 1 || domainRank === 1) {
    return 1;
  }

  return 0;
}

export function isFactStale(asOf: string, now: Date = new Date()): boolean {
  const asOfDate = new Date(`${asOf}T00:00:00Z`);
  if (Number.isNaN(asOfDate.getTime())) {
    return true;
  }
  const ageMs = now.getTime() - asOfDate.getTime();
  const staleMs = STALE_AFTER_DAYS * 24 * 60 * 60 * 1000;
  return ageMs > staleMs;
}

export function resolveOperatorFacts(
  records: OperatorFactRecord[],
  query: string,
): OperatorFactRecord[] {
  const exactMatches: OperatorFactRecord[] = [];
  const prefixMatches: OperatorFactRecord[] = [];

  for (const record of records) {
    const rank = recordMatchRank(record, query);
    if (rank === 2) {
      exactMatches.push(record);
      continue;
    }
    if (rank === 1) {
      prefixMatches.push(record);
    }
  }

  return exactMatches.length > 0 ? exactMatches : prefixMatches;
}

function isRulesStale(rules: VipCurrencyRule[], now?: Date): boolean {
  return rules.some((rule) => isFactStale(rule.asOf, now));
}

function resolveSingleMatch(
  records: OperatorFactRecord[],
  query: string,
):
  | { kind: 'none' }
  | { kind: 'ambiguous'; matches: OperatorFactRecord[] }
  | { kind: 'resolved'; record: OperatorFactRecord } {
  const matches = resolveOperatorFacts(records, query);
  if (matches.length === 0) {
    return { kind: 'none' };
  }
  if (matches.length > 1) {
    return { kind: 'ambiguous', matches };
  }
  return { kind: 'resolved', record: matches[0]! };
}

export function getVipCurrencyAnswer(
  records: OperatorFactRecord[],
  query: string,
  now?: Date,
): VipCurrencyAnswer {
  const resolved = resolveSingleMatch(records, query);
  if (resolved.kind === 'none') {
    return { kind: 'none' };
  }
  if (resolved.kind === 'ambiguous') {
    return { kind: 'ambiguous', matches: resolved.matches };
  }

  const rules = resolved.record.vipCurrencyRules ?? [];
  if (rules.length === 0) {
    return { kind: 'miss', record: resolved.record };
  }

  return {
    kind: 'hit',
    record: resolved.record,
    rules,
    stale: isRulesStale(rules, now),
  };
}

export function getRedemptionAnswer(
  records: OperatorFactRecord[],
  query: string,
  now?: Date,
): FactAnswer<RedemptionFact> {
  const resolved = resolveSingleMatch(records, query);
  if (resolved.kind === 'none') {
    return { kind: 'none' };
  }
  if (resolved.kind === 'ambiguous') {
    return { kind: 'ambiguous', matches: resolved.matches };
  }

  const redemption = resolved.record.redemptionTime;
  if (!redemption) {
    return { kind: 'miss', record: resolved.record };
  }

  return {
    kind: 'hit',
    record: resolved.record,
    payload: redemption,
    stale: isFactStale(redemption.asOf, now),
  };
}

export function getWelcomeBonusAnswer(
  records: OperatorFactRecord[],
  query: string,
  geoTag?: string,
  now?: Date,
): FactAnswer<WelcomeBonusFact> {
  const resolved = resolveSingleMatch(records, query);
  if (resolved.kind === 'none') {
    return { kind: 'none' };
  }
  if (resolved.kind === 'ambiguous') {
    return { kind: 'ambiguous', matches: resolved.matches };
  }

  const welcome = resolved.record.welcomeBonusSummary;
  if (!welcome) {
    return { kind: 'miss', record: resolved.record };
  }

  if (geoTag) {
    const normalizedGeo = geoTag.trim().toUpperCase();
    const geoTags = welcome.geoTags?.map((tag) => tag.toUpperCase()) ?? [];
    if (geoTags.length === 0 || !geoTags.includes(normalizedGeo)) {
      return { kind: 'miss', record: resolved.record };
    }
  }

  return {
    kind: 'hit',
    record: resolved.record,
    payload: welcome,
    stale: isFactStale(welcome.asOf, now),
  };
}

function availableFactTypesForRecord(record: OperatorFactRecord): OperatorFactType[] {
  const types: OperatorFactType[] = [];
  if (record.vipCurrencyRules && record.vipCurrencyRules.length > 0) {
    types.push('vip');
  }
  if (record.redemptionTime) {
    types.push('redemption');
  }
  if (record.welcomeBonusSummary) {
    types.push('welcome');
  }
  return types;
}

function availableFactTypesAreStale(record: OperatorFactRecord, now?: Date): boolean {
  const asOfValues: string[] = [];

  for (const rule of record.vipCurrencyRules ?? []) {
    asOfValues.push(rule.asOf);
  }
  if (record.redemptionTime?.asOf) {
    asOfValues.push(record.redemptionTime.asOf);
  }
  if (record.welcomeBonusSummary?.asOf) {
    asOfValues.push(record.welcomeBonusSummary.asOf);
  }

  return asOfValues.some((asOf) => isFactStale(asOf, now));
}

export function listAvailableFactTypesAnswer(
  records: OperatorFactRecord[],
  query: string,
): FactAnswer<OperatorFactType[]> {
  const resolved = resolveSingleMatch(records, query);
  if (resolved.kind === 'none') {
    return { kind: 'none' };
  }
  if (resolved.kind === 'ambiguous') {
    return { kind: 'ambiguous', matches: resolved.matches };
  }

  const types = availableFactTypesForRecord(resolved.record);
  if (types.length === 0) {
    return { kind: 'miss', record: resolved.record };
  }

  return {
    kind: 'hit',
    record: resolved.record,
    payload: types,
    stale: availableFactTypesAreStale(resolved.record),
  };
}
