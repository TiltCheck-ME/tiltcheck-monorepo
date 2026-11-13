// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-13
// Chess, 1v1. Pure and serializable: the worker Durable Object and the guest room run this exact code.
// The server is the authority; clients send a square to a square and get the new position back.
//
// Rules of the table:
// - Two people claim White and Black; everyone else in the room watches.
// - Either player starts once both seats are taken. A rematch swaps colours.
// - Full chess rules (chessRules.ts). Checkmate and stalemate end the game. Threefold repetition,
//   the 50-move rule and dead positions (insufficient material) are drawn automatically.
// - Resign at any time; offer a draw, which the other player accepts or declines. A move by the
//   player who was offered the draw declines it.
// - Clock is off by default. When on (5, 10 or 15 minutes each, no increment) it starts after
//   White's first move; a flag loses unless the other side cannot mate, which is a draw.
// - A player who drops keeps their seat for the room's away grace; really leaving mid-game ends it.

import {
  applyMove,
  fromFen,
  hasMatingMaterial,
  inCheck,
  insufficientMaterial,
  kingSquare,
  legalMoves,
  repetitionKey,
  san,
  START_FEN,
  toFen,
  type Color,
  type Move,
  type Piece,
  type PromoPiece,
} from './chessRules.js';

export const CLOCK_CHOICES = [0, 5, 10, 15] as const;
export type ClockMinutes = (typeof CLOCK_CHOICES)[number];
export const MAX_PLIES = 600;

export type ChessPhase = 'seating' | 'playing' | 'over';
export type ChessEnd = 'checkmate' | 'resign' | 'timeout' | 'stalemate' | 'agreement' | 'repetition' | 'fifty' | 'material' | 'timeout-material' | 'left' | 'length';

export interface ChessResult {
  /** null = draw */
  winner: Color | null;
  reason: ChessEnd;
}

export interface ChessMoveRecord {
  from: number;
  to: number;
  san: string;
}

export interface ChessState {
  phase: ChessPhase;
  game: number;
  white: string | null;
  black: string | null;
  fen: string;
  moves: ChessMoveRecord[];
  /** Repetition counts by position key, since the last pawn move or capture. */
  seen: Record<string, number>;
  drawOffer: Color | null;
  clockMinutes: ClockMinutes;
  /** Remaining ms per side; only meaningful with a clock. */
  clock: { w: number; b: number };
  /** When the side to move's clock started running. Null = not running. */
  turnStartedAt: number | null;
  result: ChessResult | null;
}

export type ChessActionResult = { ok: true } | { ok: false; code: string; message: string };
const ok: ChessActionResult = { ok: true };
const fail = (code: string, message: string): ChessActionResult => ({ ok: false, code, message });

export function createChess(): ChessState {
  return {
    phase: 'seating',
    game: 0,
    white: null,
    black: null,
    fen: START_FEN,
    moves: [],
    seen: {},
    drawOffer: null,
    clockMinutes: 0,
    clock: { w: 0, b: 0 },
    turnStartedAt: null,
    result: null,
  };
}

export function colorFor(s: ChessState, id: string): Color | null {
  if (s.white === id) return 'w';
  if (s.black === id) return 'b';
  return null;
}

export const isPlaying = (s: ChessState): boolean => s.phase === 'playing';

export function claim(s: ChessState, id: string, color: Color): ChessActionResult {
  if (s.phase === 'playing') return fail('wrong-phase', 'A game is on. Wait for it to finish.');
  const seat = color === 'w' ? s.white : s.black;
  if (seat === id) return ok;
  if (seat) return fail('seat-taken', 'That side is taken.');
  // Switching sides: give up the other seat.
  if (s.white === id) s.white = null;
  if (s.black === id) s.black = null;
  if (color === 'w') s.white = id;
  else s.black = id;
  return ok;
}

export function release(s: ChessState, id: string): ChessActionResult {
  if (s.phase === 'playing' && colorFor(s, id)) return fail('wrong-phase', 'Resign first.');
  if (!colorFor(s, id)) return fail('not-seated', 'You are not playing.');
  if (s.white === id) s.white = null;
  if (s.black === id) s.black = null;
  return ok;
}

export function setClock(s: ChessState, id: string, minutes: number): ChessActionResult {
  if (s.phase === 'playing') return fail('wrong-phase', 'Clock is set before the game.');
  if (!colorFor(s, id)) return fail('not-seated', 'Only the players set the clock.');
  if (!(CLOCK_CHOICES as readonly number[]).includes(minutes)) return fail('bad-clock', 'Pick off, 5, 10 or 15 minutes.');
  s.clockMinutes = minutes as ClockMinutes;
  return ok;
}

export function start(s: ChessState, id: string, now: number): ChessActionResult {
  if (s.phase === 'playing') return fail('wrong-phase', 'A game is on.');
  if (!colorFor(s, id)) return fail('not-seated', 'Take a side first.');
  if (!s.white || !s.black) return fail('need-two', 'Need someone on each side.');
  if (s.phase === 'over') {
    const w = s.white;
    s.white = s.black;
    s.black = w;
  }
  s.phase = 'playing';
  s.game += 1;
  s.fen = START_FEN;
  s.moves = [];
  s.seen = { [repetitionKey(fromFen(START_FEN))]: 1 };
  s.drawOffer = null;
  const ms = s.clockMinutes * 60_000;
  s.clock = { w: ms, b: ms };
  s.turnStartedAt = null;
  s.result = null;
  void now;
  return ok;
}

function finish(s: ChessState, winner: Color | null, reason: ChessEnd): void {
  s.phase = 'over';
  s.result = { winner, reason };
  s.drawOffer = null;
  s.turnStartedAt = null;
}

/** Time left for a side right now (ms). */
export function timeLeft(s: ChessState, c: Color, now: number): number {
  const turn = fromFenTurn(s.fen);
  const base = s.clock[c];
  if (s.phase === 'playing' && s.turnStartedAt !== null && turn === c) return Math.max(0, base - (now - s.turnStartedAt));
  return base;
}

function fromFenTurn(fen: string): Color {
  return fen.split(' ')[1] === 'b' ? 'b' : 'w';
}

export function move(s: ChessState, id: string, ply: number, from: number, to: number, promotion: PromoPiece | null, now: number): ChessActionResult {
  if (s.phase !== 'playing') return fail('wrong-phase', 'No game on.');
  const me = colorFor(s, id);
  if (!me) return fail('not-seated', 'You are watching this one.');
  if (tick(s, now)) return fail('wrong-phase', 'Out of time.');
  const pos = fromFen(s.fen);
  if (pos.turn !== me) return fail('not-your-turn', 'Not your move.');
  if (ply !== s.moves.length) return fail('stale', 'The board moved. Try again.');
  const candidates = legalMoves(pos).filter((m) => m.from === from && m.to === to);
  if (!candidates.length) return fail('illegal', 'Not a legal move.');
  const needsPromo = candidates.some((m) => m.promotion !== null);
  const m: Move | undefined = needsPromo ? candidates.find((x) => x.promotion === (promotion ?? 'q')) : candidates[0];
  if (!m) return fail('illegal', 'Not a legal move.');

  // Clock: charge the mover, then start the other side's clock (from White's first move on).
  if (s.clockMinutes > 0) {
    if (s.turnStartedAt !== null) s.clock[me] = Math.max(0, s.clock[me] - (now - s.turnStartedAt));
    s.turnStartedAt = now;
  }
  const notation = san(pos, m);
  const next = applyMove(pos, m);
  s.fen = toFen(next);
  s.moves.push({ from: m.from, to: m.to, san: notation });
  const key = repetitionKey(next);
  // A pawn move or capture means no earlier position can come back: forget them (keeps storage small).
  if (next.halfmove === 0) s.seen = {};
  s.seen[key] = (s.seen[key] ?? 0) + 1;
  // Moving declines a draw the other side offered; your own offer stands.
  if (s.drawOffer && s.drawOffer !== me) s.drawOffer = null;

  const replies = legalMoves(next);
  if (!replies.length) finish(s, inCheck(next) ? me : null, inCheck(next) ? 'checkmate' : 'stalemate');
  else if (insufficientMaterial(next)) finish(s, null, 'material');
  else if ((s.seen[key] ?? 0) >= 3) finish(s, null, 'repetition');
  else if (next.halfmove >= 100) finish(s, null, 'fifty');
  else if (s.moves.length >= MAX_PLIES) finish(s, null, 'length');
  return ok;
}

export function resign(s: ChessState, id: string): ChessActionResult {
  const me = colorFor(s, id);
  if (s.phase !== 'playing') return fail('wrong-phase', 'No game on.');
  if (!me) return fail('not-seated', 'You are watching this one.');
  finish(s, me === 'w' ? 'b' : 'w', 'resign');
  return ok;
}

/** Offer a draw, or accept the one on the table. */
export function offerDraw(s: ChessState, id: string): ChessActionResult {
  const me = colorFor(s, id);
  if (s.phase !== 'playing') return fail('wrong-phase', 'No game on.');
  if (!me) return fail('not-seated', 'You are watching this one.');
  if (s.drawOffer === me) return fail('already-offered', 'Draw already offered.');
  if (s.drawOffer) {
    finish(s, null, 'agreement');
    return ok;
  }
  s.drawOffer = me;
  return ok;
}

export function declineDraw(s: ChessState, id: string): ChessActionResult {
  const me = colorFor(s, id);
  if (s.phase !== 'playing' || !me) return fail('wrong-phase', 'Nothing to decline.');
  if (!s.drawOffer || s.drawOffer === me) return fail('no-offer', 'No draw offer to decline.');
  s.drawOffer = null;
  return ok;
}

/** Flag fall. Returns true when the game ended. */
export function tick(s: ChessState, now: number): boolean {
  if (s.phase !== 'playing' || s.clockMinutes === 0 || s.turnStartedAt === null) return false;
  const turn = fromFenTurn(s.fen);
  if (timeLeft(s, turn, now) > 0) return false;
  s.clock[turn] = 0;
  const winner: Color = turn === 'w' ? 'b' : 'w';
  if (hasMatingMaterial(fromFen(s.fen), winner)) finish(s, winner, 'timeout');
  else finish(s, null, 'timeout-material');
  return true;
}

export function nextWake(s: ChessState): number | null {
  if (s.phase !== 'playing' || s.clockMinutes === 0 || s.turnStartedAt === null) return null;
  const turn = fromFenTurn(s.fen);
  return s.turnStartedAt + s.clock[turn];
}

/** Really gone from the room. Mid-game, the other player wins. */
export function removePlayer(s: ChessState, id: string): void {
  const c = colorFor(s, id);
  if (!c) return;
  if (s.phase === 'playing') finish(s, c === 'w' ? 'b' : 'w', 'left');
  if (s.white === id) s.white = null;
  if (s.black === id) s.black = null;
}

export interface ChessViewData {
  phase: ChessPhase;
  game: number;
  white: string | null;
  black: string | null;
  /** 64 squares, a1 = 0. */
  board: (Piece | null)[];
  turn: Color;
  ply: number;
  /** Square of the king in check, or null. */
  check: number | null;
  lastMove: { from: number; to: number } | null;
  moves: string[];
  drawOffer: Color | null;
  clockMinutes: ClockMinutes;
  /** Remaining ms per side at serverNow; null when the clock is off. */
  clock: { w: number; b: number; running: Color | null } | null;
  result: ChessResult | null;
  me: {
    color: Color | null;
    /** Only for the player to move: from-square to its legal targets, and which targets promote. */
    legal: Record<number, number[]>;
    promotions: number[];
  };
}

export function viewFor(s: ChessState, id: string, now: number): ChessViewData {
  const pos = fromFen(s.fen);
  const me = colorFor(s, id);
  const legal: Record<number, number[]> = {};
  const promos = new Set<number>();
  if (s.phase === 'playing' && me === pos.turn) {
    for (const m of legalMoves(pos)) {
      const list = (legal[m.from] ??= []);
      if (!list.includes(m.to)) list.push(m.to);
      if (m.promotion) promos.add(m.from * 64 + m.to);
    }
  }
  const last = s.moves.at(-1);
  const checked = s.phase !== 'seating' && inCheck(pos) ? kingSquare(pos.board, pos.turn) : null;
  return {
    phase: s.phase,
    game: s.game,
    white: s.white,
    black: s.black,
    board: [...pos.board],
    turn: pos.turn,
    ply: s.moves.length,
    check: checked,
    lastMove: last ? { from: last.from, to: last.to } : null,
    moves: s.moves.map((m) => m.san),
    drawOffer: s.phase === 'playing' ? s.drawOffer : null,
    clockMinutes: s.clockMinutes,
    clock:
      s.clockMinutes > 0 && s.phase !== 'seating'
        ? { w: timeLeft(s, 'w', now), b: timeLeft(s, 'b', now), running: s.phase === 'playing' && s.turnStartedAt !== null ? pos.turn : null }
        : null,
    result: s.result ? { ...s.result } : null,
    me: { color: me, legal, promotions: [...promos] },
  };
}
