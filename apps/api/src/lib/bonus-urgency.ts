// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-27
/**
 * Urgency ranking for email-sourced bonus feed entries (public GET /bonuses).
 */

import type { EmailBonusFeedEntry } from './email-bonus-feed.js';

export type BonusSortMode = 'urgency' | 'verified';

export const EXPIRES_SOON_MS = 48 * 60 * 60 * 1000;
export const URGENT_MS = 24 * 60 * 60 * 1000;

export interface PublicBonusOffer extends EmailBonusFeedEntry {
  casinoName: string;
  offerTitle: string;
  expiresSoon: boolean;
  urgent: boolean;
  urgencyRank: number;
}

export function enrichBonusEntry(entry: EmailBonusFeedEntry, now = new Date()): PublicBonusOffer {
  const expiresAtMs = entry.expiresAt ? new Date(entry.expiresAt).getTime() : null;
  const msUntilExpiry = expiresAtMs && !Number.isNaN(expiresAtMs) ? expiresAtMs - now.getTime() : null;
  const textUrgent = /\b(?:today\s*only|tonight|last\s*chance|expires?\s*in\s*\d+\s*h)/i.test(
    `${entry.expiryMessage} ${entry.bonus} ${entry.subject ?? ''}`,
  );

  const expiresSoon =
    (msUntilExpiry !== null && msUntilExpiry > 0 && msUntilExpiry <= EXPIRES_SOON_MS)
    || /\b(?:today|tonight|ends?\s*today)\b/i.test(entry.expiryMessage);

  const urgent =
    (msUntilExpiry !== null && msUntilExpiry > 0 && msUntilExpiry <= URGENT_MS)
    || textUrgent;

  return {
    ...entry,
    casinoName: entry.brand,
    offerTitle: entry.bonus,
    expiresSoon,
    urgent,
    urgencyRank: computeUrgencyRank(entry, now, expiresSoon, urgent, msUntilExpiry),
  };
}

function computeUrgencyRank(
  entry: EmailBonusFeedEntry,
  now: Date,
  expiresSoon: boolean,
  urgent: boolean,
  msUntilExpiry: number | null,
): number {
  let rank = 0;
  if (urgent) rank += 1_000_000;
  if (expiresSoon) rank += 500_000;
  if (msUntilExpiry !== null && msUntilExpiry > 0) {
    rank += Math.max(0, 400_000 - Math.floor(msUntilExpiry / 60_000));
  }
  if (/\b(?:today\s*only|last\s*chance|limited\s*time)/i.test(entry.expiryMessage)) {
    rank += 50_000;
  }
  rank += new Date(entry.updatedAt || entry.verified).getTime() / 1_000_000;
  if (!entry.expiresAt) rank -= 10_000;
  void now;
  return rank;
}

export function sortBonusEntries<T extends EmailBonusFeedEntry>(
  entries: T[],
  sort: BonusSortMode,
  now = new Date(),
): T[] {
  const copy = [...entries];
  if (sort === 'verified') {
    return copy.sort(
      (left, right) => new Date(right.verified).getTime() - new Date(left.verified).getTime(),
    );
  }

  const enriched = copy.map((entry) => enrichBonusEntry(entry, now));
  enriched.sort((left, right) => right.urgencyRank - left.urgencyRank);
  const order = new Map(enriched.map((entry, index) => [entry.id, index]));
  return copy.sort((left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0));
}

export function applyBonusListOptions(
  entries: EmailBonusFeedEntry[],
  options: { limit?: number; sort?: BonusSortMode },
  now = new Date(),
): PublicBonusOffer[] {
  const limit = clampLimit(options.limit);
  const sort = options.sort === 'verified' ? 'verified' : 'urgency';
  const sorted = sortBonusEntries(entries, sort, now);
  return sorted.slice(0, limit).map((entry) => enrichBonusEntry(entry, now));
}

export function parseBonusListQuery(query: Record<string, unknown>): {
  source: 'inbox' | 'collectclock';
  limit: number;
  sort: BonusSortMode;
} {
  const rawSource = typeof query.source === 'string' ? query.source.trim().toLowerCase() : '';
  const source = rawSource === 'inbox' ? 'inbox' : 'collectclock';
  const rawSort = typeof query.sort === 'string' ? query.sort.trim().toLowerCase() : '';
  const sort: BonusSortMode = rawSort === 'verified' ? 'verified' : 'urgency';
  const limit = clampLimit(
    typeof query.limit === 'string' ? Number.parseInt(query.limit, 10) : Number(query.limit),
  );
  return { source, limit, sort };
}

function clampLimit(raw: number | undefined): number {
  if (!raw || Number.isNaN(raw)) return 50;
  return Math.min(Math.max(Math.floor(raw), 1), 100);
}
