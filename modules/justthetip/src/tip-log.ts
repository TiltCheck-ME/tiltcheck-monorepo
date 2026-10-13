// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-12
/**
 * Tip log — append-only record of every tip and Rain sent or received.
 * Primary storage: JSON file (./data/tip-log.json) for hackathon / offline dev.
 * No custody, no balances, no private keys stored.
 */

import fs from 'node:fs';
import path from 'node:path';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TipLogEntry {
  id: string;
  timestamp: number; // unix seconds
  fromWallet: string;
  toWallet: string;
  amountUsdc: number;
  txSignature: string;
  platform: 'discord' | 'bink' | 'web' | 'api' | string;
  gameContext?: string; // e.g. "pragmatic:plinko"
}

export interface TipTotals {
  byDay: Record<string, number>;   // "YYYY-MM-DD" -> USDC sum
  byGame: Record<string, number>;  // gameContext -> USDC sum
  totalUsdc: number;
}

// ── Storage path ──────────────────────────────────────────────────────────────

function logPath(): string {
  return path.resolve(
    process.env.JTT_LOG_PATH ?? path.join(process.cwd(), 'data', 'tip-log.json'),
  );
}

function readAll(): TipLogEntry[] {
  try {
    const p = logPath();
    if (!fs.existsSync(p)) return [];
    const raw = fs.readFileSync(p, 'utf8');
    return JSON.parse(raw) as TipLogEntry[];
  } catch {
    return [];
  }
}

function writeAll(entries: TipLogEntry[]): void {
  const p = logPath();
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(p, JSON.stringify(entries, null, 2), 'utf8');
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Record a tip. Idempotent by txSignature — duplicate calls are ignored.
 */
export function recordTip(entry: Omit<TipLogEntry, 'id'>): TipLogEntry {
  const entries = readAll();
  const existing = entries.find((e) => e.txSignature === entry.txSignature);
  if (existing) return existing;

  const newEntry: TipLogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ...entry,
  };
  entries.push(newEntry);
  writeAll(entries);
  return newEntry;
}

/**
 * Get all tips for a wallet (as sender or recipient).
 */
export function getTipsForWallet(wallet: string): TipLogEntry[] {
  return readAll().filter(
    (e) => e.fromWallet === wallet || e.toWallet === wallet,
  );
}

/**
 * Get tips sent BY a wallet in the last N seconds.
 */
export function getRecentSentTips(wallet: string, windowSecs: number): TipLogEntry[] {
  const cutoff = Math.floor(Date.now() / 1000) - windowSecs;
  return readAll().filter(
    (e) => e.fromWallet === wallet && e.timestamp >= cutoff,
  );
}

/**
 * Aggregate totals by day and by game for a wallet.
 */
export function getTipTotals(wallet: string): TipTotals {
  const entries = getTipsForWallet(wallet);
  const byDay: Record<string, number> = {};
  const byGame: Record<string, number> = {};
  let totalUsdc = 0;

  for (const e of entries) {
    const day = new Date(e.timestamp * 1000).toISOString().slice(0, 10);
    byDay[day] = (byDay[day] ?? 0) + e.amountUsdc;
    if (e.gameContext) {
      byGame[e.gameContext] = (byGame[e.gameContext] ?? 0) + e.amountUsdc;
    }
    totalUsdc += e.amountUsdc;
  }

  return { byDay, byGame, totalUsdc };
}
