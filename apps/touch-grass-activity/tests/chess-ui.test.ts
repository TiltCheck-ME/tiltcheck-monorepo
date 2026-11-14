// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-13
// Chess screen, render only: board orientation per viewer, the promotion picker, clock text, copy.
import { describe, expect, it } from 'vitest';
import { parseSquare } from '../src/shared/chessRules.js';
import { Room, createRoomState } from '../src/shared/room.js';
import { makeRng } from '../src/shared/rng.js';
import { emptyChessUi, fmtClock, needsPromotion, renderChess } from '../src/client/views/chess.js';

const W = '200000001';
const B = '200000002';
const S = '200000003';
const sq = (n: string) => parseSquare(n) as number;

function started(clock = 0): Room {
  const r = new Room(createRoomState('i-chess-ui'), makeRng(3));
  for (const [id, name] of [[W, 'Wes'], [B, 'Bea'], [S, 'Sam']] as const) r.join({ id, name, avatar: null }, 0);
  r.limiter.take = () => true;
  r.handle(W, { t: 'chess.claim', color: 'w' }, 0);
  r.handle(B, { t: 'chess.claim', color: 'b' }, 0);
  if (clock) r.handle(W, { t: 'chess.clock', minutes: clock }, 0);
  r.handle(W, { t: 'chess.start' }, 0);
  return r;
}

describe('chess screen (render only)', () => {
  it('Black sees the board from its side; spectators and White from White', () => {
    const r = started();
    const firstSq = (html: string) => /data-sq="(\d+)"/.exec(html)![1];
    expect(firstSq(renderChess(r.viewFor(B, 0), emptyChessUi(), 0))).toBe(String(sq('h1')));
    expect(firstSq(renderChess(r.viewFor(W, 0), emptyChessUi(), 0))).toBe(String(sq('a8')));
    expect(firstSq(renderChess(r.viewFor(S, 0), emptyChessUi(), 0))).toBe(String(sq('a8')));
    // Spectators get no resign or draw buttons.
    expect(renderChess(r.viewFor(S, 0), emptyChessUi(), 0)).not.toMatch(/data-chess-resign|chess\.draw/);
  });

  it('a pawn on the last rank asks for the piece: four labelled buttons', () => {
    const r = started();
    r.state.chess!.fen = '8/P6k/8/8/8/8/8/K7 w - - 0 1';
    const v = r.viewFor(W, 0);
    expect(needsPromotion(v, sq('a7'), sq('a8'))).toBe(true);
    expect(needsPromotion(v, sq('a1'), sq('a2'))).toBe(false);
    const html = renderChess(v, { sel: sq('a7'), promo: { from: sq('a7'), to: sq('a8') }, resignArmed: false }, 0);
    expect([...html.matchAll(/data-chess-promo="(\w)" aria-label="(\w+)"/g)].map((m) => `${m[1]}:${m[2]}`)).toEqual(['q:Queen', 'r:Rook', 'b:Bishop', 'n:Knight']);
  });

  it('clock text and no exclamation marks in what the screen says', () => {
    expect(fmtClock(300_000)).toBe('5:00');
    expect(fmtClock(59_001)).toBe('1:00');
    expect(fmtClock(0)).toBe('0:00');
    const r = started(10);
    const text = renderChess(r.viewFor(W, 0), emptyChessUi(), 0).replace(/<[^>]+>/g, ' ');
    expect(text).not.toContain('!');
  });
});
