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

function fieldMatchesQuery(field: string, query: string): boolean {
  const normalizedField = field.toLowerCase();
  if (normalizedField === query) {
    return true;
  }
  if (normalizedField.includes(query) || query.includes(normalizedField)) {
    return true;
  }
  const fieldStem = normalizedField.split('.')[0] ?? normalizedField;
  const queryStem = query.split('.')[0] ?? query;
  return fieldStem === queryStem;
}

function recordMatchesQuery(record: OperatorFactRecord, query: string): boolean {
  const normalizedQuery = normalizeFactQuery(query);
  if (!normalizedQuery) {
    return false;
  }

  if (fieldMatchesQuery(record.slug, normalizedQuery)) {
    return true;
  }
  if (fieldMatchesQuery(record.name, normalizedQuery)) {
    return true;
  }
  if (record.aliases?.some((alias) => fieldMatchesQuery(alias, normalizedQuery))) {
    return true;
  }
  if (record.domains?.some((domain) => fieldMatchesQuery(domain, normalizedQuery))) {
    return true;
  }

  return false;
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
  return records.filter((record) => recordMatchesQuery(record, query));
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
    stale: isFactStale(resolved.record.lastVerifiedAt),
  };
}
