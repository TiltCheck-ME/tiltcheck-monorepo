// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// Daily Grass: one 5-letter word a day, six guesses, green / yellow / gray tiles. Solo: every
// player has their own board, even in a shared room. Pure and storage-agnostic: the worker runs it
// inside the SCORES Durable Object (one instance per player for boards and stats, one per server for
// "Today's solvers"), guest mode runs it in the browser on a practice word list.
//
// Rules:
// - The day turns at midnight America/Chicago, like the high-score week.
// - Everyone gets the same word that day: a salted shuffle of the answer list, walked one step per
//   day. The salt is a worker secret (DAILY_SALT), so nobody can work out tomorrow from the client.
// - The answer only ever leaves the server once that player's game is over (won or out of guesses).
// - Stats per Discord user: played, wins, current / best streak, guess distribution.
// - Today's solvers (per server): fewest guesses, then fastest time from opening the board.

import { dayKeyFor, dayNumberFor, type BookStorage } from './scores.js';
import { makeRng, shuffle } from './rng.js';

export const WORD_LEN = 5;
export const MAX_GUESSES = 6;
export const SOLVERS_SHOWN = 10;
/** Chicago day number of 2026-11-11, so 2026-11-12 (launch) is puzzle #1. */
export const DAILY_EPOCH_DAY = 20768;

/** The human puzzle number shown in the header and the share text. */
export function puzzleNumber(dayNumber: number): number {
  return dayNumber - DAILY_EPOCH_DAY;
}
const SOLVERS_KEPT = 50;

/** g = right letter, right spot; y = in the word, wrong spot; b = not in the word (gray). */
export type Tile = 'g' | 'y' | 'b';

export interface DailyBoard {
  day: string;
  dayNumber: number;
  guesses: string[];
  colors: Tile[][];
  status: 'playing' | 'won' | 'lost';
  startedAt: number;
  finishedAt: number | null;
}

export interface DailyStats {
  played: number;
  wins: number;
  current: number;
  best: number;
  /** dist[i] = wins in i+1 guesses. */
  dist: number[];
  lastWinDay: number | null;
  lastPlayedDay: number | null;
}

export interface DailyRecord {
  board: DailyBoard | null;
  stats: DailyStats;
}

/** What a player's own client may see. `answer` is null until their game is over. */
export interface DailyPublic {
  day: string;
  dayNumber: number;
  rows: Array<{ word: string; colors: Tile[] }>;
  status: DailyBoard['status'];
  answer: string | null;
  startedAt: number;
  finishedAt: number | null;
  stats: DailyStats;
}

export interface SolverRow {
  id: string;
  name: string;
  avatar: string | null;
  guesses: number;
  ms: number;
  at: number;
}

export type DailyResult = { ok: true; record: DailyPublic; justFinished: boolean } | { ok: false; code: string; message: string };

export function emptyStats(): DailyStats {
  return { played: 0, wins: 0, current: 0, best: 0, dist: [0, 0, 0, 0, 0, 0], lastWinDay: null, lastPlayedDay: null };
}

// ---------- tile colors ----------

/**
 * Wordle coloring with repeated letters handled properly: greens first, then each remaining guess
 * letter is yellow only while the answer still has an unmatched copy of it, else gray.
 */
export function colorize(guess: string, answer: string): Tile[] {
  const out: Tile[] = Array.from({ length: WORD_LEN }, () => 'b' as Tile);
  const left: Record<string, number> = {};
  for (let i = 0; i < WORD_LEN; i += 1) {
    const a = answer[i] as string;
    if (guess[i] === a) out[i] = 'g';
    else left[a] = (left[a] ?? 0) + 1;
  }
  for (let i = 0; i < WORD_LEN; i += 1) {
    if (out[i] === 'g') continue;
    const g = guess[i] as string;
    if ((left[g] ?? 0) > 0) {
      out[i] = 'y';
      left[g] = (left[g] as number) - 1;
    }
  }
  return out;
}

// ---------- the daily pick ----------

/** Plain synchronous SHA-256 (hex). Only used to turn the salt into a shuffle start. */
export function sha256Hex(text: string): string {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe,
    0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
    0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
    0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];
  const bytes = Array.from(new TextEncoder().encode(text));
  const bitLen = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  for (let i = 7; i >= 0; i -= 1) bytes.push(i >= 4 ? 0 : (bitLen >>> (i * 8)) & 0xff);
  const h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const w = new Array<number>(64);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));
  for (let off = 0; off < bytes.length; off += 64) {
    for (let i = 0; i < 16; i += 1) w[i] = ((bytes[off + i * 4]! << 24) | (bytes[off + i * 4 + 1]! << 16) | (bytes[off + i * 4 + 2]! << 8) | bytes[off + i * 4 + 3]!) >>> 0;
    for (let i = 16; i < 64; i += 1) {
      const a = w[i - 15]!;
      const b = w[i - 2]!;
      const s0 = rotr(a, 7) ^ rotr(a, 18) ^ (a >>> 3);
      const s1 = rotr(b, 17) ^ rotr(b, 19) ^ (b >>> 10);
      w[i] = (w[i - 16]! + s0 + w[i - 7]! + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h as [number, number, number, number, number, number, number, number];
    for (let i = 0; i < 64; i += 1) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + K[i]! + w[i]!) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      hh = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }
    h[0] = (h[0]! + a) >>> 0;
    h[1] = (h[1]! + b) >>> 0;
    h[2] = (h[2]! + c) >>> 0;
    h[3] = (h[3]! + d) >>> 0;
    h[4] = (h[4]! + e) >>> 0;
    h[5] = (h[5]! + f) >>> 0;
    h[6] = (h[6]! + g) >>> 0;
    h[7] = (h[7]! + hh) >>> 0;
  }
  return h.map((x) => x.toString(16).padStart(8, '0')).join('');
}

const orderCache = new Map<string, number[]>();

/**
 * The answer for a Chicago day number. The salt picks a fixed shuffle of the list and each day takes
 * the next slot, so no word repeats until the whole list has been used. Same salt + day = same word.
 */
export function answerFor(dayNumber: number, salt: string, answers: readonly string[]): string {
  if (!answers.length) throw new Error('no answers');
  const key = `${answers.length}:${salt}`;
  let order = orderCache.get(key);
  if (!order) {
    const start = parseInt(sha256Hex(`daily-grass:${salt}`).slice(0, 8), 16);
    order = shuffle(
      answers.map((_, i) => i),
      makeRng(start),
    );
    orderCache.set(key, order);
  }
  const slot = ((dayNumber % answers.length) + answers.length) % answers.length;
  return answers[order[slot] as number] as string;
}

// ---------- streaks ----------

/** Streak as of `today`: a streak survives only if the last win was today or yesterday. */
export function effectiveStreak(stats: DailyStats, today: number): number {
  return stats.lastWinDay !== null && stats.lastWinDay >= today - 1 ? stats.current : 0;
}

/** Record a finished board in the stats. Called once per board. */
export function applyFinish(stats: DailyStats, board: DailyBoard): void {
  stats.played += 1;
  stats.lastPlayedDay = board.dayNumber;
  if (board.status === 'won') {
    stats.wins += 1;
    const n = board.guesses.length;
    stats.dist[n - 1] = (stats.dist[n - 1] ?? 0) + 1;
    stats.current = stats.lastWinDay === board.dayNumber - 1 ? stats.current + 1 : 1;
    stats.lastWinDay = board.dayNumber;
    stats.best = Math.max(stats.best, stats.current);
  } else {
    stats.current = 0;
  }
}

export function toPublic(board: DailyBoard, stats: DailyStats, answer: string | null): DailyPublic {
  const over = board.status !== 'playing';
  return {
    day: board.day,
    dayNumber: board.dayNumber,
    rows: board.guesses.map((word, i) => ({ word, colors: [...(board.colors[i] ?? [])] })),
    status: board.status,
    answer: over ? answer : null,
    startedAt: board.startedAt,
    finishedAt: board.finishedAt,
    stats: { ...stats, dist: [...stats.dist], current: effectiveStreak(stats, board.dayNumber) },
  };
}

export interface DailyRules {
  salt: string;
  answers: readonly string[];
  isValid: (word: string) => boolean;
}

const recordKey = (id: string) => `daily:u:${id}`;

/** One player's boards and stats on a key/value store. */
export class DailyBook {
  constructor(
    private readonly storage: BookStorage,
    private readonly rules: DailyRules,
  ) {}

  private answer(dayNumber: number): string {
    return answerFor(dayNumber, this.rules.salt, this.rules.answers);
  }

  private async load(userId: string, now: number): Promise<{ rec: DailyRecord; board: DailyBoard; fresh: boolean }> {
    const rec = (await this.storage.get<DailyRecord>(recordKey(userId))) ?? { board: null, stats: emptyStats() };
    const day = dayKeyFor(now);
    if (rec.board && rec.board.day === day) return { rec, board: rec.board, fresh: false };
    const board: DailyBoard = { day, dayNumber: dayNumberFor(now), guesses: [], colors: [], status: 'playing', startedAt: now, finishedAt: null };
    rec.board = board;
    return { rec, board, fresh: true };
  }

  /** Today's board (made on first open; the clock for "fastest" starts here). */
  async open(userId: string, now: number): Promise<DailyResult> {
    const { rec, board, fresh } = await this.load(userId, now);
    if (fresh) await this.storage.put(recordKey(userId), rec);
    return { ok: true, record: toPublic(board, rec.stats, board.status === 'playing' ? null : this.answer(board.dayNumber)), justFinished: false };
  }

  async guess(userId: string, raw: string, now: number): Promise<DailyResult> {
    const word = String(raw).trim().toLowerCase();
    if (!/^[a-z]{5}$/.test(word)) return { ok: false, code: 'bad-guess', message: 'Five letters, A to Z.' };
    const { rec, board } = await this.load(userId, now);
    if (board.status !== 'playing') return { ok: false, code: 'daily-done', message: "You're done for today. New word at midnight Central." };
    if (!this.rules.isValid(word)) return { ok: false, code: 'not-a-word', message: 'Not in the word list.' };
    const answer = this.answer(board.dayNumber);
    const colors = colorize(word, answer);
    board.guesses.push(word);
    board.colors.push(colors);
    let justFinished = false;
    if (word === answer) board.status = 'won';
    else if (board.guesses.length >= MAX_GUESSES) board.status = 'lost';
    if (board.status !== 'playing') {
      board.finishedAt = now;
      applyFinish(rec.stats, board);
      justFinished = true;
    }
    await this.storage.put(recordKey(userId), rec);
    return { ok: true, record: toPublic(board, rec.stats, board.status === 'playing' ? null : answer), justFinished };
  }
}

// ---------- today's solvers (one per server) ----------

export function solverOrder(a: SolverRow, b: SolverRow): number {
  return a.guesses - b.guesses || a.ms - b.ms || a.at - b.at || a.id.localeCompare(b.id);
}

export function validSolver(x: unknown): SolverRow | null {
  if (!x || typeof x !== 'object') return null;
  const r = x as Record<string, unknown>;
  if (typeof r.id !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(r.id)) return null;
  if (typeof r.name !== 'string') return null;
  if (r.avatar !== null && (typeof r.avatar !== 'string' || !/^[A-Za-z0-9_]{1,64}$/.test(r.avatar))) return null;
  if (!Number.isInteger(r.guesses) || (r.guesses as number) < 1 || (r.guesses as number) > MAX_GUESSES) return null;
  if (!Number.isInteger(r.ms) || (r.ms as number) < 0 || (r.ms as number) > 86_400_000 * 2) return null;
  if (typeof r.at !== 'number' || !Number.isFinite(r.at)) return null;
  const name = r.name.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 64) || 'someone';
  return { id: r.id, name, avatar: r.avatar as string | null, guesses: r.guesses as number, ms: r.ms as number, at: r.at as number };
}

interface SolversState {
  day: string;
  rows: SolverRow[];
}

const SOLVERS_KEY = 'daily:solvers';

export class DailySolvers {
  constructor(private readonly storage: BookStorage) {}

  private async load(now: number): Promise<SolversState> {
    const day = dayKeyFor(now);
    const s = await this.storage.get<SolversState>(SOLVERS_KEY);
    return s && s.day === day ? s : { day, rows: [] };
  }

  /** One row per player per day (their solve is final). Returns their rank on today's board. */
  async record(row: SolverRow, now: number): Promise<number | null> {
    const s = await this.load(now);
    const clean = validSolver(row);
    if (!clean) return null;
    if (!s.rows.some((r) => r.id === clean.id)) {
      s.rows.push(clean);
      s.rows.sort(solverOrder);
      if (s.rows.length > SOLVERS_KEPT) s.rows.length = SOLVERS_KEPT;
      await this.storage.put(SOLVERS_KEY, s);
    }
    const i = s.rows.findIndex((r) => r.id === clean.id);
    return i >= 0 ? i + 1 : null;
  }

  async view(now: number): Promise<{ day: string; rows: SolverRow[] }> {
    const s = await this.load(now);
    return { day: s.day, rows: s.rows.slice(0, SOLVERS_SHOWN).map((r) => ({ ...r })) };
  }
}

/** The spoiler-free share grid: one emoji row per guess, no letters. */
export function shareText(name: string, pub: Pick<DailyPublic, 'dayNumber' | 'rows' | 'status'>): string {
  const sq: Record<Tile, string> = { g: String.fromCodePoint(0x1f7e9), y: String.fromCodePoint(0x1f7e8), b: String.fromCodePoint(0x2b1b) };
  const score = pub.status === 'won' ? `${pub.rows.length}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`;
  const grid = pub.rows.map((r) => r.colors.map((c) => sq[c]).join('')).join('\n');
  return `${name} #${puzzleNumber(pub.dayNumber)} ${score}\n${grid}`;
}
