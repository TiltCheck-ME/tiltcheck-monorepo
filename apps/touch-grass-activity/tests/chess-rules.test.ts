// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-13
// Chess rules against the standard perft counts (chessprogramming.org "Perft Results"), plus the
// special moves, notation and draw material one by one.
import { describe, expect, it } from 'vitest';
import {
  applyMove,
  fromFen,
  hasMatingMaterial,
  inCheck,
  insufficientMaterial,
  legalMoves,
  parseSquare,
  perft,
  repetitionKey,
  san,
  START_FEN,
  toFen,
  type Move,
  type Position,
} from '../src/shared/chessRules.js';

const sq = (n: string) => parseSquare(n) as number;
function find(p: Position, from: string, to: string, promo: Move['promotion'] = null): Move {
  const m = legalMoves(p).find((x) => x.from === sq(from) && x.to === sq(to) && x.promotion === promo);
  if (!m) throw new Error(`no move ${from}${to}`);
  return m;
}
function play(fen: string, ...uci: string[]): Position {
  let p = fromFen(fen);
  for (const u of uci) p = applyMove(p, find(p, u.slice(0, 2), u.slice(2, 4), (u[4] as Move['promotion']) ?? null));
  return p;
}

describe('perft (every legal move, counted to depth)', () => {
  const cases: Array<[string, string, number[]]> = [
    ['start', START_FEN, [20, 400, 8902, 197281]],
    ['kiwipete (castling, pins, en passant)', 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', [48, 2039, 97862]],
    ['position 3 (en passant discovered checks)', '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', [14, 191, 2812, 43238]],
    ['position 4 (promotions, castling through check)', 'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1', [6, 264, 9467]],
    ['position 5', 'rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8', [44, 1486, 62379]],
    ['position 6', 'r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10', [46, 2079, 89890]],
  ];
  for (const [name, fen, counts] of cases) {
    it(name, () => {
      const p = fromFen(fen);
      expect(counts.map((_, i) => perft(p, i + 1))).toEqual(counts);
    });
  }
});

describe('positions', () => {
  it('FEN round trips', () => {
    for (const f of [START_FEN, 'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1', '8/8/8/8/8/8/8/K6k b - - 12 40']) expect(toFen(fromFen(f))).toBe(f);
  });

  it('rejects broken FEN', () => {
    expect(() => fromFen('8/8/8 w - - 0 1')).toThrow();
    expect(() => fromFen('rnbqkbnr/pppppppp/9/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')).toThrow();
  });
});

describe('special moves', () => {
  it('castles both ways and moves the rook; rights go when king or rook moves', () => {
    const base = 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1';
    const short = applyMove(fromFen(base), find(fromFen(base), 'e1', 'g1'));
    expect(short.board[sq('g1')]).toBe('K');
    expect(short.board[sq('f1')]).toBe('R');
    expect(short.board[sq('h1')]).toBeNull();
    expect(short.castling).toBe('kq');
    const long = play(base, 'e1c1');
    expect(long.board[sq('d1')]).toBe('R');
    expect(long.board[sq('a1')]).toBeNull();
    expect(play(base, 'h1h2').castling).toBe('Qkq');
    // Capturing a rook on its home square takes that right away too.
    expect(play('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', 'a1a8').castling).toBe('Kk');
  });

  it('no castling out of, through, or into check, or with a piece in the way', () => {
    const tos = (fen: string) => legalMoves(fromFen(fen)).filter((m) => m.flag === 'k' || m.flag === 'q').map((m) => m.flag);
    expect(tos('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1').sort()).toEqual(['k', 'q']);
    expect(tos('r3k2r/8/8/8/4r3/8/8/R3K2R w KQkq - 0 1')).toEqual([]); // in check
    expect(tos('r3k2r/8/8/8/5r2/8/8/R3K2R w KQkq - 0 1')).toEqual(['q']); // f1 attacked
    expect(tos('r3k2r/8/8/8/3r4/8/8/R3K2R w KQkq - 0 1')).toEqual(['k']); // d1 attacked
    expect(tos('r3k2r/8/8/8/8/8/8/RN2K2R w KQkq - 0 1')).toEqual(['k']); // b1 blocked
    expect(tos('r3k2r/8/8/8/1r6/8/8/R3K2R w KQkq - 0 1')).toEqual(['k', 'q']); // b1 attacked is fine
  });

  it('en passant only right after the double step, and it removes the pawn', () => {
    const p = play(START_FEN, 'e2e4', 'a7a6', 'e4e5', 'd7d5');
    const ep = find(p, 'e5', 'd6');
    expect(ep.flag).toBe('e');
    const after = applyMove(p, ep);
    expect(after.board[sq('d5')]).toBeNull();
    expect(after.board[sq('d6')]).toBe('P');
    expect(san(p, ep)).toBe('exd6');
    // One move later it is gone.
    const late = play(START_FEN, 'e2e4', 'a7a6', 'e4e5', 'd7d5', 'h2h3', 'h7h6');
    expect(legalMoves(late).some((m) => m.flag === 'e')).toBe(false);
  });

  it('en passant that would expose the king is not allowed', () => {
    // White king a5, black rook h5: taking e.p. on d6 would clear the rank.
    const p = fromFen('8/8/8/KPp4r/8/8/8/7k w - c6 0 1');
    expect(legalMoves(p).some((m) => m.flag === 'e')).toBe(false);
  });

  it('promotion offers four pieces and places the chosen one', () => {
    const p = fromFen('8/P6k/8/8/8/8/8/K7 w - - 0 1');
    const promos = legalMoves(p).filter((m) => m.from === sq('a7'));
    expect(promos.map((m) => m.promotion).sort()).toEqual(['b', 'n', 'q', 'r']);
    const knight = applyMove(p, find(p, 'a7', 'a8', 'n'));
    expect(knight.board[sq('a8')]).toBe('N');
    expect(san(p, find(p, 'a7', 'a8', 'q'))).toBe('a8=Q');
  });

  it('a pinned piece cannot leave the line', () => {
    const p = fromFen('4k3/8/8/8/4r3/8/4N3/4K3 w - - 0 1');
    expect(legalMoves(p).filter((m) => m.from === sq('e2'))).toHaveLength(0);
  });
});

describe('notation', () => {
  it('check, mate, captures and disambiguation', () => {
    const fool = play(START_FEN, 'f2f3', 'e7e5', 'g2g4');
    expect(san(fool, find(fool, 'd8', 'h4'))).toBe('Qh4#');
    const nn = fromFen('4k3/8/8/8/8/8/8/1N2KN2 w - - 0 1');
    expect(san(nn, find(nn, 'b1', 'd2'))).toBe('Nbd2');
    const rr = fromFen('4k3/R7/8/8/8/8/8/R3K3 w - - 0 1');
    expect(san(rr, find(rr, 'a1', 'a4'))).toBe('R1a4');
    const castle = fromFen('4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1');
    expect(san(castle, find(castle, 'e1', 'g1'))).toBe('O-O');
    expect(san(castle, find(castle, 'e1', 'c1'))).toBe('O-O-O');
    const chk = fromFen('4k3/8/8/8/8/8/8/R3K3 w - - 0 1');
    expect(san(chk, find(chk, 'a1', 'a8'))).toBe('Ra8+');
  });
});

describe('ends and draws', () => {
  it('checkmate and stalemate', () => {
    const mate = play(START_FEN, 'f2f3', 'e7e5', 'g2g4', 'd8h4');
    expect(inCheck(mate)).toBe(true);
    expect(legalMoves(mate)).toHaveLength(0);
    const stale = fromFen('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
    expect(inCheck(stale)).toBe(false);
    expect(legalMoves(stale)).toHaveLength(0);
  });

  it('dead positions', () => {
    expect(insufficientMaterial(fromFen('8/8/8/4k3/8/8/8/4K3 w - - 0 1'))).toBe(true);
    expect(insufficientMaterial(fromFen('8/8/8/4k3/8/8/8/3NK3 w - - 0 1'))).toBe(true);
    expect(insufficientMaterial(fromFen('8/8/8/4k3/8/8/8/2B1K3 w - - 0 1'))).toBe(true);
    // Bishops on the same colour squares: dead. Opposite colours: not.
    expect(insufficientMaterial(fromFen('8/8/8/4k3/8/8/3b4/2B1K3 w - - 0 1'))).toBe(true);
    expect(insufficientMaterial(fromFen('8/8/8/4k3/8/1b6/8/2B1K3 w - - 0 1'))).toBe(false);
    expect(insufficientMaterial(fromFen('8/8/8/4k3/8/8/4P3/4K3 w - - 0 1'))).toBe(false);
    expect(insufficientMaterial(fromFen('8/8/8/4k3/8/8/8/2NNK3 w - - 0 1'))).toBe(false);
  });

  it('mating material for a flag: a bare king or a lone minor against a bare king cannot win', () => {
    expect(hasMatingMaterial(fromFen('8/8/8/4k3/8/8/8/4K3 w - - 0 1'), 'w')).toBe(false);
    expect(hasMatingMaterial(fromFen('8/8/8/4k3/8/8/8/3NK3 w - - 0 1'), 'w')).toBe(false);
    expect(hasMatingMaterial(fromFen('8/8/8/4k3/8/8/4p3/3NK3 w - - 0 1'), 'w')).toBe(true);
    expect(hasMatingMaterial(fromFen('8/8/8/4k3/8/8/8/3QK3 w - - 0 1'), 'w')).toBe(true);
  });

  it('repetition key ignores an en passant square nobody can use', () => {
    const a = play(START_FEN, 'e2e4');
    const b = fromFen('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1');
    expect(repetitionKey(a)).toBe(repetitionKey(b));
  });
});
