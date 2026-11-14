// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-13
// Chess screen. Renders whatever the server says: the board for everyone, legal targets only for the
// player to move. Tap a piece, then tap a lit square. A pawn reaching the last rank asks what it becomes.

import { COPY } from '../copy.js';
import { CLOCK_CHOICES } from '../../shared/chess.js';
import { squareName } from '../../shared/chessRules.js';
import type { RoomView } from '../../shared/protocol.js';
import { avatarImg, esc, nameOf, userById } from './util.js';
import { CHESS_ART, pieceSvg } from '../art.js';
import { inviteButton } from './invite.js';

type Side = 'w' | 'b';

/** Client-only state: the selected square, a pending promotion, the armed resign button. */
export interface ChessUi {
  sel: number | null;
  promo: { from: number; to: number } | null;
  resignArmed: boolean;
}

export function emptyChessUi(): ChessUi {
  return { sel: null, promo: null, resignArmed: false };
}

const PIECE_WORD: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const sideName = (c: Side) => (c === 'w' ? COPY.chess.white : COPY.chess.black);

/** "1:05" from milliseconds (rounded up, so 0:00 means the flag fell). */
export function fmtClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** Clock for one side right now, counting down locally between server pushes. */
export function chessClockLeft(view: RoomView, side: Side, clockOffsetMs: number): number | null {
  const c = view.chess.clock;
  if (!c) return null;
  const base = c[side];
  if (c.running !== side) return base;
  return Math.max(0, base - (Date.now() + clockOffsetMs - view.serverNow));
}

/** Does this from-to need a promotion pick? */
export function needsPromotion(view: RoomView, from: number, to: number): boolean {
  return view.chess.me.promotions.includes(from * 64 + to);
}

function playerStrip(view: RoomView, side: Side, clockOffsetMs: number): string {
  const ch = view.chess;
  const id = side === 'w' ? ch.white : ch.black;
  const toMove = ch.phase === 'playing' && ch.turn === side;
  const left = chessClockLeft(view, side, clockOffsetMs);
  const away = id ? (view.members.find((m) => m.id === id)?.away ?? false) : false;
  const who = id
    ? `${avatarImg(userById(view, id), 'avatar avatar--sm')}<span class="chess-player__name">${esc(nameOf(view, id))}</span>${away ? `<span class="tag tag--away">${COPY.away}</span>` : ''}`
    : `<span class="muted">${COPY.chess.openSeat}</span>`;
  let action = '';
  if (ch.phase !== 'playing' && !id) {
    action = `<button class="btn btn--sm ${ch.me.color ? 'btn--ghost' : 'btn--primary'}" data-chess-claim="${side}">${ch.me.color ? COPY.chess.switchTo(sideName(side)) : COPY.chess.claim(sideName(side))}</button>`;
  }
  const clock = left === null ? '' : `<span class="chess-clock ${toMove ? 'chess-clock--on' : ''}" data-chess-clock="${side}">${fmtClock(left)}</span>`;
  return `<div class="chess-player ${toMove ? 'chess-player--turn' : ''}" data-chess-player="${side}">
    <span class="chess-chip chess-chip--${side}" aria-hidden="true"></span>
    <span class="chess-player__side">${sideName(side)}</span>
    <span class="chess-player__who">${who}</span>
    ${toMove ? `<span class="sr-only">${COPY.chess.toMove}</span>` : ''}
    ${action}${clock}
  </div>`;
}

function board(view: RoomView, ui: ChessUi): string {
  const ch = view.chess;
  const flip = ch.me.color === 'b';
  const canMove = ch.phase === 'playing' && ch.me.color === ch.turn;
  const targets = canMove && ui.sel !== null ? (ch.me.legal[ui.sel] ?? []) : [];
  const cells: string[] = [];
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const rank = flip ? row : 7 - row;
      const file = flip ? 7 - col : col;
      const sq = rank * 8 + file;
      const pc = ch.board[sq];
      const dark = (rank + file) % 2 === 0;
      const isTarget = targets.includes(sq);
      const movable = canMove && Boolean(ch.me.legal[sq]?.length);
      const cls = [
        'sq',
        dark ? 'sq--dark' : 'sq--light',
        ui.sel === sq ? 'sq--sel' : '',
        ch.lastMove && (ch.lastMove.from === sq || ch.lastMove.to === sq) ? 'sq--last' : '',
        ch.check === sq ? 'sq--check' : '',
        isTarget ? (pc ? 'sq--hit' : 'sq--dot') : '',
      ]
        .filter(Boolean)
        .join(' ');
      const label = `${squareName(sq)}${pc ? `, ${pc === pc.toUpperCase() ? 'white' : 'black'} ${PIECE_WORD[pc.toLowerCase()]}` : ''}`;
      const coord = `${col === 0 ? `<span class="sq__rank">${rank + 1}</span>` : ''}${row === 7 ? `<span class="sq__file">${'abcdefgh'[file]}</span>` : ''}`;
      const tappable = isTarget || movable;
      cells.push(
        `<button type="button" class="${cls}" data-sq="${sq}" aria-label="${label}"${tappable ? '' : ' aria-disabled="true"'}${ui.sel === sq ? ' aria-pressed="true"' : ''}>${coord}${pc ? pieceSvg(pc) : ''}</button>`,
      );
    }
  }
  return `<div class="chess-board ${flip ? 'chess-board--flip' : ''}" role="group" aria-label="Chess board" data-chess-board>${cells.join('')}</div>`;
}

function promoPicker(view: RoomView, ui: ChessUi): string {
  if (!ui.promo) return '';
  const white = view.chess.me.color === 'w';
  return `<div class="chess-promo" role="group" aria-label="${COPY.chess.promote}">
    <span class="chess-promo__label">${COPY.chess.promote}</span>
    ${(['q', 'r', 'b', 'n'] as const)
      .map((p) => `<button type="button" class="chess-promo__btn" data-chess-promo="${p}" aria-label="${COPY.chess.pieceNames[p]}">${pieceSvg(white ? p.toUpperCase() : p)}</button>`)
      .join('')}
  </div>`;
}

function statusLine(view: RoomView): string {
  const ch = view.chess;
  if (ch.phase === 'over' && ch.result) {
    const r = ch.result;
    const reason = COPY.chess.result[r.reason] ?? '';
    if (!r.winner) return `<p class="status" data-chess-status>${esc(reason)}</p>`;
    const id = r.winner === 'w' ? ch.white : ch.black;
    const win = COPY.chess.winner(id ? nameOf(view, id) : sideName(r.winner), sideName(r.winner));
    return `<p class="status status--win" data-chess-status>${esc(`${reason} ${win}`)}</p>`;
  }
  if (ch.phase !== 'playing') return '';
  const mover = ch.turn === 'w' ? ch.white : ch.black;
  const line = ch.me.color === ch.turn ? COPY.chess.yourMove : COPY.chess.theirMove(nameOf(view, mover, sideName(ch.turn)));
  return `<p class="status" data-chess-status>${ch.check !== null ? `${COPY.chess.check} ` : ''}${esc(line)}${ch.me.color ? '' : ` <span class="muted small">${COPY.chess.watching}</span>`}</p>`;
}

function controls(view: RoomView, ui: ChessUi): string {
  const ch = view.chess;
  const me = ch.me.color;
  if (ch.phase === 'playing') {
    if (!me) return '';
    const theirOffer = ch.drawOffer && ch.drawOffer !== me;
    const mine = ch.drawOffer === me;
    const opp = me === 'w' ? ch.black : ch.white;
    const draw = theirOffer
      ? `<p class="note note--calm">${esc(COPY.chess.drawOfferIn(nameOf(view, opp, sideName(me === 'w' ? 'b' : 'w'))))}</p>
         <div class="row"><button class="btn btn--primary" data-act="chess.draw">${COPY.chess.acceptDraw}</button><button class="btn btn--ghost" data-act="chess.decline">${COPY.chess.declineDraw}</button></div>`
      : '';
    return `${draw}<div class="row chess-actions">
      <button class="btn btn--ghost" data-act="chess.draw" ${mine || theirOffer ? 'disabled' : ''}>${mine ? COPY.chess.drawOffered : COPY.chess.offerDraw}</button>
      <button class="btn ${ui.resignArmed ? 'btn--danger' : 'btn--ghost'}" data-chess-resign>${ui.resignArmed ? COPY.chess.resignSure : COPY.chess.resign}</button>
    </div>`;
  }
  // Seating or over.
  const ready = Boolean(ch.white && ch.black);
  const clockRow = me
    ? `<div class="chess-clockset" role="group" aria-label="${COPY.chess.clock}"><span class="chess-clockset__label">${COPY.chess.clock}</span>${CLOCK_CHOICES.map(
        (n) => `<button type="button" class="seg ${ch.clockMinutes === n ? 'seg--on' : ''}" data-chess-clockset="${n}" aria-pressed="${ch.clockMinutes === n}">${n === 0 ? COPY.chess.clockOff : COPY.chess.clockMin(n)}</button>`,
      ).join('')}</div>`
    : '';
  const note = `<p class="muted small">${ch.clockMinutes ? COPY.chess.clockOnNote(ch.clockMinutes) : COPY.chess.clockNote}</p>`;
  const start = me
    ? `<button class="btn btn--primary" data-act="chess.start" ${ready ? '' : 'disabled'}>${ch.phase === 'over' ? COPY.chess.rematch : COPY.chess.start}</button><button class="btn btn--ghost" data-act="chess.release">${COPY.chess.release}</button>`
    : '';
  return `${clockRow}${note}${ready ? '' : `<p class="muted small">${COPY.chess.needTwo}</p>`}<div class="row">${start}${inviteButton()}</div>`;
}

function moveList(view: RoomView): string {
  const mv = view.chess.moves;
  if (!mv.length) return `<p class="muted small">${COPY.chess.noMoves}</p>`;
  const pairs: string[] = [];
  for (let i = 0; i < mv.length; i += 2) {
    pairs.push(`<li><span class="chess-moves__n">${i / 2 + 1}.</span> ${esc(mv[i] as string)}${mv[i + 1] ? ` ${esc(mv[i + 1] as string)}` : ''}</li>`);
  }
  return `<ol class="chess-moves" data-chess-moves>${pairs.join('')}</ol>`;
}

export function renderChess(view: RoomView, ui: ChessUi, clockOffsetMs: number): string {
  const ch = view.chess;
  const meta = ch.phase === 'seating' ? '' : COPY.chess.move(Math.floor(ch.ply / 2) + 1);
  const header = `<header class="bar"><button class="btn btn--ghost btn--sm" data-go="lobby">${COPY.back}</button><h1 class="bar__title">${COPY.chess.title}</h1><span class="bar__meta">${meta}</span></header>`;
  // Your own side at the bottom; spectators see White at the bottom.
  const bottom: Side = ch.me.color === 'b' ? 'b' : 'w';
  const top: Side = bottom === 'w' ? 'b' : 'w';
  const intro = ch.phase === 'seating' ? `<div class="chess-intro"><div class="game-hero" aria-hidden="true">${CHESS_ART}</div><p class="lede">${COPY.chess.rules}</p></div>` : '';
  return `${header}
    <div class="chess-grid">
      <section class="panel chess-main">
        ${intro}
        ${playerStrip(view, top, clockOffsetMs)}
        ${promoPicker(view, ui)}
        ${board(view, ui)}
        ${playerStrip(view, bottom, clockOffsetMs)}
        ${statusLine(view)}
        ${controls(view, ui)}
      </section>
      <aside class="panel chess-side"><h3 class="eyebrow">${COPY.chess.moves}</h3>${moveList(view)}</aside>
    </div>`;
}
