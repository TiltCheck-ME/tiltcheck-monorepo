// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// Myth or Math. Renders whatever the server says; the truth and the "why" only show up after the
// player has called the card (or the clock ran out).

import { COPY } from '../copy.js';
import type { RoomView } from '../../shared/protocol.js';
import { avatarImg, esc, medal, placeOf } from './util.js';
import { MYTH_ART } from '../art.js';

export function mythSecondsLeft(view: RoomView, clockOffsetMs: number): number | null {
  const r = view.myth.run;
  if (!r || r.phase !== 'card' || r.endsAt === null) return null;
  return Math.max(0, Math.ceil((r.endsAt - (Date.now() + clockOffsetMs)) / 1000));
}

function dots(results: boolean[], total: number): string {
  return `<div class="mm-dots" aria-label="${results.filter(Boolean).length} of ${results.length} right so far">${Array.from(
    { length: total },
    (_, i) => `<span class="mm-dot ${i < results.length ? (results[i] ? 'mm-dot--ok' : 'mm-dot--miss') : ''}"></span>`,
  ).join('')}</div>`;
}

function board(view: RoomView): string {
  const b = view.myth.board;
  let body: string;
  if (b.kind === 'no-server') body = `<p class="muted small">${COPY.highScores.noServer}</p>`;
  else if (b.kind === 'loading') body = `<p class="muted small">${COPY.highScores.loading}</p>`;
  else if (!b.rows.length) body = `<p class="muted small">${COPY.myth.boardEmpty}</p>`;
  else {
    const all = b.rows.map((r) => r.score);
    body = `<ol class="scores">${b.rows
      .map((r) => {
        const place = placeOf(r.score, all);
        return `<li class="score ${r.id === view.you ? 'score--me' : ''}${medal(place, r.score)}" data-mm-row="${esc(r.id)}"><span class="score__rank">${place}</span>${avatarImg(
          { id: r.id, avatar: r.avatar, name: r.name },
          'avatar avatar--sm',
        )}<span class="score__name">${esc(r.id === view.you ? 'You' : r.name)}</span><span class="score__pts">${r.score}</span></li>`;
      })
      .join('')}</ol>`;
  }
  return `<section class="panel hs" data-mm-board><div class="hs-head"><h2 class="eyebrow">${COPY.myth.title}: ${COPY.myth.board}</h2></div>${body}<p class="muted small hs-foot">${COPY.myth.boardFoot}</p></section>`;
}

function bragLine(view: RoomView): string {
  const r = view.myth.run;
  if (!r || r.phase !== 'over') return '';
  if (r.board === 'off-record') return COPY.highScores.noServer;
  if (r.board === 'pending') return COPY.myth.pending;
  const b = r.brag;
  if (!b) return '';
  const bits: string[] = [];
  if (b.weekRank !== null) bits.push(COPY.myth.rankWeek(b.weekRank));
  if (b.personalBest) bits.push(COPY.myth.newBest);
  return bits.join(' ');
}

export function renderMyth(view: RoomView, clockOffsetMs: number, guest: boolean): string {
  const r = view.myth.run;
  const meta = r && r.phase !== 'over' ? COPY.myth.card(r.number, r.total) : '';
  const header = `<header class="bar"><button class="btn btn--ghost btn--sm" data-go="lobby">${COPY.back}</button><h1 class="bar__title">${COPY.myth.title}</h1><span class="bar__meta">${meta}</span></header>`;

  if (!r || r.phase === 'over') {
    const over = Boolean(r);
    const brag = bragLine(view);
    return `${header}
      <section class="panel myth-panel ${over ? 'panel--win' : 'myth-idle'}">
        ${over ? '' : `<div class="game-hero" aria-hidden="true">${MYTH_ART}</div>`}
        <h2 class="h2" data-mm-title>${over && r ? esc(COPY.myth.overTitle(r.score)) : COPY.myth.title}</h2>
        ${over && r ? `<p class="lede">${esc(COPY.myth.overLine(r.correctCount, r.total))}</p>${dots(r.results, r.total)}` : `<p class="lede">${COPY.myth.rules}</p>`}
        ${brag ? `<p class="brag ${r?.brag && (r.brag.personalBest || r.brag.weekRank !== null) ? 'brag--hit' : ''}" data-mm-brag>${esc(brag)}</p>` : ''}
        <p class="muted small">${COPY.myth.bragging}${guest ? ` ${COPY.highScores.guest}` : ''}</p>
        <button class="btn btn--primary btn--big" data-act="myth.start">${over ? COPY.myth.again : COPY.myth.start}</button>
      </section>
      ${board(view)}`;
  }

  if (r.phase === 'card' || r.phase === 'paused') {
    const left = mythSecondsLeft(view, clockOffsetMs);
    const c = r.card;
    const can = r.phase === 'card' && c;
    return `${header}
      <section class="panel myth-panel">
        <div class="trivia-top"><span class="clock clock--sm ${left !== null && left <= 3 ? 'clock--low' : ''}" data-myth-clock aria-hidden="true">${left ?? ''}</span><span class="mm-score" aria-label="Score ${r.score}">${r.score}</span></div>
        ${dots(r.results, r.total)}
        <div class="prompt mm-card fx fx-flip" data-mm-card>${esc(c?.text ?? '')}</div>
        ${r.phase === 'paused' ? `<p class="status">${COPY.myth.paused}</p>` : ''}
        <div class="mm-calls">
          <button class="mm-call mm-call--myth fx fx-rise" style="--i:1" data-mrid="${esc(r.runId)}" data-mcid="${esc(c?.id ?? '')}" data-mpick="false" aria-label="${COPY.myth.mythLabel}" ${can ? '' : 'disabled'}>${COPY.myth.myth}</button>
          <button class="mm-call mm-call--math fx fx-rise" style="--i:2" data-mrid="${esc(r.runId)}" data-mcid="${esc(c?.id ?? '')}" data-mpick="true" aria-label="${COPY.myth.mathLabel}" ${can ? '' : 'disabled'}>${COPY.myth.math}</button>
        </div>
      </section>`;
  }

  // reveal
  const rv = r.reveal;
  const verdict = !rv ? '' : rv.pick === null ? COPY.myth.timeout : rv.correct ? COPY.myth.right(rv.points) : COPY.myth.wrong;
  const last = r.number >= r.total;
  return `${header}
    <section class="panel myth-panel">
      <div class="trivia-top"><span class="muted small">${COPY.myth.card(r.number, r.total)}</span><span class="mm-score" data-pts="myth-${esc(view.you)}">${r.score}</span></div>
      ${dots(r.results, r.total)}
      ${
        rv
          ? `<div class="prompt mm-card mm-card--reveal ${rv.truth ? 'mm-card--math' : 'mm-card--myth'}" data-mm-reveal>${esc(rv.text)}
        <span class="mm-stamp fx fx-stamp" data-mm-stamp>${rv.truth ? COPY.myth.stampMath : COPY.myth.stampMyth}</span></div>
      <p class="status ${rv.correct ? 'status--win fx fx-pop' : ''}" role="status">${esc(verdict)}</p>
      <p class="mm-why" data-mm-why>${esc(rv.why)}</p>`
          : ''
      }
      <button class="btn btn--primary btn--big" data-act="myth.next">${last ? COPY.myth.finish : COPY.myth.next}</button>
    </section>`;
}
