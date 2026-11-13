// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-13
// Degens Against Decency round logic. Pure and serializable: the worker Durable Object
// and the in-browser guest room both run this exact code. The server is the authority.
//
// Rules (from TiltCheck-ME/DegensAgainstDecency, Card Czar style):
// - 3 to 8 seated players. Everyone but the judge holds 7 white cards in play. The judge gets no
//   hand on screen and no top-up while judging; their cards wait server side for the next round.
// - Judge rotates every round. Everyone else submits one card for the prompt.
// - The judge sees the answers anonymised and shuffled, picks one, its owner scores 1.
// - Every player who played gets their played card replaced from the deck as soon as the judge
//   picks, so the hand is back to 7 on the reveal screen. Fresh draws are flagged for the view.
// - First to targetScore (default 5) wins. The game ends on that pick; no round starts once anyone
//   is at the target. Points are bragging rights only.
// - Late joiners wait as spectators and are dealt in at the start of the next round.
// - A player leaving mid-round drops their card. The judge leaving skips the round.

import { type Card, promptCards, whiteCards, fillPrompt } from './deck.js';
import { type Rng, randomId, shuffle } from './rng.js';

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 8;
export const HAND_SIZE = 7;
export const DEFAULT_TARGET = 5;
export const MIN_TARGET = 1;
export const MAX_TARGET = 15;

export type DadPhase = 'seating' | 'submitting' | 'judging' | 'reveal' | 'over' | 'paused';

export interface DadEntry {
  entryId: string;
  playerId: string;
  card: Card;
}

export interface DadRoundResult {
  round: number;
  prompt: string;
  winnerId: string | null;
  winningText: string | null;
  skipped: null | 'judge-left' | 'not-enough-players';
}

export interface DadState {
  phase: DadPhase;
  targetScore: number;
  seats: string[];
  waiting: string[];
  scores: Record<string, number>;
  hands: Record<string, Card[]>;
  drawPile: Card[];
  discardPile: Card[];
  promptPile: Card[];
  promptDiscard: Card[];
  round: number;
  judgeCursor: number;
  judgeId: string | null;
  prompt: Card | null;
  submissions: Record<string, Card>;
  entries: DadEntry[];
  lastRound: DadRoundResult | null;
  winnerId: string | null;
  /**
   * Card ids each player drew in their latest top-up and has not played since, so the hand can
   * show which cards are new. Optional: rooms stored before this field read as none.
   */
  fresh?: Record<string, string[]>;
}

export type DadResult = { ok: true } | { ok: false; code: string; message: string };

const ok: DadResult = { ok: true };
function fail(code: string, message: string): DadResult {
  return { ok: false, code, message };
}

export function createDad(targetScore = DEFAULT_TARGET): DadState {
  return {
    phase: 'seating',
    targetScore: clampTarget(targetScore),
    seats: [],
    waiting: [],
    scores: {},
    hands: {},
    drawPile: [],
    discardPile: [],
    promptPile: [],
    promptDiscard: [],
    round: 0,
    judgeCursor: -1,
    judgeId: null,
    prompt: null,
    submissions: {},
    entries: [],
    lastRound: null,
    winnerId: null,
    fresh: {},
  };
}

export function clampTarget(n: unknown): number {
  const v = typeof n === 'number' && Number.isFinite(n) ? Math.round(n) : DEFAULT_TARGET;
  return Math.min(MAX_TARGET, Math.max(MIN_TARGET, v));
}

export function isInGame(s: DadState): boolean {
  return s.phase === 'submitting' || s.phase === 'judging' || s.phase === 'reveal';
}

/** Take a seat. Before the game: sit down. Mid-game: queue as a spectator for next round. */
export function sit(s: DadState, playerId: string): DadResult {
  if (s.seats.includes(playerId)) return fail('already-seated', 'Already at the table.');
  if (s.waiting.includes(playerId)) return fail('already-waiting', 'Already in line for next round.');
  if (s.seats.length + s.waiting.length >= MAX_PLAYERS) return fail('table-full', 'Table is full. 8 max.');
  if (s.phase === 'seating' || s.phase === 'paused' || s.phase === 'over') {
    s.seats.push(playerId);
    if (s.phase === 'paused') s.scores[playerId] = s.scores[playerId] ?? 0;
    return ok;
  }
  s.waiting.push(playerId);
  return ok;
}

/** Stand up. Outside a round it just frees the seat; inside a round it is the same as leaving. */
export function stand(s: DadState, playerId: string, rng: Rng): DadResult {
  if (!s.seats.includes(playerId) && !s.waiting.includes(playerId)) {
    return fail('not-seated', 'You are not at the table.');
  }
  removePlayer(s, playerId, rng);
  return ok;
}

export function start(s: DadState, by: string, rng: Rng, targetScore?: number): DadResult {
  if (s.phase !== 'seating' && s.phase !== 'paused' && s.phase !== 'over') {
    return fail('wrong-phase', 'A game is already running.');
  }
  if (!s.seats.includes(by)) return fail('not-seated', 'Sit down first.');
  if (s.seats.length < MIN_PLAYERS) return fail('not-enough-players', `Need ${MIN_PLAYERS} players. You have ${s.seats.length}.`);
  if (s.seats.length > MAX_PLAYERS) return fail('table-full', 'Too many players. 8 max.');

  if (s.phase === 'paused') {
    // Resume: keep scores, deal in anyone who sat down.
    for (const id of s.seats) s.scores[id] = s.scores[id] ?? 0;
    beginRound(s, rng);
    return ok;
  }

  if (targetScore !== undefined) s.targetScore = clampTarget(targetScore);
  s.drawPile = shuffle(whiteCards(), rng);
  s.discardPile = [];
  s.promptPile = shuffle(promptCards(), rng);
  s.promptDiscard = [];
  s.hands = {};
  s.scores = {};
  for (const id of s.seats) {
    s.scores[id] = 0;
    s.hands[id] = [];
  }
  s.round = 0;
  // Opening deal: everyone, the first judge included, so the judge sits on a full hand for later.
  for (const id of s.seats) dealUp(s, id, rng);
  // The opening seven are all new; nothing to point out yet.
  s.fresh = {};
  s.judgeCursor = Math.floor(rng() * s.seats.length) - 1;
  s.lastRound = null;
  s.winnerId = null;
  beginRound(s, rng);
  return ok;
}

function drawWhite(s: DadState, rng: Rng): Card | null {
  if (s.drawPile.length === 0) {
    if (s.discardPile.length === 0) return null;
    s.drawPile = shuffle(s.discardPile, rng);
    s.discardPile = [];
  }
  return s.drawPile.pop() ?? null;
}

function drawPrompt(s: DadState, rng: Rng): Card {
  if (s.promptPile.length === 0) {
    s.promptPile = shuffle(s.promptDiscard.length ? s.promptDiscard : promptCards(), rng);
    s.promptDiscard = [];
  }
  return s.promptPile.pop() as Card;
}

function dealUp(s: DadState, playerId: string, rng: Rng): void {
  const hand = (s.hands[playerId] ??= []);
  const drawn: string[] = [];
  while (hand.length < HAND_SIZE) {
    const c = drawWhite(s, rng);
    if (!c) break;
    hand.push(c);
    drawn.push(c.id);
  }
  if (drawn.length) (s.fresh ??= {})[playerId] = drawn;
}

/** The seated player at or past the target with the most points, if any (ties: seat order). */
export function reachedTarget(s: DadState): string | null {
  let best: string | null = null;
  for (const id of s.seats) {
    const pts = s.scores[id] ?? 0;
    if (pts < s.targetScore) continue;
    if (best === null || pts > (s.scores[best] ?? 0)) best = id;
  }
  return best;
}

function endGame(s: DadState, winnerId: string): void {
  s.phase = 'over';
  s.winnerId = winnerId;
  s.judgeId = null;
  s.submissions = {};
  s.entries = [];
}

function beginRound(s: DadState, rng: Rng): void {
  // Someone already has the target: the game is over, never deal another round.
  const done = reachedTarget(s);
  if (done) {
    endGame(s, done);
    return;
  }
  // Late joiners come in now.
  while (s.waiting.length && s.seats.length < MAX_PLAYERS) {
    const id = s.waiting.shift() as string;
    s.seats.push(id);
    s.scores[id] = s.scores[id] ?? 0;
  }
  if (s.seats.length < MIN_PLAYERS) {
    s.phase = 'paused';
    s.judgeId = null;
    s.prompt = null;
    s.submissions = {};
    s.entries = [];
    return;
  }
  s.round += 1;
  s.judgeCursor = (s.judgeCursor + 1) % s.seats.length;
  s.judgeId = s.seats[s.judgeCursor] ?? null;
  // The judge plays no card this round, so they get no top-up. Whatever they hold stays theirs
  // (server side only; their view shows no hand) and is topped up once the judge moves on.
  for (const id of s.seats) if (id !== s.judgeId) dealUp(s, id, rng);
  if (s.prompt) s.promptDiscard.push(s.prompt);
  s.prompt = drawPrompt(s, rng);
  s.submissions = {};
  s.entries = [];
  s.phase = 'submitting';
}

function nonJudgeSeats(s: DadState): string[] {
  return s.seats.filter((id) => id !== s.judgeId);
}

function maybeCloseSubmissions(s: DadState, rng: Rng): void {
  if (s.phase !== 'submitting') return;
  const needed = nonJudgeSeats(s);
  if (needed.length === 0) return;
  if (needed.every((id) => s.submissions[id])) {
    const raw = needed.map((id) => ({ playerId: id, card: s.submissions[id] as Card }));
    s.entries = shuffle(raw, rng).map((e) => ({ ...e, entryId: randomId(rng, 'e') }));
    s.phase = 'judging';
  }
}

export function submit(s: DadState, playerId: string, cardId: string, rng: Rng): DadResult {
  if (s.phase !== 'submitting') return fail('wrong-phase', 'Not taking cards right now.');
  if (!s.seats.includes(playerId)) return fail('not-seated', 'You are spectating this round.');
  if (playerId === s.judgeId) return fail('judge-cannot-submit', "The judge doesn't play a card.");
  if (s.submissions[playerId]) return fail('already-submitted', 'Card already played.');
  const hand = s.hands[playerId] ?? [];
  const idx = hand.findIndex((c) => c.id === cardId);
  if (idx === -1) return fail('card-not-in-hand', 'That card is not in your hand.');
  const [card] = hand.splice(idx, 1);
  s.submissions[playerId] = card as Card;
  if (s.fresh) delete s.fresh[playerId];
  maybeCloseSubmissions(s, rng);
  return ok;
}

export function pick(s: DadState, judgeId: string, entryId: string, rng: Rng): DadResult {
  if (s.phase !== 'judging') return fail('wrong-phase', 'Nothing to judge yet.');
  if (judgeId !== s.judgeId) return fail('not-judge', 'Only the judge picks.');
  const entry = s.entries.find((e) => e.entryId === entryId);
  if (!entry) return fail('unknown-entry', 'That answer is not on the table.');
  s.scores[entry.playerId] = (s.scores[entry.playerId] ?? 0) + 1;
  s.lastRound = {
    round: s.round,
    prompt: s.prompt?.text ?? '',
    winnerId: entry.playerId,
    winningText: fillPrompt(s.prompt?.text ?? '', entry.card.text),
    skipped: null,
  };
  if ((s.scores[entry.playerId] ?? 0) >= s.targetScore) {
    for (const e of s.entries) s.discardPile.push(e.card);
    endGame(s, entry.playerId);
    return ok;
  }
  // Replace every played card now, before the played cards hit the discard pile, so nobody can
  // draw back the card they just played on a reshuffle.
  for (const e of s.entries) if (s.seats.includes(e.playerId)) dealUp(s, e.playerId, rng);
  for (const e of s.entries) s.discardPile.push(e.card);
  s.submissions = {};
  s.phase = 'reveal';
  return ok;
}

export function next(s: DadState, by: string, rng: Rng): DadResult {
  if (s.phase !== 'reveal') return fail('wrong-phase', 'Round is not done.');
  if (!s.seats.includes(by)) return fail('not-seated', 'Spectators wait for the table.');
  beginRound(s, rng);
  return ok;
}

/** Back to the seating screen. Keeps everyone seated (plus anyone waiting), wipes scores. */
export function reset(s: DadState, by: string): DadResult {
  if (s.phase !== 'over' && s.phase !== 'paused') return fail('wrong-phase', 'Finish the game first.');
  if (!s.seats.includes(by) && !s.waiting.includes(by)) return fail('not-seated', 'Sit down first.');
  const seats = [...s.seats, ...s.waiting].slice(0, MAX_PLAYERS);
  const target = s.targetScore;
  Object.assign(s, createDad(target));
  s.seats = seats;
  return ok;
}

function returnSubmissionsToHands(s: DadState): void {
  for (const [id, card] of Object.entries(s.submissions)) {
    if (s.hands[id]) s.hands[id].push(card);
    else s.discardPile.push(card);
  }
  s.submissions = {};
  s.entries = [];
}

/** Someone left the table or the Activity. Keeps the game moving. */
export function removePlayer(s: DadState, playerId: string, rng: Rng): void {
  s.waiting = s.waiting.filter((id) => id !== playerId);
  const idx = s.seats.indexOf(playerId);
  if (idx === -1) return;

  const wasJudge = s.judgeId === playerId;
  s.seats.splice(idx, 1);
  if (idx <= s.judgeCursor) s.judgeCursor -= 1;
  for (const c of s.hands[playerId] ?? []) s.discardPile.push(c);
  delete s.hands[playerId];
  if (s.fresh) delete s.fresh[playerId];
  const theirCard = s.submissions[playerId];
  if (theirCard) {
    s.discardPile.push(theirCard);
    delete s.submissions[playerId];
  }
  s.entries = s.entries.filter((e) => e.playerId !== playerId);

  if (s.phase === 'seating' || s.phase === 'over') return;

  if (s.phase === 'paused') return;

  if (wasJudge && (s.phase === 'submitting' || s.phase === 'judging')) {
    // Judge bailed: round is void, cards go back, next judge up.
    s.lastRound = { round: s.round, prompt: s.prompt?.text ?? '', winnerId: null, winningText: null, skipped: 'judge-left' };
    returnSubmissionsToHands(s);
    s.judgeId = null;
    beginRound(s, rng);
    return;
  }

  if (s.seats.length < MIN_PLAYERS) {
    s.lastRound = { round: s.round, prompt: s.prompt?.text ?? '', winnerId: null, winningText: null, skipped: 'not-enough-players' };
    returnSubmissionsToHands(s);
    s.phase = 'paused';
    s.judgeId = null;
    if (s.prompt) s.promptDiscard.push(s.prompt);
    s.prompt = null;
    return;
  }

  if (s.phase === 'submitting') maybeCloseSubmissions(s, rng);
  // judging with entries already shuffled: remaining entries stay put.
}
