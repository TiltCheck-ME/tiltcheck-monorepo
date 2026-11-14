// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// Myth or Math: rapid true/false, half gambling myths and real odds, half everyday myths and maths. Solo: each player runs their own
// deck, even in a shared room. Pure and serializable: the worker Durable Object and the guest room
// run this exact code. The server deals, times and scores; the answer (and the "why") only reach
// the player once they've locked in or the clock ran out.
//
// Rules:
// - 10 cards per run, 5 gambling + 5 general, drawn without repeats per player until a kind runs dry.
// - 8 seconds per card. 100 for a right call plus up to 50 for speed (same curve as trivia).
// - After each card: the truth and a one-line why. The player taps Next for the next card.
// - A player who drops mid-card is paused with the time they had left; it resumes on rejoin.

import { MYTH_BANK, mythById, type MythKind } from './mythBank.js';
import { randomId, shuffle, type Rng } from './rng.js';
import type { Brag } from './scores.js';

export const CARDS_PER_RUN = 10;
export const CARD_MS = 8_000;
export const BASE_POINTS = 100;
export const SPEED_POINTS = 50;
/** Runs nobody has touched for this long are dropped from room state. */
export const RUN_TTL_MS = 6 * 60 * 60_000;

export type MythPhase = 'card' | 'reveal' | 'paused' | 'over';

export interface MythAnswer {
  id: string;
  pick: boolean | null;
  correct: boolean;
  points: number;
}

export interface MythRun {
  runId: string;
  ids: string[];
  index: number;
  phase: MythPhase;
  cardStartedAt: number;
  cardEndsAt: number;
  /** ms left on the card when the player dropped. */
  pausedLeft: number | null;
  score: number;
  answers: MythAnswer[];
  touchedAt: number;
  /** High-score bookkeeping once the run is over. */
  board: 'none' | 'pending' | 'posted' | 'off-record';
  brag: Brag | null;
}

export interface MythState {
  runs: Record<string, MythRun>;
  /** Card ids each player has seen lately, so back-to-back runs don't repeat. */
  seen: Record<string, string[]>;
}

export type MythResult = { ok: true } | { ok: false; code: string; message: string };
const ok: MythResult = { ok: true };
const fail = (code: string, message: string): MythResult => ({ ok: false, code, message });

export function createMyth(): MythState {
  return { runs: {}, seen: {} };
}

export function speedPoints(at: number, startedAt: number, endsAt: number): number {
  const window = endsAt - startedAt;
  if (window <= 0) return 0;
  const left = Math.min(window, Math.max(0, endsAt - at));
  return Math.round((SPEED_POINTS * left) / window);
}

export function isPlaying(run: MythRun | undefined): boolean {
  return Boolean(run && (run.phase === 'card' || run.phase === 'reveal' || run.phase === 'paused'));
}

/** Cards of one kind for a run: unseen ones first; when too few are left, that kind starts over. */
function drawKind(s: MythState, userId: string, kind: MythKind, n: number, rng: Rng): string[] {
  const all = MYTH_BANK.filter((c) => c.kind === kind).map((c) => c.id);
  const seen = new Set(s.seen[userId] ?? []);
  let pool = all.filter((id) => !seen.has(id));
  if (pool.length < n) {
    const mine = new Set(all);
    s.seen[userId] = (s.seen[userId] ?? []).filter((id) => !mine.has(id));
    pool = all;
  }
  return shuffle(pool, rng).slice(0, n);
}

/**
 * A run is half gambling cards and half general ones (5 + 5), shuffled together, so it is never all
 * one kind. A run never repeats a card: the two kinds are separate ids, each drawn without repeats.
 * If one kind is short (small guest deck), the other fills the rest.
 */
export function draw(s: MythState, userId: string, rng: Rng): string[] {
  const generalCount = MYTH_BANK.filter((c) => c.kind === 'general').length;
  const general = Math.min(Math.floor(CARDS_PER_RUN / 2), generalCount);
  const gambling = Math.min(CARDS_PER_RUN - general, MYTH_BANK.length - generalCount);
  const ids = shuffle([...drawKind(s, userId, 'gambling', gambling, rng), ...drawKind(s, userId, 'general', general, rng)], rng);
  s.seen[userId] = [...(s.seen[userId] ?? []), ...ids];
  return ids;
}

function openCard(run: MythRun, now: number, ms = CARD_MS): void {
  run.phase = 'card';
  run.cardStartedAt = now - (CARD_MS - ms);
  run.cardEndsAt = now + ms;
  run.pausedLeft = null;
}

export function start(s: MythState, userId: string, now: number, rng: Rng): MythResult {
  const cur = s.runs[userId];
  if (isPlaying(cur)) return fail('already-running', 'Finish this run first.');
  const ids = draw(s, userId, rng);
  const run: MythRun = {
    runId: randomId(rng, 'r'),
    ids,
    index: 0,
    phase: 'card',
    cardStartedAt: now,
    cardEndsAt: now + CARD_MS,
    pausedLeft: null,
    score: 0,
    answers: [],
    touchedAt: now,
    board: 'none',
    brag: null,
  };
  openCard(run, now);
  s.runs[userId] = run;
  return ok;
}

function close(run: MythRun, pick: boolean | null, now: number): void {
  const card = mythById(run.ids[run.index] ?? '');
  const correct = Boolean(card && pick !== null && pick === card.truth);
  const points = correct ? BASE_POINTS + speedPoints(now, run.cardStartedAt, run.cardEndsAt) : 0;
  run.answers.push({ id: card?.id ?? '', pick, correct, points });
  run.score += points;
  run.phase = 'reveal';
}

export function answer(s: MythState, userId: string, runId: string, cardId: string, pick: boolean, now: number): MythResult {
  const run = s.runs[userId];
  if (!run || run.runId !== runId) return fail('no-run', 'Start a run first.');
  if (run.phase !== 'card') return fail('not-open', 'No card open right now.');
  if (run.ids[run.index] !== cardId) return fail('stale-card', 'That card already closed.');
  if (now >= run.cardEndsAt) return fail('too-late', "Time's up.");
  run.touchedAt = now;
  close(run, pick, now);
  return ok;
}

export function next(s: MythState, userId: string, now: number): MythResult {
  const run = s.runs[userId];
  if (!run || run.phase !== 'reveal') return fail('not-reveal', 'Nothing to move on from.');
  run.touchedAt = now;
  if (run.index + 1 >= run.ids.length) {
    run.phase = 'over';
    run.board = 'pending';
    return ok;
  }
  run.index += 1;
  openCard(run, now);
  return ok;
}

/** The player dropped: freeze the card with the time they had left. */
export function pause(s: MythState, userId: string, now: number): boolean {
  const run = s.runs[userId];
  if (!run || run.phase !== 'card') return false;
  run.pausedLeft = Math.max(1_000, run.cardEndsAt - now);
  run.phase = 'paused';
  return true;
}

/** Back from a drop: the card picks up with the time that was left. */
export function resume(s: MythState, userId: string, now: number): boolean {
  const run = s.runs[userId];
  if (!run || run.phase !== 'paused') return false;
  openCard(run, now, run.pausedLeft ?? CARD_MS);
  run.touchedAt = now;
  return true;
}

/** Cards whose clock ran out close as a miss. Stale runs are dropped. Returns true if anything changed. */
export function tick(s: MythState, now: number): boolean {
  let changed = false;
  for (const [id, run] of Object.entries(s.runs)) {
    if (run.phase === 'card' && now >= run.cardEndsAt) {
      close(run, null, now);
      changed = true;
    }
    if (now - run.touchedAt > RUN_TTL_MS && run.phase !== 'card') {
      delete s.runs[id];
      changed = true;
    }
  }
  return changed;
}

export function nextWake(s: MythState): number | null {
  let t: number | null = null;
  for (const run of Object.values(s.runs)) if (run.phase === 'card') t = t === null ? run.cardEndsAt : Math.min(t, run.cardEndsAt);
  return t;
}

export interface MythRevealView {
  id: string;
  text: string;
  truth: boolean;
  why: string;
  pick: boolean | null;
  correct: boolean;
  points: number;
}

export interface MythRunView {
  runId: string;
  phase: MythPhase;
  /** 1-based card number. */
  number: number;
  total: number;
  /** The open card. Never carries the truth or the why. */
  card: { id: string; text: string } | null;
  endsAt: number | null;
  /** The card that just closed (reveal), or the last one (over). */
  reveal: MythRevealView | null;
  score: number;
  correctCount: number;
  results: boolean[];
  board: MythRun['board'];
  brag: Brag | null;
}

/** One player's run, as they may see it. Built field by field so the truth never rides along early. */
export function runView(run: MythRun | undefined): MythRunView | null {
  if (!run) return null;
  const cardId = run.ids[run.index] ?? '';
  const card = mythById(cardId);
  const last = run.answers.at(-1);
  const showReveal = (run.phase === 'reveal' || run.phase === 'over') && last;
  const lastCard = showReveal ? mythById(last.id) : undefined;
  return {
    runId: run.runId,
    phase: run.phase,
    number: run.index + 1,
    total: run.ids.length,
    card: (run.phase === 'card' || run.phase === 'paused') && card ? { id: card.id, text: card.text } : null,
    endsAt: run.phase === 'card' ? run.cardEndsAt : null,
    reveal:
      showReveal && lastCard
        ? { id: lastCard.id, text: lastCard.text, truth: lastCard.truth, why: lastCard.why, pick: last.pick, correct: last.correct, points: last.points }
        : null,
    score: run.score,
    correctCount: run.answers.filter((a) => a.correct).length,
    results: run.answers.map((a) => a.correct),
    board: run.board,
    brag: run.brag,
  };
}
