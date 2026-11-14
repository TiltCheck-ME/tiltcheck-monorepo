// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-13
// Chess at the table: seats, turns, the server as the authority, resign / draw, the optional clock,
// leaving mid-game, and what each viewer is sent.
import { describe, expect, it } from 'vitest';
import * as chess from '../src/shared/chess.js';
import { parseSquare } from '../src/shared/chessRules.js';
import { Room, createRoomState, upgradeRoomState, type RoomState } from '../src/shared/room.js';
import { makeRng } from '../src/shared/rng.js';
import { parseClientMessage, type ClientAction } from '../src/shared/protocol.js';

const W = '200000001';
const B = '200000002';
const S = '200000003';
const sq = (n: string) => parseSquare(n) as number;

function room(): Room {
  const r = new Room(createRoomState('i-chess'), makeRng(3));
  for (const [id, name] of [[W, 'Wes'], [B, 'Bea'], [S, 'Sam']] as const) r.join({ id, name, avatar: null }, 0);
  // These tests fire many actions at one timestamp; the rate limit has its own tests.
  r.limiter.take = () => true;
  return r;
}

function ok(r: Room, id: string, a: ClientAction, now = 1000) {
  const res = r.handle(id, a, now);
  if (!res.ok) throw new Error(`${a.t}: ${res.code}`);
  return res;
}

function started(clock = 0): Room {
  const r = room();
  ok(r, W, { t: 'chess.claim', color: 'w' });
  ok(r, B, { t: 'chess.claim', color: 'b' });
  if (clock) ok(r, W, { t: 'chess.clock', minutes: clock });
  ok(r, W, { t: 'chess.start' });
  return r;
}

function mv(r: Room, id: string, uci: string, now = 1000) {
  const ply = r.state.chess!.moves.length;
  const a: ClientAction = { t: 'chess.move', ply, from: sq(uci.slice(0, 2)), to: sq(uci.slice(2, 4)) };
  if (uci[4]) a.promotion = uci[4] as 'q';
  return r.handle(id, a, now);
}

describe('seats', () => {
  it('two people claim White and Black; a taken side stays taken; switching gives up the old seat', () => {
    const r = room();
    ok(r, W, { t: 'chess.claim', color: 'w' });
    expect(r.handle(B, { t: 'chess.claim', color: 'w' }, 0)).toMatchObject({ ok: false, code: 'seat-taken' });
    ok(r, W, { t: 'chess.claim', color: 'b' });
    expect(r.state.chess!.white).toBeNull();
    expect(r.state.chess!.black).toBe(W);
    ok(r, W, { t: 'chess.release' });
    expect(r.state.chess!.black).toBeNull();
  });

  it('start needs both sides and a seated starter; spectators cannot start', () => {
    const r = room();
    ok(r, W, { t: 'chess.claim', color: 'w' });
    expect(r.handle(W, { t: 'chess.start' }, 0)).toMatchObject({ ok: false, code: 'need-two' });
    ok(r, B, { t: 'chess.claim', color: 'b' });
    expect(r.handle(S, { t: 'chess.start' }, 0)).toMatchObject({ ok: false, code: 'not-seated' });
    ok(r, B, { t: 'chess.start' });
    expect(r.state.chess!.phase).toBe('playing');
    // No seat changes mid-game.
    expect(r.handle(S, { t: 'chess.claim', color: 'w' }, 0)).toMatchObject({ ok: false, code: 'wrong-phase' });
    expect(r.handle(W, { t: 'chess.release' }, 0)).toMatchObject({ ok: false, code: 'wrong-phase' });
  });
});

describe('moves', () => {
  it('only the side to move, only legal moves, only for the current ply', () => {
    const r = started();
    expect(mv(r, B, 'e7e5')).toMatchObject({ ok: false, code: 'not-your-turn' });
    expect(mv(r, S, 'e2e4')).toMatchObject({ ok: false, code: 'not-seated' });
    expect(mv(r, W, 'e2e5')).toMatchObject({ ok: false, code: 'illegal' });
    expect(r.handle(W, { t: 'chess.move', ply: 3, from: sq('e2'), to: sq('e4') }, 0)).toMatchObject({ ok: false, code: 'stale' });
    expect(mv(r, W, 'e2e4').ok).toBe(true);
    // A double tap resends ply 0: refused, nothing moves twice.
    expect(r.handle(W, { t: 'chess.move', ply: 0, from: sq('e2'), to: sq('e4') }, 0)).toMatchObject({ ok: false });
    expect(r.state.chess!.moves.map((m) => m.san)).toEqual(['e4']);
  });

  it("fool's mate ends the game for Black", () => {
    const r = started();
    for (const [id, m] of [[W, 'f2f3'], [B, 'e7e5'], [W, 'g2g4'], [B, 'd8h4']] as const) expect(mv(r, id, m).ok).toBe(true);
    expect(r.state.chess!.result).toEqual({ winner: 'b', reason: 'checkmate' });
    expect(r.state.chess!.moves.at(-1)!.san).toBe('Qh4#');
    expect(mv(r, W, 'a2a3')).toMatchObject({ ok: false, code: 'wrong-phase' });
  });

  it('promotion: the chosen piece, queen when none is named', () => {
    const r = started();
    const c = r.state.chess!;
    c.fen = '8/P6k/8/8/8/8/8/K7 w - - 0 1';
    c.seen = {};
    expect(mv(r, W, 'a7a8n').ok).toBe(true);
    expect(c.fen.startsWith('N7/')).toBe(true);
    const r2 = started();
    r2.state.chess!.fen = '8/P6k/8/8/8/8/8/K7 w - - 0 1';
    expect(mv(r2, W, 'a7a8').ok).toBe(true);
    expect(r2.state.chess!.fen.startsWith('Q7/')).toBe(true);
  });

  it('stalemate, dead position and threefold repetition are draws', () => {
    const r = started();
    r.state.chess!.fen = '7k/8/5QK1/8/8/8/8/8 w - - 0 1';
    expect(mv(r, W, 'f6f7').ok).toBe(true);
    expect(r.state.chess!.result).toEqual({ winner: null, reason: 'stalemate' });

    const r2 = started();
    r2.state.chess!.fen = '8/8/8/4k3/8/8/3p4/3NK3 w - - 0 1';
    expect(mv(r2, W, 'e1d2').ok).toBe(true);
    expect(r2.state.chess!.result).toEqual({ winner: null, reason: 'material' });

    const r3 = started();
    for (let i = 0; i < 2; i += 1) for (const [id, m] of [[W, 'g1f3'], [B, 'g8f6'], [W, 'f3g1'], [B, 'f6g8']] as const) expect(mv(r3, id, m).ok).toBe(true);
    expect(r3.state.chess!.result).toEqual({ winner: null, reason: 'repetition' });
  });

  it('fifty moves without a capture or pawn move is a draw', () => {
    const r = started();
    r.state.chess!.fen = '4k3/8/8/8/8/8/8/R3K3 w - - 99 80';
    expect(mv(r, W, 'a1a2').ok).toBe(true);
    expect(r.state.chess!.result).toEqual({ winner: null, reason: 'fifty' });
  });
});

describe('resign and draws', () => {
  it('resign hands the game over', () => {
    const r = started();
    ok(r, B, { t: 'chess.resign' });
    expect(r.state.chess!.result).toEqual({ winner: 'w', reason: 'resign' });
    expect(r.handle(S, { t: 'chess.resign' }, 0).ok).toBe(false);
  });

  it('offer, then accept by the other side', () => {
    const r = started();
    ok(r, W, { t: 'chess.draw' });
    expect(r.handle(W, { t: 'chess.draw' }, 0)).toMatchObject({ ok: false, code: 'already-offered' });
    expect(r.viewFor(B, 0).chess.drawOffer).toBe('w');
    ok(r, B, { t: 'chess.draw' });
    expect(r.state.chess!.result).toEqual({ winner: null, reason: 'agreement' });
  });

  it('decline, and a move by the offered side declines it too; your own move keeps your offer', () => {
    const r = started();
    ok(r, W, { t: 'chess.draw' });
    ok(r, B, { t: 'chess.decline' });
    expect(r.state.chess!.drawOffer).toBeNull();
    ok(r, W, { t: 'chess.draw' });
    expect(mv(r, W, 'e2e4').ok).toBe(true);
    expect(r.state.chess!.drawOffer).toBe('w');
    expect(mv(r, B, 'e7e5').ok).toBe(true);
    expect(r.state.chess!.drawOffer).toBeNull();
    expect(r.handle(B, { t: 'chess.decline' }, 0).ok).toBe(false);
  });
});

describe('clock (off by default)', () => {
  it('off unless a player picks one; only 5, 10 or 15', () => {
    const r = room();
    expect(r.state.chess!.clockMinutes).toBe(0);
    ok(r, W, { t: 'chess.claim', color: 'w' });
    expect(r.handle(W, { t: 'chess.clock', minutes: 7 }, 0)).toMatchObject({ ok: false, code: 'bad-clock' });
    expect(r.handle(S, { t: 'chess.clock', minutes: 5 }, 0)).toMatchObject({ ok: false, code: 'not-seated' });
    const v = started().viewFor(W, 5_000_000);
    expect(v.chess.clock).toBeNull();
  });

  it("starts after White's first move, charges the mover, and a flag loses", () => {
    const r = started(5);
    expect(r.nextWake()).toBeNull();
    expect(mv(r, W, 'e2e4', 60_000).ok).toBe(true); // White's first move is free
    expect(r.state.chess!.clock.w).toBe(300_000);
    expect(mv(r, B, 'e7e5', 70_000).ok).toBe(true);
    expect(r.state.chess!.clock.b).toBe(290_000);
    const v = r.viewFor(S, 100_000).chess;
    expect(v.clock).toEqual({ w: 270_000, b: 290_000, running: 'w' });
    expect(r.nextWake()).toBe(70_000 + 300_000);
    expect(r.tick(70_000 + 300_000)).toBe(true);
    expect(r.state.chess!.result).toEqual({ winner: 'b', reason: 'timeout' });
  });

  it('a flag against a bare king is a draw', () => {
    const r = started(5);
    const c = r.state.chess!;
    c.fen = '4k3/4p3/8/8/8/8/8/4K3 w - - 0 1';
    expect(mv(r, W, 'e1d1', 0).ok).toBe(true);
    r.tick(400_000);
    expect(c.result).toEqual({ winner: null, reason: 'timeout-material' });
  });
});

describe('room', () => {
  it('leaving mid-game loses it; a drop alone does not', () => {
    const r = started();
    r.markAway(B, 10);
    expect(r.state.chess!.phase).toBe('playing');
    r.leave(B, 20);
    expect(r.state.chess!.result).toEqual({ winner: 'w', reason: 'left' });
    expect(r.state.chess!.black).toBeNull();
  });

  it('rematch swaps colours', () => {
    const r = started();
    ok(r, W, { t: 'chess.resign' });
    ok(r, W, { t: 'chess.start' });
    expect([r.state.chess!.white, r.state.chess!.black]).toEqual([B, W]);
    expect(r.state.chess!.moves).toEqual([]);
    expect(r.state.chess!.game).toBe(2);
  });

  it('everyone sees the board; legal moves go only to the player to move', () => {
    const r = started();
    const w = r.viewFor(W, 0).chess;
    expect(Object.keys(w.me.legal)).toHaveLength(10);
    expect(w.me.legal[sq('g1')]?.sort()).toEqual([sq('f3'), sq('h3')]);
    expect(r.viewFor(B, 0).chess.me.legal).toEqual({});
    const s = r.viewFor(S, 0).chess;
    expect(s.me).toEqual({ color: null, legal: {}, promotions: [] });
    expect(s.board.filter(Boolean)).toHaveLength(32);
  });

  it('check and promotion squares show up in the view', () => {
    const r = started();
    r.state.chess!.fen = '4k3/P7/8/8/8/8/8/4K2R b K - 0 1';
    expect(r.viewFor(B, 0).chess.check).toBeNull();
    r.state.chess!.fen = '4k3/P7/8/8/8/8/8/4K2R w K - 0 1';
    expect(r.viewFor(W, 0).chess.me.promotions).toEqual([sq('a7') * 64 + sq('a8')]);
    expect(mv(r, W, 'h1h8').ok).toBe(true);
    expect(r.viewFor(B, 0).chess.check).toBe(sq('e8'));
  });

  it('rooms stored before chess get a board', () => {
    const old = createRoomState('i-old') as RoomState;
    delete old.chess;
    expect(upgradeRoomState(old).chess?.phase).toBe('seating');
  });

  it('the wire only lets well-formed chess actions through', () => {
    expect(parseClientMessage({ t: 'chess.claim', color: 'w' })).toEqual({ t: 'chess.claim', color: 'w' });
    expect(parseClientMessage({ t: 'chess.claim', color: 'red' })).toBeNull();
    expect(parseClientMessage({ t: 'chess.move', ply: 0, from: 12, to: 28 })).toEqual({ t: 'chess.move', ply: 0, from: 12, to: 28 });
    expect(parseClientMessage({ t: 'chess.move', ply: 0, from: 12, to: 64 })).toBeNull();
    expect(parseClientMessage({ t: 'chess.move', ply: -1, from: 12, to: 28 })).toBeNull();
    expect(parseClientMessage({ t: 'chess.move', ply: 0, from: 12, to: 28, promotion: 'k' })).toBeNull();
    expect(parseClientMessage({ t: 'chess.clock', minutes: 1.5 })).toBeNull();
    expect(parseClientMessage({ t: 'chess.resign' })).toEqual({ t: 'chess.resign' });
    expect(parseClientMessage({ t: 'look', at: 'chess' })).toEqual({ t: 'look', at: 'chess' });
  });

  it('a random game between two legal-move players always ends inside the move cap', () => {
    for (let n = 1; n <= 4; n += 1) {
      const r = started();
      const rng = makeRng(n);
      let guard = 0;
      while (r.state.chess!.phase === 'playing' && guard < 1000) {
        guard += 1;
        const turn = r.state.chess!.fen.split(' ')[1] === 'w' ? W : B;
        const v = r.viewFor(turn, 0).chess;
        const opts = Object.entries(v.me.legal).flatMap(([f, ts]) => ts.map((t) => [Number(f), t] as const));
        const [from, to] = opts[Math.floor(rng() * opts.length)]!;
        const res = r.handle(turn, { t: 'chess.move', ply: v.ply, from, to }, 0);
        expect(res.ok).toBe(true);
      }
      expect(r.state.chess!.phase).toBe('over');
      expect(r.state.chess!.moves.length).toBeLessThanOrEqual(chess.MAX_PLIES);
    }
  });
});
