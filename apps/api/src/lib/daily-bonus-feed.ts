// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-18
/**
 * Daily Bonus Feed Aggregator
 *
 * Merges daily-promos.live, email inbox, and CollectClock into one feed.
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getActiveEmailBonusEntries, type EmailBonusFeedEntry } from './email-bonus-feed.js';
import {
  getLiveDailyPromos,
  isPromoStale,
  type DailyPromoRecord,
} from './daily-promos-store.js';

export type BonusFeedSourceKey = 'daily-promos' | 'collectclock' | 'email-inbox' | 'local-fallback';

export interface DailyBonusFeedEntry {
  id: string;
  brand: string;
  bonus: string;
  url: string;
  verified: string;
  code: string | null;
  sources: BonusFeedSourceKey[];
  bonusType: string | null;
  bonusValue: string | null;
  expiresAt: string | null;
  expiryMessage: string | null;
  imageUrl: string | null;
  slug: string | null;
  stale: boolean;
}

export interface BonusSourceStatus {
  key: BonusFeedSourceKey;
  label: string;
  available: boolean;
  count: number;
  updatedAt: string | null;
  detail: string;
}

export interface DailyBonusFeedResult {
  updatedAt: string;
  total: number;
  data: DailyBonusFeedEntry[];
  sources: BonusSourceStatus[];
}

interface RawBonusEntry {
  brand: string;
  bonus: string;
  url: string;
  verified: string;
  code?: string | null;
}

const COLLECTCLOCK_BONUS_URL =
  'https://raw.githubusercontent.com/TiltCheck-ME/CollectClock/main/bonus-data.json';

const SOURCE_LABELS: Record<BonusFeedSourceKey, string> = {
  'daily-promos': 'Daily promos (live)',
  collectclock: 'CollectClock',
  'email-inbox': 'Email inbox',
  'local-fallback': 'Local cache',
};

const API_LIB_DIR = path.dirname(fileURLToPath(import.meta.url));

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function normalizeBonusKey(entry: Pick<RawBonusEntry, 'brand' | 'bonus' | 'url'>): string {
  return `${entry.brand.trim().toLowerCase()}::${entry.bonus.trim().toLowerCase()}::${entry.url.trim().toLowerCase()}`;
}

function isRawBonusEntry(value: unknown): value is RawBonusEntry {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<RawBonusEntry>;
  return (
    typeof candidate.brand === 'string' &&
    typeof candidate.bonus === 'string' &&
    typeof candidate.url === 'string' &&
    typeof candidate.verified === 'string'
  );
}

function loadLocalFallback(): RawBonusEntry[] {
  const candidates = [
    path.resolve(API_LIB_DIR, '../../../../data/bonus-data.json'),
    path.resolve(process.cwd(), 'data/bonus-data.json'),
  ];
  for (const filePath of candidates) {
    if (!existsSync(filePath)) continue;
    try {
      const parsed = JSON.parse(readFileSync(filePath, 'utf8')) as unknown;
      if (!Array.isArray(parsed)) continue;
      return parsed.filter(isRawBonusEntry);
    } catch {
      /* try next */
    }
  }
  return [];
}

async function loadCollectClock(): Promise<RawBonusEntry[]> {
  try {
    const response = await fetch(COLLECTCLOCK_BONUS_URL, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return [];
    const parsed = (await response.json()) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isRawBonusEntry);
  } catch {
    return [];
  }
}

function fromPromo(record: DailyPromoRecord): DailyBonusFeedEntry {
  return {
    id: record.id || normalizeBonusKey(record),
    brand: record.brand,
    bonus: record.bonus,
    url: record.url,
    verified: record.verified,
    code: record.code,
    sources: ['daily-promos'],
    bonusType: record.bonusType || null,
    bonusValue: null,
    expiresAt: record.expiresAt,
    expiryMessage: record.expiryMessage,
    imageUrl: record.imageUrl,
    slug: record.slug || null,
    stale: isPromoStale(record),
  };
}

function fromEmail(entry: EmailBonusFeedEntry): DailyBonusFeedEntry {
  return {
    id: entry.id || normalizeBonusKey(entry),
    brand: entry.brand,
    bonus: entry.bonus,
    url: entry.url,
    verified: entry.verified,
    code: entry.code,
    sources: ['email-inbox'],
    bonusType: entry.bonusType || null,
    bonusValue: entry.bonusValue || null,
    expiresAt: entry.expiresAt,
    expiryMessage: entry.expiryMessage || null,
    imageUrl: entry.imageUrl,
    slug: null,
    stale: false,
  };
}

function fromRaw(entry: RawBonusEntry, source: BonusFeedSourceKey): DailyBonusFeedEntry {
  return {
    id: `${source}:${normalizeBonusKey(entry)}`,
    brand: entry.brand,
    bonus: entry.bonus,
    url: entry.url,
    verified: entry.verified,
    code: entry.code ?? null,
    sources: [source],
    bonusType: null,
    bonusValue: null,
    expiresAt: null,
    expiryMessage: null,
    imageUrl: null,
    slug: null,
    stale: false,
  };
}

function mergeEntries(legs: Array<{ key: BonusFeedSourceKey; entries: DailyBonusFeedEntry[] }>): {
  data: DailyBonusFeedEntry[];
  sources: BonusSourceStatus[];
} {
  const byKey = new Map<string, DailyBonusFeedEntry>();
  const sources: BonusSourceStatus[] = [];

  for (const leg of legs) {
    sources.push({
      key: leg.key,
      label: SOURCE_LABELS[leg.key],
      available: leg.entries.length > 0,
      count: leg.entries.length,
      updatedAt: leg.entries[0]?.verified ?? null,
      detail: leg.entries.length ? `${leg.entries.length} rows` : 'empty',
    });
    for (const entry of leg.entries) {
      const key = normalizeBonusKey(entry);
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, entry);
        continue;
      }
      const existingTs = Date.parse(existing.verified);
      const nextTs = Date.parse(entry.verified);
      const winner = nextTs >= existingTs ? entry : existing;
      const loser = winner === entry ? existing : entry;
      byKey.set(key, {
        ...winner,
        sources: [...new Set([...winner.sources, ...loser.sources])],
        stale: Boolean(winner.stale || loser.stale),
        code: winner.code ?? loser.code,
        bonusType: winner.bonusType ?? loser.bonusType,
        expiresAt: winner.expiresAt ?? loser.expiresAt,
        slug: winner.slug ?? loser.slug,
      });
    }
  }

  const data = [...byKey.values()].sort(
    (a, b) => Date.parse(b.verified) - Date.parse(a.verified),
  );
  return { data, sources };
}

export async function buildDailyBonusFeed(options?: {
  bonusType?: string | null;
}): Promise<DailyBonusFeedResult> {
  const livePromos = getLiveDailyPromos().map(fromPromo);
  const inbox = getActiveEmailBonusEntries().map(fromEmail);
  const collectClock = (await loadCollectClock()).map((e) => fromRaw(e, 'collectclock'));
  const local = collectClock.length ? [] : loadLocalFallback().map((e) => fromRaw(e, 'local-fallback'));

  let { data, sources } = mergeEntries([
    { key: 'daily-promos', entries: livePromos },
    { key: 'email-inbox', entries: inbox },
    { key: 'collectclock', entries: collectClock },
    { key: 'local-fallback', entries: local },
  ]);

  const typeFilter = options?.bonusType?.trim().toLowerCase();
  if (typeFilter && typeFilter !== 'all') {
    data = data.filter((row) => (row.bonusType || '').toLowerCase() === typeFilter);
  }

  return {
    updatedAt: new Date().toISOString(),
    total: data.length,
    data,
    sources,
  };
}

export function __testables() {
  return { normalizeKey, normalizeBonusKey, mergeEntries, fromRaw };
}
