/**
 * © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-18
 *
 * Shared helpers for daily promo gather / promote CLIs.
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, '../../..');

export const DEFAULT_LIVE_PATH = path.join(REPO_ROOT, 'data/trust-engine/daily-promos.live.json');
export const DEFAULT_PROPOSALS_PATH = path.join(REPO_ROOT, 'data/trust-engine/daily-promos.proposals.json');
export const DEFAULT_PRIORITY_PATH = path.join(REPO_ROOT, 'docs/ops/daily-promos-priority.json');

const COPYRIGHT = '© 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-18';
const STALE_DAYS = 7;
const DROP_DAYS = 14;

export function normalizeKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

export function dedupeKey(entry) {
  return `${normalizeKey(entry.brand)}::${normalizeKey(entry.bonus)}::${normalizeKey(entry.url)}`;
}

export function promoId(entry) {
  return createHash('sha256').update(dedupeKey(entry)).digest('hex').slice(0, 16);
}

export function inferBonusType(text) {
  const t = String(text || '').toLowerCase();
  if (/free\s*spin|freespin|fs\b/.test(t)) return 'free_spins';
  if (/daily|login\s*bonus|collect/.test(t)) return 'daily_login';
  if (/deposit|match|%/.test(t)) return 'deposit_match';
  if (/code|promo\s*code/.test(t)) return 'code';
  return 'other';
}

export function loadPriority(filePath = DEFAULT_PRIORITY_PATH) {
  const raw = JSON.parse(readFileSync(filePath, 'utf8'));
  const operators = Array.isArray(raw.operators) ? raw.operators : [];
  return operators
    .filter((o) => o && typeof o.slug === 'string' && typeof o.name === 'string')
    .map((o) => ({
      slug: o.slug,
      name: o.name,
      promoUrl: typeof o.promoUrl === 'string' ? o.promoUrl : null,
    }));
}

export function matchAllowlist(brand, priority) {
  const key = normalizeKey(brand);
  return priority.find((o) => normalizeKey(o.name) === key || normalizeKey(o.slug) === key) || null;
}

export function emptyFile() {
  return { copyright: COPYRIGHT, updatedAt: null, promos: [] };
}

export function readPromoFile(filePath) {
  if (!existsSync(filePath)) return emptyFile();
  try {
    const parsed = JSON.parse(readFileSync(filePath, 'utf8'));
    return {
      copyright: typeof parsed.copyright === 'string' ? parsed.copyright : COPYRIGHT,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null,
      promos: Array.isArray(parsed.promos) ? parsed.promos : [],
    };
  } catch {
    return emptyFile();
  }
}

export function writePromoFile(filePath, doc) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  const out = {
    copyright: COPYRIGHT,
    updatedAt: new Date().toISOString(),
    promos: Array.isArray(doc.promos) ? doc.promos : [],
  };
  writeFileSync(filePath, `${JSON.stringify(out, null, 2)}\n`, 'utf8');
  return out;
}

export function isExpired(entry, now = Date.now()) {
  if (!entry?.expiresAt) return false;
  const t = Date.parse(entry.expiresAt);
  return Number.isFinite(t) && t < now;
}

export function isStale(entry, now = Date.now()) {
  if (isExpired(entry, now)) return false;
  const verified = Date.parse(entry?.verified || entry?.asOf || '');
  if (!Number.isFinite(verified)) return true;
  return now - verified > STALE_DAYS * 86400000;
}

export function shouldDrop(entry, now = Date.now()) {
  if (isExpired(entry, now)) return true;
  const verified = Date.parse(entry?.verified || entry?.asOf || '');
  if (!Number.isFinite(verified)) return true;
  return now - verified > DROP_DAYS * 86400000;
}

export function normalizeRecord(partial) {
  const brand = String(partial.brand || '').trim();
  const bonus = String(partial.bonus || '').trim();
  const url = String(partial.url || '').trim();
  if (!brand || !bonus || !url) return null;

  const base = {
    brand,
    bonus,
    url,
    slug: String(partial.slug || '').trim(),
    bonusType: partial.bonusType || inferBonusType(bonus),
    code: partial.code == null || partial.code === '' ? null : String(partial.code),
    source: partial.source || 'other',
    verified: partial.verified || new Date().toISOString().slice(0, 10),
    asOf: partial.asOf || new Date().toISOString(),
    expiresAt: partial.expiresAt || null,
    expiryMessage: partial.expiryMessage || null,
    imageUrl: partial.imageUrl || null,
    status: partial.status || 'live',
  };
  return {
    ...base,
    id: partial.id || promoId(base),
  };
}

/**
 * Upsert by dedupe key. Prefer newer verified timestamp.
 */
export function upsertPromo(promos, incoming) {
  const rec = normalizeRecord(incoming);
  if (!rec) return { promos, changed: false, record: null };
  const key = dedupeKey(rec);
  const next = [...promos];
  const idx = next.findIndex((p) => dedupeKey(p) === key || p.id === rec.id);
  if (idx === -1) {
    next.push(rec);
    return { promos: next, changed: true, record: rec };
  }
  const existing = next[idx];
  const existingTs = Date.parse(existing.asOf || existing.verified || 0);
  const incomingTs = Date.parse(rec.asOf || rec.verified || 0);
  if (incomingTs >= existingTs) {
    next[idx] = { ...existing, ...rec, id: existing.id || rec.id };
    return { promos: next, changed: true, record: next[idx] };
  }
  return { promos: next, changed: false, record: existing };
}

export function filterVisiblePromos(promos, { includeStale = true } = {}) {
  const now = Date.now();
  return (promos || [])
    .filter((p) => p && p.status !== 'rejected' && p.status !== 'proposed')
    .filter((p) => !shouldDrop(p, now))
    .filter((p) => includeStale || !isStale(p, now))
    .sort((a, b) => Date.parse(b.asOf || b.verified || 0) - Date.parse(a.asOf || a.verified || 0));
}
