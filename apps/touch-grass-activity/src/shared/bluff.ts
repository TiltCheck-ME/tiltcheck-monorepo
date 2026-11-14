// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// Bluff: Jamie's "Two Truths and a Lie" (TiltCheck-ME/DegensAgainstDecency,
// src/games/TwoTruthsAndALieGame.js), ported to the Touch Grass room. Pure and serializable: the
// worker Durable Object and the guest room run this exact code. The server is the authority.
//
// Rules:
// - 3 to 8 seated players. Players take turns as teller; every player seated when the game starts
//   tells once (that is the game length). Teller order: random start, then seat order.
// - The teller gets a prompt and writes 3 statements (2 true, 1 lie), marking the lie privately.
//   3 minutes to write while connected.
// - The server shuffles the statements; everyone else gets 30 s to pick the lie. One guess each,
//   the teller cannot guess. The window closes early once every connected guesser has picked.
// - Scoring (Jamie's): 10 points for a correct guess, 5 to the teller per player fooled (a wrong
//   guess; no guess fools nobody).
// - Reveal: the lie and who picked what, then the scoreboard. Moves on after 10 s, or when a seated
//   player taps Next.
// - Late joiners spectate and are seated for the next game.
// - Away teller: the round waits out the room's 3-minute away grace, then is skipped. Away guessers
//   simply miss the round. Under 3 seated players the game pauses with scores kept.
// - The lie lives only in server state (and the teller's own view) until the reveal.

import { BLUFF_PROMPTS } from './bluffPrompts.js';
import { cleanText, charCount, hasSlur } from './textGuard.js';
import { type Rng, randomId, shuffle } from './rng.js';

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 8;
export const STATEMENTS = 3;
export const MAX_STATEMENT_CHARS = 120;
export const WRITE_MS = 180_000;
/** A teller who comes back after the write window ran out (while away) gets this long to finish. */
export const RETURN_WRITE_MS = 60_000;
export const GUESS_MS = 30_000;
export const REVEAL_MS = 10_000;
export const POINTS_CORRECT = 10;
export const POINTS_PER_FOOLED = 5;

export type BluffPhase = 'seating' | 'writing' | 'guessing' | 'reveal' | 'over' | 'paused';

export interface BluffPick {
  id: string;
  pick: number | null;
  correct: boolean;
  points: number;
}

export interface BluffRoundResult {
  round: number;
  tellerId: string;
  prompt: string;
  /** Display order. Null when the round was skipped before the teller wrote anything. */
  statements: string[] | null;
  lie: number | null;
  picks: BluffPick[];
  tellerPoints: number;
  skipped: null | 'teller-left' | 'teller-timeout' | 'not-enough-players';
}

export interface BluffState {
  phase: BluffPhase;
  game: number;
  seats: string[];
  waiting: string[];
  scores: Record<string, number>;
  /** Teller order for this game. */
  order: string[];
  told: string[];
  round: number;
  tellerId: string | null;
  promptId: string | null;
  prompt: string | null;
  promptPile: string[];
  /** Round id: guesses must name the round in flight. */
  rid: string | null;
  statements: string[] | null;
  lie: number | null;
  writeEndsAt: number | null;
  guessEndsAt: number | null;
  revealEndsAt: number | null;
  guesses: Record<string, number>;
  lastRound: BluffRoundResult | null;
  winnerIds: string[];
}

export type BluffResult = { ok: true } | { ok: false; code: string; message: string };
const ok: BluffResult = { ok: true };
const fail = (code: string, message: string): BluffResult => ({ ok: false, code, message });

export function createBluff(): BluffState {
  return {
    phase: 'seating',
    game: 0,
    seats: [],
    waiting: [],
    scores: {},
    order: [],
    told: [],
    round: 0,
    tellerId: null,
    promptId: null,
    prompt: null,
    promptPile: [],
    rid: null,
    statements: null,
    lie: null,
    writeEndsAt: null,
    guessEndsAt: null,
    revealEndsAt: null,
    guesses: {},
    lastRound: null,
    winnerIds: [],
  };
}

export function isInGame(s: BluffState): boolean {
  return s.phase === 'writing' || s.phase === 'guessing' || s.phase === 'reveal';
}

/** Seated players who can guess this round (everyone but the teller). */
export function guessers(s: BluffState): string[] {
  return s.seats.filter((id) => id !== s.tellerId);
}

export function sit(s: BluffState, playerId: string): BluffResult {
  if (s.seats.includes(playerId)) return fail('already-seated', 'Already at the table.');
  if (s.waiting.includes(playerId)) return fail('already-waiting', 'Already in line for the next game.');
  if (s.seats.length + s.waiting.length >= MAX_PLAYERS) return fail('table-full', 'Table is full. 8 max.');
  if (s.phase === 'seating' || s.phase === 'over' || s.phase === 'paused') {
    s.seats.push(playerId);
    if (s.phase === 'paused') {
      s.scores[playerId] ??= 0;
      if (!s.order.includes(playerId)) s.order.push(playerId);
    }
    return ok;
  }
  // Mid-game: spectate, seated for the next game.
  s.waiting.push(playerId);
  return ok;
}

export function stand(s: BluffState, playerId: string, rng: Rng, now: number): BluffResult {
  if (!s.seats.includes(playerId) && !s.waiting.includes(playerId)) return fail('not-seated', 'You are not at the table.');
  removePlayer(s, playerId, rng, now);
  return ok;
}

function drawPrompt(s: BluffState, rng: Rng): void {
  if (s.promptPile.length === 0) s.promptPile = shuffle(BLUFF_PROMPTS.map((p) => p.id), rng);
  const id = s.promptPile.pop() as string;
  const p = BLUFF_PROMPTS.find((x) => x.id === id) ?? (BLUFF_PROMPTS[0] as (typeof BLUFF_PROMPTS)[number]);
  s.promptId = p.id;
  s.prompt = p.text;
}

/** Start a game (seating / over), or resume a paused one. */
export function start(s: BluffState, by: string, now: number, rng: Rng): BluffResult {
  if (s.phase !== 'seating' && s.phase !== 'paused' && s.phase !== 'over') return fail('wrong-phase', 'A game is already running.');
  if (!s.seats.includes(by) && !s.waiting.includes(by)) return fail('not-seated', 'Sit down first.');
  if (s.phase === 'over') {
    // Run it back: whoever waited is seated now.
    while (s.waiting.length && s.seats.length < MAX_PLAYERS) s.seats.push(s.waiting.shift() as string);
  }
  if (!s.seats.includes(by)) return fail('not-seated', 'Sit down first.');
  if (s.seats.length < MIN_PLAYERS) return fail('not-enough-players', `Need ${MIN_PLAYERS} players. You have ${s.seats.length}.`);

  if (s.phase === 'paused') {
    for (const id of s.seats) {
      s.scores[id] ??= 0;
      if (!s.order.includes(id)) s.order.push(id);
    }
    beginRound(s, now, rng);
    return ok;
  }

  s.game += 1;
  s.scores = {};
  for (const id of s.seats) s.scores[id] = 0;
  const first = Math.floor(rng() * s.seats.length);
  s.order = [...s.seats.slice(first), ...s.seats.slice(0, first)];
  s.told = [];
  s.round = 0;
  s.lastRound = null;
  s.winnerIds = [];
  beginRound(s, now, rng);
  return ok;
}

function clearRound(s: BluffState): void {
  s.tellerId = null;
  s.promptId = null;
  s.prompt = null;
  s.rid = null;
  s.statements = null;
  s.lie = null;
  s.writeEndsAt = null;
  s.guessEndsAt = null;
  s.revealEndsAt = null;
  s.guesses = {};
}

function finish(s: BluffState): void {
  clearRound(s);
  s.phase = 'over';
  s.winnerIds = winners(s);
}

/** Next teller up, or game over when everyone has told. */
function beginRound(s: BluffState, now: number, rng: Rng): void {
  clearRound(s);
  if (s.seats.length < MIN_PLAYERS) {
    s.phase = 'paused';
    return;
  }
  const next = s.order.find((id) => s.seats.includes(id) && !s.told.includes(id));
  if (!next) {
    finish(s);
    return;
  }
  s.round += 1;
  s.tellerId = next;
  drawPrompt(s, rng);
  s.rid = randomId(rng, 'r');
  s.writeEndsAt = now + WRITE_MS;
  s.phase = 'writing';
}

/** Validate and clean three statements. Returns the cleaned list or a failure. */
export function checkStatements(raw: readonly string[]): { ok: true; statements: string[] } | { ok: false; code: string; message: string } {
  if (!Array.isArray(raw) || raw.length !== STATEMENTS) return { ok: false, code: 'bad-statements', message: 'Three statements: two truths and a lie.' };
  const out = raw.map((x) => cleanText(typeof x === 'string' ? x : ''));
  if (out.some((x) => x.length === 0)) return { ok: false, code: 'empty-statement', message: 'All three need something in them.' };
  if (out.some((x) => charCount(x) > MAX_STATEMENT_CHARS)) return { ok: false, code: 'too-long', message: `Keep each one under ${MAX_STATEMENT_CHARS} characters.` };
  if (new Set(out.map((x) => x.toLowerCase())).size !== STATEMENTS) return { ok: false, code: 'duplicate-statement', message: 'Use three different statements.' };
  if (out.some((x) => hasSlur(x))) return { ok: false, code: 'blocked-words', message: 'That one has a slur in it. Rewrite it.' };
  return { ok: true, statements: out };
}

/** The teller writes 3 statements and marks the lie (index into what they wrote). */
export function tell(s: BluffState, playerId: string, statements: readonly string[], lie: number, now: number, rng: Rng): BluffResult {
  if (s.phase !== 'writing') return fail('wrong-phase', 'Not taking statements right now.');
  if (playerId !== s.tellerId) return fail('not-teller', "It's not your turn to tell.");
  if (!Number.isInteger(lie) || lie < 0 || lie >= STATEMENTS) return fail('bad-lie', 'Mark which one is the lie.');
  const c = checkStatements(statements);
  if (!c.ok) return fail(c.code, c.message);
  const order = shuffle([0, 1, 2], rng);
  s.statements = order.map((i) => c.statements[i] as string);
  s.lie = order.indexOf(lie);
  s.rid = randomId(rng, 'r');
  s.guesses = {};
  s.writeEndsAt = null;
  s.guessEndsAt = now + GUESS_MS;
  s.phase = 'guessing';
  return ok;
}

/** One guess per player per round, for the round in flight, inside the window. Teller can't guess. */
export function guess(s: BluffState, playerId: string, rid: string, pick: number, now: number): BluffResult {
  if (s.phase !== 'guessing' || !s.statements) return fail('not-open', 'Nothing to guess right now.');
  if (rid !== s.rid) return fail('stale-round', 'That round already closed.');
  if (playerId === s.tellerId) return fail('teller-cannot-guess', "You can't guess your own.");
  if (!s.seats.includes(playerId)) return fail('spectating', "You're spectating. You'll be in next game.");
  if (!Number.isInteger(pick) || pick < 0 || pick >= s.statements.length) return fail('bad-pick', 'Pick one of the three.');
  if (s.guessEndsAt !== null && now >= s.guessEndsAt) return fail('too-late', "Time's up.");
  if (s.guesses[playerId] !== undefined) return fail('already-guessed', 'Guess already locked.');
  s.guesses[playerId] = pick;
  return ok;
}

function closeGuessing(s: BluffState, now: number): void {
  const teller = s.tellerId as string;
  const picks: BluffPick[] = [];
  let fooled = 0;
  for (const id of guessers(s)) {
    const g = s.guesses[id];
    const pick = g === undefined ? null : g;
    const correct = pick !== null && pick === s.lie;
    if (pick !== null && !correct) fooled += 1;
    const points = correct ? POINTS_CORRECT : 0;
    s.scores[id] = (s.scores[id] ?? 0) + points;
    picks.push({ id, pick, correct, points });
  }
  const tellerPoints = fooled * POINTS_PER_FOOLED;
  s.scores[teller] = (s.scores[teller] ?? 0) + tellerPoints;
  s.lastRound = { round: s.round, tellerId: teller, prompt: s.prompt ?? '', statements: [...(s.statements ?? [])], lie: s.lie, picks, tellerPoints, skipped: null };
  s.told.push(teller);
  s.guessEndsAt = null;
  s.revealEndsAt = now + REVEAL_MS;
  s.phase = 'reveal';
}

function skipRound(s: BluffState, why: 'teller-left' | 'teller-timeout', now: number, rng: Rng): void {
  const teller = s.tellerId;
  if (teller) {
    s.lastRound = { round: s.round, tellerId: teller, prompt: s.prompt ?? '', statements: null, lie: null, picks: [], tellerPoints: 0, skipped: why };
    if (!s.told.includes(teller)) s.told.push(teller);
  }
  beginRound(s, now, rng);
}

/** Reveal is done early: any seated player can move the table on. */
export function next(s: BluffState, by: string, now: number, rng: Rng): BluffResult {
  if (s.phase !== 'reveal') return fail('wrong-phase', 'Round is not done.');
  if (!s.seats.includes(by)) return fail('not-seated', 'Spectators wait for the table.');
  beginRound(s, now, rng);
  return ok;
}

/**
 * Time-based transitions. `activeIds` are connected members (away players excluded).
 * Returns true when anything changed.
 */
export function tick(s: BluffState, now: number, rng: Rng, activeIds: readonly string[]): boolean {
  let changed = false;
  for (let guard = 0; guard < 6; guard += 1) {
    if (s.phase === 'writing' && s.tellerId) {
      const tellerHere = activeIds.includes(s.tellerId);
      if (s.writeEndsAt === null) {
        // Window ran out while the teller was away; they are back, so the clock restarts short.
        if (tellerHere) {
          s.writeEndsAt = now + RETURN_WRITE_MS;
          changed = true;
        }
        break;
      }
      if (now >= s.writeEndsAt) {
        if (tellerHere) {
          skipRound(s, 'teller-timeout', now, rng);
        } else {
          // Away teller: hold the round; the room's away grace decides (removal skips the round).
          s.writeEndsAt = null;
        }
        changed = true;
        continue;
      }
    } else if (s.phase === 'guessing' && s.statements) {
      const live = guessers(s).filter((id) => activeIds.includes(id));
      const allIn = live.length > 0 && live.every((id) => s.guesses[id] !== undefined);
      if ((s.guessEndsAt !== null && now >= s.guessEndsAt) || allIn) {
        closeGuessing(s, now);
        changed = true;
        continue;
      }
    } else if (s.phase === 'reveal' && s.revealEndsAt !== null && now >= s.revealEndsAt) {
      beginRound(s, now, rng);
      changed = true;
      continue;
    }
    break;
  }
  return changed;
}

/** Next time the host must wake to keep the game moving. */
export function nextWake(s: BluffState): number | null {
  if (s.phase === 'writing') return s.writeEndsAt;
  if (s.phase === 'guessing') return s.guessEndsAt;
  if (s.phase === 'reveal') return s.revealEndsAt;
  return null;
}

/** Someone left the table or the Activity (stand, leave, or away grace expired). */
export function removePlayer(s: BluffState, playerId: string, rng: Rng, now: number): void {
  s.waiting = s.waiting.filter((id) => id !== playerId);
  const idx = s.seats.indexOf(playerId);
  if (idx === -1) return;
  s.seats.splice(idx, 1);
  delete s.scores[playerId];
  delete s.guesses[playerId];
  s.order = s.order.filter((id) => id !== playerId);
  if (!isInGame(s)) return;

  const wasTeller = s.tellerId === playerId;
  if (wasTeller && (s.phase === 'writing' || s.phase === 'guessing')) {
    // Teller gone: the round is void (nobody scores off it), next teller up.
    s.lastRound = { round: s.round, tellerId: playerId, prompt: s.prompt ?? '', statements: null, lie: null, picks: [], tellerPoints: 0, skipped: 'teller-left' };
    beginRound(s, now, rng);
    return;
  }
  if (s.seats.length < MIN_PLAYERS) {
    if (s.phase !== 'reveal' && s.tellerId) {
      s.lastRound = { round: s.round, tellerId: s.tellerId, prompt: s.prompt ?? '', statements: null, lie: null, picks: [], tellerPoints: 0, skipped: 'not-enough-players' };
      // The teller did not get a fair round: they still tell after the resume.
    }
    clearRound(s);
    s.phase = 'paused';
    return;
  }
  // Guessing: the guesser count dropped; tick() closes the window if everyone left has guessed.
}

export function standings(s: BluffState): Array<{ id: string; score: number }> {
  return s.seats
    .filter((id) => s.scores[id] !== undefined)
    .map((id) => ({ id, score: s.scores[id] as number }))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}

export function winners(s: BluffState): string[] {
  const board = standings(s);
  const top = board[0]?.score;
  if (top === undefined || top <= 0) return [];
  return board.filter((x) => x.score === top).map((x) => x.id);
}
