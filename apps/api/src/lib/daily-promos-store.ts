// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-18
/**
 * Daily promo live store loader for the API daily-feed aggregator.
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type PromoSource = 'email-inbox' | 'discord' | 'public-page' | 'collectclock';
export type PromoBonusType = 'free_spins' | 'daily_login' | 'deposit_match' | 'code' | 'other';

export interface DailyPromoRecord {
  id: string;
  brand: string;
  slug: string;
  bonus: string;
  bonusType: PromoBonusType | string;
  code: string | null;
  url: string;
  source: PromoSource | string;
  verified: string;
  asOf: string;
  expiresAt: string | null;
  expiryMessage: string | null;
  imageUrl: string | null;
  status: 'live' | 'proposed' | 'rejected' | 'expired' | string;
}

export interface DailyPromosFile {
  copyright?: string;
  updatedAt: string | null;
  promos: DailyPromoRecord[];
}

const STALE_MS = 7 * 86400000;
const DROP_MS = 14 * 86400000;

const API_LIB_DIR = path.dirname(fileURLToPath(import.meta.url));

export function getDailyPromosLivePath(): string {
  return (
    process.env.DAILY_PROMOS_LIVE_PATH?.trim() ||
    path.resolve(API_LIB_DIR, '../../../../data/trust-engine/daily-promos.live.json')
  );
}

export function isPromoExpired(entry: DailyPromoRecord, now = Date.now()): boolean {
  if (!entry.expiresAt) return false;
  const t = Date.parse(entry.expiresAt);
  return Number.isFinite(t) && t < now;
}

export function isPromoStale(entry: DailyPromoRecord, now = Date.now()): boolean {
  if (isPromoExpired(entry, now)) return false;
  const verified = Date.parse(entry.verified || entry.asOf || '');
  if (!Number.isFinite(verified)) return true;
  return now - verified > STALE_MS;
}

function shouldDrop(entry: DailyPromoRecord, now = Date.now()): boolean {
  if (isPromoExpired(entry, now)) return true;
  const verified = Date.parse(entry.verified || entry.asOf || '');
  if (!Number.isFinite(verified)) return true;
  return now - verified > DROP_MS;
}

export function readDailyPromosLive(filePath = getDailyPromosLivePath()): DailyPromosFile {
  if (!existsSync(filePath)) {
    return { updatedAt: null, promos: [] };
  }
  try {
    const parsed = JSON.parse(readFileSync(filePath, 'utf8')) as Partial<DailyPromosFile>;
    return {
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null,
      promos: Array.isArray(parsed.promos) ? (parsed.promos as DailyPromoRecord[]) : [],
    };
  } catch {
    return { updatedAt: null, promos: [] };
  }
}

/** Live-visible promos for the public feed. */
export function getLiveDailyPromos(filePath = getDailyPromosLivePath()): DailyPromoRecord[] {
  const now = Date.now();
  const { promos } = readDailyPromosLive(filePath);
  return promos
    .filter((p) => p && p.status !== 'rejected' && p.status !== 'proposed')
    .filter((p) => !shouldDrop(p, now))
    .sort((a, b) => Date.parse(b.asOf || b.verified || 0) - Date.parse(a.asOf || a.verified || 0));
}
