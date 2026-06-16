// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-16
/**
 * Daily Bonus Feed Aggregator
 *
 * Merges CollectClock, email inbox intel, and local fallback bonus data
 * into a single deduplicated feed for US casino discovery surfaces.
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getActiveEmailBonusEntries, type EmailBonusFeedEntry } from './email-bonus-feed.js';

export type BonusFeedSourceKey = 'collectclock' | 'email-inbox' | 'local-fallback';

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
  isUsCasino: boolean;
  casinoCategory: string | null;
  trustScore: number | null;
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
  usTotal: number;
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

interface CasinoCatalogEntry {
  name: string;
  category?: string;
}

const COLLECTCLOCK_BONUS_URL =
  'https://raw.githubusercontent.com/TiltCheck-ME/CollectClock/main/bonus-data.json';

const SOURCE_LABELS: Record<BonusFeedSourceKey, string> = {
  collectclock: 'CollectClock',
  'email-inbox': 'Email inbox',
  'local-fallback': 'Local cache',
};

const API_LIB_DIR = path.dirname(fileURLToPath(import.meta.url));

let usCasinoIndex: Map<string, CasinoCatalogEntry> | null = null;

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
    typeof candidate.brand === 'string'
    && typeof candidate.bonus === 'string'
    && typeof candidate.url === 'string'
    && typeof candidate.verified === 'string'
  );
}

function readJsonArray(filePath: string): unknown[] {
  if (!existsSync(filePath)) return [];
  try {
    const parsed = JSON.parse(readFileSync(filePath, 'utf8')) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function resolveDataDir(): string {
  const candidates = [
    process.env.STATS_DATA_DIR?.trim(),
    path.resolve(process.cwd(), 'data'),
    path.resolve(API_LIB_DIR, '../../../../data'),
    path.resolve(API_LIB_DIR, '../../data'),
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    if (existsSync(path.join(candidate, 'sweepstakes-casinos.json'))) {
      return candidate;
    }
  }

  return path.resolve(process.cwd(), 'data');
}

function loadUsCasinoIndex(): Map<string, CasinoCatalogEntry> {
  if (usCasinoIndex) return usCasinoIndex;

  const index = new Map<string, CasinoCatalogEntry>();
  const dataDir = resolveDataDir();

  for (const entry of readJsonArray(path.join(dataDir, 'sweepstakes-casinos.json'))) {
    if (!entry || typeof entry !== 'object') continue;
    const name = (entry as CasinoCatalogEntry).name;
    if (!name) continue;
    index.set(normalizeKey(name), {
      name,
      category: (entry as CasinoCatalogEntry).category ?? 'Sweeps',
    });
  }

  for (const entry of readJsonArray(path.join(dataDir, 'online-casinos.json'))) {
    if (!entry || typeof entry !== 'object') continue;
    const candidate = entry as CasinoCatalogEntry & { category?: string };
    if (!candidate.name) continue;
    if (candidate.category === 'Regulated' || candidate.category === 'Sweeps Hybrid') {
      index.set(normalizeKey(candidate.name), {
        name: candidate.name,
        category: candidate.category,
      });
    }
  }

  if (index.size > 0) {
    usCasinoIndex = index;
  }

  return index;
}

function resolveUsCasino(brand: string, url: string): { isUsCasino: boolean; casinoCategory: string | null } {
  const index = loadUsCasinoIndex();
  const normalizedBrand = normalizeKey(brand);

  if (normalizedBrand) {
    for (const [key, entry] of index.entries()) {
      if (normalizedBrand.includes(key) || key.includes(normalizedBrand)) {
        return { isUsCasino: true, casinoCategory: entry.category ?? null };
      }
    }
  }

  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.endsWith('.us') || hostname.includes('stake.us')) {
      return { isUsCasino: true, casinoCategory: 'US Domain' };
    }
  } catch {
    // ignore invalid URLs
  }

  return { isUsCasino: false, casinoCategory: null };
}

let cachedLocalFallback: RawBonusEntry[] | null = null;

function readLocalFallbackBonuses(): RawBonusEntry[] {
  if (cachedLocalFallback) return cachedLocalFallback;

  const localPath = path.join(resolveDataDir(), 'bonus-data.json');
  const entries = readJsonArray(localPath)
    .filter(isRawBonusEntry)
    .map((entry) => ({
      brand: entry.brand.trim(),
      bonus: entry.bonus.trim(),
      url: entry.url.trim(),
      verified: entry.verified,
      code: entry.code ?? null,
    }));

  if (entries.length > 0) {
    cachedLocalFallback = entries;
  }

  return entries;
}

async function fetchCollectClockBonuses(): Promise<{
  entries: RawBonusEntry[];
  updatedAt: string | null;
}> {
  try {
    const response = await fetch(COLLECTCLOCK_BONUS_URL, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      return { entries: [], updatedAt: null };
    }

    const data = await response.json();
    const entries = Array.isArray(data)
      ? data.filter(isRawBonusEntry).map((entry) => ({
          brand: entry.brand.trim(),
          bonus: entry.bonus.trim(),
          url: entry.url.trim(),
          verified: entry.verified,
          code: entry.code ?? null,
        }))
      : [];

    return {
      entries,
      updatedAt: entries[0]?.verified ?? null,
    };
  } catch (error) {
    console.error('[CollectClock] Failed to fetch or parse bonuses:', error);
    return { entries: [], updatedAt: null };
  }
}

function toDailyEntry(
  base: RawBonusEntry,
  source: BonusFeedSourceKey,
  inboxMeta?: EmailBonusFeedEntry,
): DailyBonusFeedEntry {
  const usMeta = resolveUsCasino(base.brand, base.url);
  return {
    id: normalizeBonusKey(base),
    brand: base.brand,
    bonus: base.bonus,
    url: base.url,
    verified: base.verified,
    code: base.code ?? null,
    sources: [source],
    bonusType: inboxMeta?.bonusType ?? null,
    bonusValue: inboxMeta?.bonusValue ?? null,
    expiresAt: inboxMeta?.expiresAt ?? null,
    expiryMessage: inboxMeta?.expiryMessage ?? null,
    imageUrl: inboxMeta?.imageUrl ?? null,
    isUsCasino: usMeta.isUsCasino,
    casinoCategory: usMeta.casinoCategory,
    trustScore: null,
  };
}

function mergeEntry(
  existing: DailyBonusFeedEntry,
  incoming: DailyBonusFeedEntry,
): DailyBonusFeedEntry {
  const preferIncoming = Date.parse(incoming.verified) >= Date.parse(existing.verified);
  const primary = preferIncoming ? incoming : existing;
  const secondary = preferIncoming ? existing : incoming;

  return {
    ...primary,
    sources: [...new Set([...existing.sources, ...incoming.sources])],
    code: primary.code ?? secondary.code,
    bonusType: primary.bonusType ?? secondary.bonusType,
    bonusValue: primary.bonusValue ?? secondary.bonusValue,
    expiresAt: primary.expiresAt ?? secondary.expiresAt,
    expiryMessage: primary.expiryMessage ?? secondary.expiryMessage,
    imageUrl: primary.imageUrl ?? secondary.imageUrl,
    isUsCasino: existing.isUsCasino || incoming.isUsCasino,
    casinoCategory: primary.casinoCategory ?? secondary.casinoCategory,
    trustScore: primary.trustScore ?? secondary.trustScore,
  };
}

function buildSourceStatus(
  key: BonusFeedSourceKey,
  entries: readonly DailyBonusFeedEntry[],
  available: boolean,
  updatedAt: string | null,
  detail: string,
): BonusSourceStatus {
  const count = entries.filter((entry) => entry.sources.includes(key)).length;
  return {
    key,
    label: SOURCE_LABELS[key],
    available: available && count > 0,
    count,
    updatedAt,
    detail,
  };
}

export async function buildDailyBonusFeed(options?: {
  usOnly?: boolean;
}): Promise<DailyBonusFeedResult> {
  const usOnly = options?.usOnly ?? false;
  const [collectClock, inboxEntries] = await Promise.all([
    fetchCollectClockBonuses(),
    Promise.resolve(getActiveEmailBonusEntries()),
  ]);
  const localFallback = readLocalFallbackBonuses();

  const merged = new Map<string, DailyBonusFeedEntry>();

  const ingest = (entry: RawBonusEntry, source: BonusFeedSourceKey, inboxMeta?: EmailBonusFeedEntry) => {
    const daily = toDailyEntry(entry, source, inboxMeta);
    const existing = merged.get(daily.id);
    merged.set(daily.id, existing ? mergeEntry(existing, daily) : daily);
  };

  for (const entry of localFallback) {
    ingest(entry, 'local-fallback');
  }

  for (const entry of collectClock.entries) {
    ingest(entry, 'collectclock');
  }

  for (const entry of inboxEntries) {
    ingest(
      {
        brand: entry.brand,
        bonus: entry.bonus,
        url: entry.url,
        verified: entry.verified,
        code: entry.code,
      },
      'email-inbox',
      entry,
    );
  }

  let data = [...merged.values()].sort(
    (left, right) => Date.parse(right.verified) - Date.parse(left.verified),
  );

  if (usOnly) {
    data = data.filter((entry) => entry.isUsCasino);
  }

  const allEntries = [...merged.values()];
  const sources: BonusSourceStatus[] = [
    buildSourceStatus(
      'email-inbox',
      allEntries,
      inboxEntries.length > 0,
      inboxEntries[0]?.verified ?? null,
      inboxEntries.length > 0
        ? `${inboxEntries.length} inbox promos parsed`
        : 'No active inbox promos',
    ),
    buildSourceStatus(
      'collectclock',
      allEntries,
      collectClock.entries.length > 0,
      collectClock.updatedAt,
      collectClock.entries.length > 0
        ? `${collectClock.entries.length} CollectClock entries`
        : 'CollectClock unreachable',
    ),
    buildSourceStatus(
      'local-fallback',
      allEntries,
      localFallback.length > 0,
      localFallback[0]?.verified ?? null,
      localFallback.length > 0
        ? `${localFallback.length} cached entries`
        : 'No local cache',
    ),
  ];

  return {
    updatedAt: new Date().toISOString(),
    total: data.length,
    usTotal: allEntries.filter((entry) => entry.isUsCasino).length,
    data,
    sources,
  };
}
