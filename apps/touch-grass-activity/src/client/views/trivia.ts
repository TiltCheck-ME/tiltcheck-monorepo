// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// Trivia. Renders whatever the server says; the correct answer only exists in the view after the reveal.

import { COPY } from '../copy.js';
import type { RoomView } from '../../shared/protocol.js';
import { avatarImg, esc, medal, nameOf, placeOf, podium, userById } from './util.js';
import { TRIVIA_ART } from '../art.js';
import { renderHighScores, type ScoresResult, type ScoresTab } from './highScores.js';

const KEYS = ['A', 'B', 'C', 'D'];

export function secondsLeft(endsAt: number | null, clockOffsetMs: number): number {
  if (endsAt === null) return 0;
  return Math.max(0, Math.ceil((endsAt - (Date.now() + clockOffsetMs)) / 1000));
}

function board(view: RoomView, highlight: Record<string, number> = {}): string {
  const t = view.trivia;
  if (!t.scores.length) return '';
  const all = t.scores.map((s) => s.score);
  return `<h3 class="eyebrow">${COPY.trivia.board}</h3><ol class="scores">${t.scores
    .map(
      (s) => `<li class="score ${s.id === view.you ? 'score--me' : ''}${medal(placeOf(s.score, all), s.score)}">
        <span class="score__rank">${placeOf(s.score, all)}</span>
        ${avatarImg(userById(view, s.id), 'avatar avatar--sm')}
        <span class="score__name">${esc(nameOf(view, s.id))}</span>
        ${s.away ? `<span class="tag tag--away">${COPY.away}</span>` : ''}
        ${highlight[s.id] ? `<span class="tag tag--ok tag--gain">+${highlight[s.id]}</span>` : ''}
        <span class="score__pts" data-pts="${esc(s.id)}">${s.score}</span>
      </li>`,
    )
    .join('')}</ol>`;
}

/** End-screen line about the server board: rank and/or personal best, or why there is none. */
export function bragLine(view: RoomView): string {
  const t = view.trivia;
  if (t.phase !== 'over') return '';
  if (t.highScores === 'off-record') return COPY.highScores.noServer;
  if (t.highScores === 'pending') return t.me.playing ? COPY.highScores.pending : '';
  const b = t.me.brag;
  if (!b) return '';
  const bits: string[] = [];
  if (b.allTimeRank !== null && b.allTimeRank <= 3) bits.push(COPY.highScores.rankAll(b.allTimeRank));
  else if (b.weekRank !== null) bits.push(COPY.highScores.rankWeek(b.weekRank));
  else if (b.allTimeRank !== null) bits.push(COPY.highScores.rankAll(b.allTimeRank));
  if (b.personalBest) bits.push(COPY.highScores.newBest);
  return bits.join(' ');
}

/** Winners in board order, the viewer first and shown as "You". */
export function winnerNames(view: RoomView): string[] {
  const ids = [...view.trivia.winnerIds].sort((a, b) => Number(b === view.you) - Number(a === view.you));
  return ids.map((id) => nameOf(view, id));
}

export function renderTrivia(view: RoomView, clockOffsetMs: number, scores: ScoresResult | null = null, tab: ScoresTab = 'week'): string {
  const t = view.trivia;
  const meta = t.number ? COPY.trivia.question(t.number, t.total) : '';
  const header = `<header class="bar"><button class="btn btn--ghost btn--sm" data-go="lobby">${COPY.back}</button><h1 class="bar__title">${COPY.trivia.title}</h1><span class="bar__meta">${meta}</span></header>`;

  if (t.phase === 'idle' || t.phase === 'over') {
    const over = t.phase === 'over';
    const winners = winnerNames(view);
    const brag = bragLine(view);
    return `${header}
      <section class="panel trivia-panel ${over ? 'panel--win' : 'trivia-idle'}">
        ${over ? '' : `<div class="game-hero" aria-hidden="true">${TRIVIA_ART}</div>`}
        <h2 class="h2" data-trivia-winner>${over ? (winners.length ? esc(COPY.trivia.winner(winners)) : COPY.trivia.noWinner) : COPY.trivia.title}</h2>
        ${brag ? `<p class="brag ${t.me.brag && (t.me.brag.personalBest || t.me.brag.weekRank !== null) ? 'brag--hit' : ''}" data-brag>${esc(brag)}</p>` : ''}
        ${over ? '' : `<p class="lede">${COPY.trivia.idleBody}</p><p class="muted small">${COPY.trivia.scoring}</p>`}
        ${over ? podium(view, t.scores) : ''}
        ${over ? board(view) : ''}
        <button class="btn btn--primary btn--big" data-act="trivia.start">${over ? COPY.trivia.again : COPY.trivia.start}</button>
      </section>
      ${renderHighScores(scores, tab, view.you)}`;
  }

  if (t.phase === 'question' && t.question) {
    const q = t.question;
    const mine = t.me.answered;
    const canAnswer = t.me.playing && mine === null;
    const left = secondsLeft(t.endsAt, clockOffsetMs);
    return `${header}
      <section class="panel trivia-panel">
        <div class="trivia-top"><span class="clock clock--sm" data-trivia-clock>${left}</span><span class="muted small">${COPY.trivia.lockedCount(t.answeredCount, t.playingCount)}</span></div>
        <div class="prompt fx fx-flip">${esc(q.text)}</div>
        <div class="choices">${q.choices
          .map(
            (c, i) =>
              `<button class="choice choice--k${i} fx fx-rise ${mine === i ? 'choice--mine' : ''}" style="--i:${i + 1}" data-qid="${esc(q.id)}" data-choice="${i}" ${canAnswer ? '' : 'disabled'}><span class="choice__key">${KEYS[i]}</span>${esc(c)}</button>`,
          )
          .join('')}</div>
        <p class="status">${!t.me.playing ? COPY.trivia.spectating : mine !== null ? COPY.trivia.locked : ''}</p>
      </section>
      <aside class="panel">${board(view)}</aside>`;
  }

  // reveal
  const r = t.reveal;
  if (!r) return `${header}<section class="panel"><p class="muted">${COPY.trivia.nextUp}</p></section>`;
  const mineResult = r.results.find((x) => x.id === view.you);
  const verdict = !mineResult ? COPY.trivia.spectating : mineResult.correct ? COPY.trivia.right(mineResult.points) : mineResult.choice === null ? COPY.trivia.missed : COPY.trivia.wrong;
  const gained: Record<string, number> = {};
  for (const x of r.results) if (x.points) gained[x.id] = x.points;
  return `${header}
    <section class="panel trivia-panel">
      <div class="prompt">${esc(r.text)}</div>
      <div class="choices">${r.choices
        .map(
          (c, i) =>
            `<div class="choice choice--k${i} ${i === r.correct ? 'choice--correct fx fx-reveal' : mineResult?.choice === i ? 'choice--wrong fx fx-nope' : ''}"><span class="choice__key">${KEYS[i]}</span>${esc(c)}<span class="choice__count">${COPY.trivia.answers(r.counts[i] ?? 0)}</span></div>`,
        )
        .join('')}</div>
      <p class="status ${mineResult?.correct ? 'status--win fx fx-pop' : ''}">${esc(verdict)}</p>
      <p class="muted small">${COPY.trivia.nextUp}</p>
    </section>
    <aside class="panel">${board(view, gained)}</aside>`;
}
