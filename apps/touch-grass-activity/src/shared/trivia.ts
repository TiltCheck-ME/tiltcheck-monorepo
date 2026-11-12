// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// Group trivia. Self-running: anyone in the instance taps Start, no host needed.
// Pure and serializable: the worker Durable Object and the guest room run this exact code.
//
// Rules:
// - 10 questions per game, 4 choices each, drawn without repeats per instance (the used list
//   resets only once the bank runs dry).
// - 15 s answer window, then a 4 s reveal, then the next question. The window closes early once
//   every connected player has locked an answer.
// - Correct = 100 points plus up to 50 for speed (linear on time left). Wrong or no answer = 0.
// - Late joiners spectate the question in flight and are dealt in at the next question.
// - Away players stay on the board and score 0 for anything they miss.
// - The correct choice lives only in server state until the reveal. Points are bragging rights only.

import { TRIVIA_BANK, triviaById } from './triviaBank.js';
import { shuffle, type Rng } from './rng.js';

export const QUESTIONS_PER_GAME = 10;
export const ANSWER_MS = 15_000;
export const REVEAL_MS = 4_000;
export const BASE_POINTS = 100;
export const SPEED_POINTS = 50;

export type TriviaPhase = 'idle' | 'question' | 'reveal' | 'over';

export interface TriviaLive {
  id: string;
  text: string;
  /** Shuffled per draw so the right answer is not always in the same slot. */
  choices: string[];
  correct: number;
  startedAt: number;
  endsAt: number;
}

export interface TriviaAnswer {
  choice: number;
  at: number;
}

export interface TriviaPlayerResult {
  id: string;
  choice: number | null;
  correct: boolean;
  points: number;
}

export interface TriviaReveal {
  questionId: string;
  index: number;
  text: string;
  choices: string[];
  correct: number;
  counts: number[];
  results: TriviaPlayerResult[];
}

export interface TriviaState {
  phase: TriviaPhase;
  game: number;
  /** 0-based index of the current question inside this game. */
  index: number;
  total: number;
  questionIds: string[];
  used: string[];
  current: TriviaLive | null;
  revealEndsAt: number | null;
  scores: Record<string, number>;
  answers: Record<string, TriviaAnswer>;
  lastReveal: TriviaReveal | null;
  startedBy: string | null;
}

export type TriviaResult = { ok: true } | { ok: false; code: string; message: string };
const ok: TriviaResult = { ok: true };
const fail = (code: string, message: string): TriviaResult => ({ ok: false, code, message });

export function createTrivia(): TriviaState {
  return {
    phase: 'idle',
    game: 0,
    index: 0,
    total: QUESTIONS_PER_GAME,
    questionIds: [],
    used: [],
    current: null,
    revealEndsAt: null,
    scores: {},
    answers: {},
    lastReveal: null,
    startedBy: null,
  };
}

export function isRunning(s: TriviaState): boolean {
  return s.phase === 'question' || s.phase === 'reveal';
}

export function speedPoints(answeredAt: number, startedAt: number, endsAt: number): number {
  const window = endsAt - startedAt;
  if (window <= 0) return 0;
  const left = Math.min(window, Math.max(0, endsAt - answeredAt));
  return Math.round((SPEED_POINTS * left) / window);
}

function draw(s: TriviaState, rng: Rng, n: number): string[] {
  const used = new Set(s.used);
  let pool = TRIVIA_BANK.filter((q) => !used.has(q.id)).map((q) => q.id);
  if (pool.length < n) {
    // Bank ran dry for this instance: start over, but keep the leftovers first.
    const fresh = shuffle(pool, rng);
    const rest = shuffle(
      TRIVIA_BANK.map((q) => q.id).filter((id) => !fresh.includes(id)),
      rng,
    );
    s.used = [];
    pool = [...fresh, ...rest];
    const picked = pool.slice(0, n);
    s.used.push(...picked);
    return picked;
  }
  const picked = shuffle(pool, rng).slice(0, n);
  s.used.push(...picked);
  return picked;
}

/**
 * Start (or restart) a game. `activeIds` are members who are connected right now; they are the
 * opening players.
 */
export function start(s: TriviaState, by: string, now: number, rng: Rng, activeIds: readonly string[]): TriviaResult {
  if (isRunning(s)) return fail('already-running', 'Trivia is already running.');
  const ids = draw(s, rng, QUESTIONS_PER_GAME);
  s.game += 1;
  s.index = 0;
  s.total = ids.length;
  s.questionIds = ids;
  s.scores = {};
  for (const id of new Set([by, ...activeIds])) s.scores[id] = 0;
  s.lastReveal = null;
  s.startedBy = by;
  openQuestion(s, now, rng, []);
  return ok;
}

function openQuestion(s: TriviaState, now: number, rng: Rng, activeIds: readonly string[]): void {
  // Late joiners are dealt in here, at the start of a question.
  for (const id of activeIds) if (s.scores[id] === undefined) s.scores[id] = 0;
  const q = triviaById(s.questionIds[s.index] ?? '');
  if (!q) {
    finish(s);
    return;
  }
  const order = shuffle([0, 1, 2, 3], rng);
  s.current = {
    id: q.id,
    text: q.q,
    choices: order.map((i) => q.choices[i] as string),
    correct: order.indexOf(q.answer),
    startedAt: now,
    endsAt: now + ANSWER_MS,
  };
  s.answers = {};
  s.revealEndsAt = null;
  s.phase = 'question';
}

function finish(s: TriviaState): void {
  s.phase = 'over';
  s.current = null;
  s.answers = {};
  s.revealEndsAt = null;
}

function closeQuestion(s: TriviaState, now: number): void {
  const c = s.current;
  if (!c) return;
  const counts = c.choices.map(() => 0);
  const results: TriviaPlayerResult[] = [];
  for (const id of Object.keys(s.scores)) {
    const a = s.answers[id];
    if (a) counts[a.choice] = (counts[a.choice] ?? 0) + 1;
    const correct = Boolean(a && a.choice === c.correct);
    const points = correct && a ? BASE_POINTS + speedPoints(a.at, c.startedAt, c.endsAt) : 0;
    s.scores[id] = (s.scores[id] ?? 0) + points;
    results.push({ id, choice: a ? a.choice : null, correct, points });
  }
  s.lastReveal = { questionId: c.id, index: s.index, text: c.text, choices: [...c.choices], correct: c.correct, counts, results };
  s.phase = 'reveal';
  s.revealEndsAt = now + REVEAL_MS;
}

/** One locked answer per player per question, inside the window, for the question in flight. */
export function answer(s: TriviaState, playerId: string, questionId: string, choice: number, now: number): TriviaResult {
  if (s.phase !== 'question' || !s.current) return fail('not-open', 'No question open right now.');
  if (questionId !== s.current.id) return fail('stale-question', 'That question already closed.');
  if (s.scores[playerId] === undefined) return fail('spectating', 'You are in from the next question.');
  if (!Number.isInteger(choice) || choice < 0 || choice >= s.current.choices.length) return fail('bad-choice', 'Pick one of the four.');
  if (now >= s.current.endsAt) return fail('too-late', 'Too slow. Window closed.');
  if (s.answers[playerId]) return fail('already-answered', 'Answer is locked. No take-backs.');
  s.answers[playerId] = { choice, at: now };
  return ok;
}

/**
 * Time-based transitions. `activeIds` are connected members (away players excluded).
 * Returns true when anything changed.
 */
export function tick(s: TriviaState, now: number, rng: Rng, activeIds: readonly string[]): boolean {
  let changed = false;
  for (let guard = 0; guard < 4; guard += 1) {
    if (s.phase === 'question' && s.current) {
      const waitingOn = activeIds.filter((id) => s.scores[id] !== undefined && !s.answers[id]);
      const anyActive = activeIds.some((id) => s.scores[id] !== undefined);
      if (now >= s.current.endsAt || (anyActive && waitingOn.length === 0)) {
        closeQuestion(s, now);
        changed = true;
        continue;
      }
    } else if (s.phase === 'reveal' && s.revealEndsAt !== null && now >= s.revealEndsAt) {
      if (s.index + 1 >= s.total) finish(s);
      else {
        s.index += 1;
        openQuestion(s, now, rng, activeIds);
      }
      changed = true;
      continue;
    }
    break;
  }
  return changed;
}

/** Next time the host must wake to keep the game moving. */
export function nextWake(s: TriviaState): number | null {
  if (s.phase === 'question' && s.current) return s.current.endsAt;
  if (s.phase === 'reveal') return s.revealEndsAt;
  return null;
}

/** Sit out: drop off the board. */
export function leave(s: TriviaState, playerId: string): TriviaResult {
  if (s.scores[playerId] === undefined) return fail('not-playing', 'You are not on the board.');
  removePlayer(s, playerId);
  return ok;
}

export function removePlayer(s: TriviaState, playerId: string): void {
  delete s.scores[playerId];
  delete s.answers[playerId];
}

export function standings(s: TriviaState): Array<{ id: string; score: number }> {
  return Object.entries(s.scores)
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}

export function winners(s: TriviaState): string[] {
  const board = standings(s);
  const top = board[0]?.score;
  if (top === undefined || top <= 0) return [];
  return board.filter((x) => x.score === top).map((x) => x.id);
}
