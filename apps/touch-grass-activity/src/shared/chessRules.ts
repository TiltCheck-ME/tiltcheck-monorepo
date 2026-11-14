// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-13
// Chess rules: legal moves (check, castling, en passant, promotion), mate, stalemate, draws, SAN.
// Pure and serializable, shared by the worker room and guest mode. Written here instead of pulling in
// a library (chess.js is BSD-2-Clause, not MIT); tests/chess-rules.test.ts checks it against the
// standard perft counts, which catch any missing or extra move.
//
// Board: 64 squares, index = rank * 8 + file (a1 = 0, h1 = 7, a8 = 56). Pieces are FEN letters:
// uppercase white, lowercase black, null empty.

export type Color = 'w' | 'b';
export type Piece = 'P' | 'N' | 'B' | 'R' | 'Q' | 'K' | 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type PromoPiece = 'q' | 'r' | 'b' | 'n';

export interface Position {
  board: (Piece | null)[];
  turn: Color;
  /** Castling rights, any of 'KQkq'. */
  castling: string;
  /** En passant target square, or null. */
  ep: number | null;
  halfmove: number;
  fullmove: number;
}

export interface Move {
  from: number;
  to: number;
  piece: Piece;
  captured: Piece | null;
  promotion: PromoPiece | null;
  /** 'k' / 'q' for castling, 'e' for en passant. */
  flag: 'k' | 'q' | 'e' | null;
}

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const FILES = 'abcdefgh';

export const colorOf = (p: Piece): Color => (p === p.toUpperCase() ? 'w' : 'b');
export const fileOf = (sq: number): number => sq & 7;
export const rankOf = (sq: number): number => sq >> 3;
export const squareName = (sq: number): string => `${FILES[fileOf(sq)]}${rankOf(sq) + 1}`;
export function parseSquare(name: string): number | null {
  if (!/^[a-h][1-8]$/.test(name)) return null;
  return (Number(name[1]) - 1) * 8 + FILES.indexOf(name[0] as string);
}
const other = (c: Color): Color => (c === 'w' ? 'b' : 'w');

export function fromFen(fen: string): Position {
  const [placement, turn, castling, ep, half, full] = fen.trim().split(/\s+/);
  const board: (Piece | null)[] = new Array(64).fill(null);
  const ranks = (placement ?? '').split('/');
  if (ranks.length !== 8) throw new Error('bad fen');
  ranks.forEach((row, i) => {
    const rank = 7 - i;
    let file = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) file += Number(ch);
      else {
        if (!/^[pnbrqkPNBRQK]$/.test(ch) || file > 7) throw new Error('bad fen');
        board[rank * 8 + file] = ch as Piece;
        file += 1;
      }
    }
    if (file !== 8) throw new Error('bad fen');
  });
  return {
    board,
    turn: turn === 'b' ? 'b' : 'w',
    castling: castling && castling !== '-' ? castling : '',
    ep: ep && ep !== '-' ? parseSquare(ep) : null,
    halfmove: Number(half ?? 0) || 0,
    fullmove: Number(full ?? 1) || 1,
  };
}

export function toFen(p: Position): string {
  const rows: string[] = [];
  for (let rank = 7; rank >= 0; rank -= 1) {
    let row = '';
    let empty = 0;
    for (let file = 0; file < 8; file += 1) {
      const pc = p.board[rank * 8 + file];
      if (!pc) empty += 1;
      else {
        if (empty) row += String(empty);
        empty = 0;
        row += pc;
      }
    }
    if (empty) row += String(empty);
    rows.push(row);
  }
  return `${rows.join('/')} ${p.turn} ${p.castling || '-'} ${p.ep === null ? '-' : squareName(p.ep)} ${p.halfmove} ${p.fullmove}`;
}

/** Position identity for repetition: placement, side to move, castling, and en passant only when it can be taken. */
export function repetitionKey(p: Position): string {
  const parts = toFen(p).split(' ');
  const epLive = p.ep !== null && pseudoMoves(p).some((m) => m.flag === 'e' && isLegalAfter(p, m));
  return `${parts[0]} ${parts[1]} ${parts[2]} ${epLive ? parts[3] : '-'}`;
}

const KNIGHT = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
const KING = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
const ROOK_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const BISHOP_DIRS = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

function step(sq: number, df: number, dr: number): number | null {
  const f = fileOf(sq) + df;
  const r = rankOf(sq) + dr;
  return f < 0 || f > 7 || r < 0 || r > 7 ? null : r * 8 + f;
}

/** Is `sq` attacked by any piece of colour `by`? */
export function isAttacked(board: (Piece | null)[], sq: number, by: Color): boolean {
  const up = by === 'w' ? -1 : 1; // look back toward the attacking pawn
  for (const df of [-1, 1]) {
    const s = step(sq, df, up);
    if (s !== null && board[s] === (by === 'w' ? 'P' : 'p')) return true;
  }
  for (const [df, dr] of KNIGHT) {
    const s = step(sq, df as number, dr as number);
    if (s !== null && board[s] === (by === 'w' ? 'N' : 'n')) return true;
  }
  for (const [df, dr] of KING) {
    const s = step(sq, df as number, dr as number);
    if (s !== null && board[s] === (by === 'w' ? 'K' : 'k')) return true;
  }
  const slide = (dirs: number[][], kinds: string) => {
    for (const [df, dr] of dirs) {
      let s = step(sq, df as number, dr as number);
      while (s !== null) {
        const pc = board[s];
        if (pc) {
          if (colorOf(pc) === by && kinds.includes(pc.toUpperCase())) return true;
          break;
        }
        s = step(s, df as number, dr as number);
      }
    }
    return false;
  };
  return slide(ROOK_DIRS, 'RQ') || slide(BISHOP_DIRS, 'BQ');
}

export function kingSquare(board: (Piece | null)[], c: Color): number {
  return board.indexOf(c === 'w' ? 'K' : 'k');
}

export function inCheck(p: Position, c: Color = p.turn): boolean {
  const k = kingSquare(p.board, c);
  return k >= 0 && isAttacked(p.board, k, other(c));
}

/** Every move by the side to move, ignoring whether it leaves their own king in check. */
function pseudoMoves(p: Position): Move[] {
  const out: Move[] = [];
  const me = p.turn;
  const b = p.board;
  const add = (from: number, to: number, piece: Piece, captured: Piece | null, flag: Move['flag'] = null) => {
    if ((piece === 'P' && rankOf(to) === 7) || (piece === 'p' && rankOf(to) === 0)) {
      for (const promo of ['q', 'r', 'b', 'n'] as PromoPiece[]) out.push({ from, to, piece, captured, promotion: promo, flag });
    } else out.push({ from, to, piece, captured, promotion: null, flag });
  };
  for (let sq = 0; sq < 64; sq += 1) {
    const pc = b[sq];
    if (!pc || colorOf(pc) !== me) continue;
    const kind = pc.toUpperCase();
    if (kind === 'P') {
      const dir = me === 'w' ? 1 : -1;
      const one = step(sq, 0, dir);
      if (one !== null && !b[one]) {
        add(sq, one, pc, null);
        const startRank = me === 'w' ? 1 : 6;
        const two = step(sq, 0, 2 * dir);
        if (rankOf(sq) === startRank && two !== null && !b[two]) add(sq, two, pc, null);
      }
      for (const df of [-1, 1]) {
        const t = step(sq, df, dir);
        if (t === null) continue;
        const target = b[t];
        if (target && colorOf(target) !== me) add(sq, t, pc, target);
        else if (!target && t === p.ep) add(sq, t, pc, me === 'w' ? 'p' : 'P', 'e');
      }
    } else if (kind === 'N' || kind === 'K') {
      for (const [df, dr] of kind === 'N' ? KNIGHT : KING) {
        const t = step(sq, df as number, dr as number);
        if (t === null) continue;
        const target = b[t];
        if (!target || colorOf(target) !== me) add(sq, t, pc, target ?? null);
      }
      if (kind === 'K') {
        const home = me === 'w' ? 4 : 60;
        const them = other(me);
        if (sq === home && !isAttacked(b, home, them)) {
          const rights = me === 'w' ? ['K', 'Q'] : ['k', 'q'];
          const rook = me === 'w' ? 'R' : 'r';
          if (p.castling.includes(rights[0] as string) && b[home + 3] === rook && !b[home + 1] && !b[home + 2] && !isAttacked(b, home + 1, them) && !isAttacked(b, home + 2, them)) {
            add(sq, home + 2, pc, null, 'k');
          }
          if (p.castling.includes(rights[1] as string) && b[home - 4] === rook && !b[home - 1] && !b[home - 2] && !b[home - 3] && !isAttacked(b, home - 1, them) && !isAttacked(b, home - 2, them)) {
            add(sq, home - 2, pc, null, 'q');
          }
        }
      }
    } else {
      const dirs = kind === 'R' ? ROOK_DIRS : kind === 'B' ? BISHOP_DIRS : [...ROOK_DIRS, ...BISHOP_DIRS];
      for (const [df, dr] of dirs) {
        let t = step(sq, df as number, dr as number);
        while (t !== null) {
          const target = b[t];
          if (target) {
            if (colorOf(target) !== me) add(sq, t, pc, target);
            break;
          }
          add(sq, t, pc, null);
          t = step(t, df as number, dr as number);
        }
      }
    }
  }
  return out;
}

const CASTLE_LOSS: Record<number, string> = { 0: 'Q', 4: 'KQ', 7: 'K', 56: 'q', 60: 'kq', 63: 'k' };

/** The position after a move (assumed pseudo-legal). Does not touch the input. */
export function applyMove(p: Position, m: Move): Position {
  const board = [...p.board];
  board[m.from] = null;
  let placed: Piece = m.piece;
  if (m.promotion) placed = (colorOf(m.piece) === 'w' ? m.promotion.toUpperCase() : m.promotion) as Piece;
  board[m.to] = placed;
  if (m.flag === 'e') board[m.to + (colorOf(m.piece) === 'w' ? -8 : 8)] = null;
  if (m.flag === 'k') {
    board[m.from + 1] = board[m.from + 3] as Piece;
    board[m.from + 3] = null;
  }
  if (m.flag === 'q') {
    board[m.from - 1] = board[m.from - 4] as Piece;
    board[m.from - 4] = null;
  }
  let castling = p.castling;
  for (const sq of [m.from, m.to]) {
    const lose = CASTLE_LOSS[sq];
    if (lose) castling = [...castling].filter((c) => !lose.includes(c)).join('');
  }
  const isPawn = m.piece === 'P' || m.piece === 'p';
  const ep = isPawn && Math.abs(m.to - m.from) === 16 ? (m.from + m.to) / 2 : null;
  return {
    board,
    turn: other(p.turn),
    castling,
    ep,
    halfmove: isPawn || m.captured ? 0 : p.halfmove + 1,
    fullmove: p.turn === 'b' ? p.fullmove + 1 : p.fullmove,
  };
}

function isLegalAfter(p: Position, m: Move): boolean {
  const next = applyMove(p, m);
  return !inCheck(next, p.turn);
}

export function legalMoves(p: Position): Move[] {
  return pseudoMoves(p).filter((m) => isLegalAfter(p, m));
}

/** Only kings, or a king and one minor piece against a bare king, or bishops all on one colour. */
export function insufficientMaterial(p: Position): boolean {
  const pieces: { pc: Piece; sq: number }[] = [];
  p.board.forEach((pc, sq) => {
    if (pc && pc.toUpperCase() !== 'K') pieces.push({ pc, sq });
  });
  if (pieces.length === 0) return true;
  if (pieces.length === 1 && 'NB'.includes((pieces[0] as { pc: Piece }).pc.toUpperCase())) return true;
  if (pieces.every((x) => x.pc.toUpperCase() === 'B')) {
    const shades = new Set(pieces.map((x) => (fileOf(x.sq) + rankOf(x.sq)) % 2));
    return shades.size === 1;
  }
  return false;
}

/** Can this side still mate at all? (Used when the other side runs out of time.) */
export function hasMatingMaterial(p: Position, c: Color): boolean {
  let minors = 0;
  for (const pc of p.board) {
    if (!pc || colorOf(pc) !== c) continue;
    const k = pc.toUpperCase();
    if (k === 'P' || k === 'R' || k === 'Q') return true;
    if (k === 'N' || k === 'B') minors += 1;
  }
  return minors >= 1 && !(minors === 1 && insufficientAgainst(p, c));
}

/** One minor piece mates only with help from the other side's pieces; treat a bare enemy king as no mate. */
function insufficientAgainst(p: Position, c: Color): boolean {
  return !p.board.some((pc) => pc && colorOf(pc) !== c && pc.toUpperCase() !== 'K');
}

/** Standard algebraic notation for a legal move in position p (e4, Nbd7, exd6, O-O, e8=Q+, Qh5#). */
export function san(p: Position, m: Move): string {
  let s: string;
  if (m.flag === 'k') s = 'O-O';
  else if (m.flag === 'q') s = 'O-O-O';
  else {
    const kind = m.piece.toUpperCase();
    const capture = m.captured !== null;
    if (kind === 'P') {
      s = `${capture ? `${FILES[fileOf(m.from)]}x` : ''}${squareName(m.to)}${m.promotion ? `=${m.promotion.toUpperCase()}` : ''}`;
    } else {
      const rivals = legalMoves(p).filter((o) => o.piece === m.piece && o.to === m.to && o.from !== m.from);
      let dis = '';
      if (rivals.length) {
        const sameFile = rivals.some((o) => fileOf(o.from) === fileOf(m.from));
        const sameRank = rivals.some((o) => rankOf(o.from) === rankOf(m.from));
        if (!sameFile) dis = FILES[fileOf(m.from)] as string;
        else if (!sameRank) dis = String(rankOf(m.from) + 1);
        else dis = squareName(m.from);
      }
      s = `${kind}${dis}${capture ? 'x' : ''}${squareName(m.to)}`;
    }
  }
  const next = applyMove(p, m);
  if (inCheck(next)) s += legalMoves(next).length ? '+' : '#';
  return s;
}

/** Move count to a depth, for testing against published perft numbers. */
export function perft(p: Position, depth: number): number {
  if (depth === 0) return 1;
  const moves = legalMoves(p);
  if (depth === 1) return moves.length;
  let n = 0;
  for (const m of moves) n += perft(applyMove(p, m), depth - 1);
  return n;
}
