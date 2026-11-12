// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// Trivia. Renders whatever the server says; the correct answer only exists in the view after the reveal.

import { COPY } from '../copy.js';
import type { RoomView } from '../../shared/protocol.js';
import { avatarImg, esc, nameOf, userById } from './util.js';

const KEYS = ['A', 'B', 'C', 'D'];

export function secondsLeft(endsAt: number | null, clockOffsetMs: number): number {
  if (endsAt === null) return 0;
  return Math.max(0, Math.ceil((endsAt - (Date.now() + clockOffsetMs)) / 1000));
}

function board(view: RoomView, highlight: Record<string, number> = {}): string {
  const t = view.trivia;
  if (!t.scores.length) return '';
  return `<h3 class="eyebrow">${COPY.trivia.board}</h3><ol class="scores">${t.scores
    .map(
      (s, i) => `<li class="score ${s.id === view.you ? 'score--me' : ''}">
        <span class="score__rank">${i + 1}</span>
        ${avatarImg(userById(view, s.id), 'avatar avatar--sm')}
        <span class="score__name">${esc(nameOf(view, s.id))}</span>
        ${s.away ? `<span class="tag tag--away">${COPY.away}</span>` : ''}
        ${highlight[s.id] ? `<span class="tag tag--ok">+${highlight[s.id]}</span>` : ''}
        <span class="score__pts">${s.score}</span>
      </li>`,
    )
    .join('')}</ol>`;
}

export function renderTrivia(view: RoomView, clockOffsetMs: number): string {
  const t = view.trivia;
  const meta = t.number ? COPY.trivia.question(t.number, t.total) : '';
  const header = `<header class="bar"><button class="btn btn--ghost btn--sm" data-go="lobby">${COPY.back}</button><h1 class="bar__title">${COPY.trivia.title}</h1><span class="bar__meta">${meta}</span></header>`;

  if (t.phase === 'idle' || t.phase === 'over') {
    const over = t.phase === 'over';
    const winners = t.winnerIds.map((id) => nameOf(view, id)).join(', ');
    return `${header}
      <section class="panel trivia-panel ${over ? 'panel--win' : ''}">
        <h2 class="h2">${over ? (winners ? esc(COPY.trivia.winner(winners)) : COPY.trivia.noWinner) : COPY.trivia.title}</h2>
        ${over ? '' : `<p class="lede">${COPY.trivia.idleBody}</p><p class="muted small">${COPY.trivia.scoring}</p>`}
        ${over ? board(view) : ''}
        <button class="btn btn--primary btn--big" data-act="trivia.start">${over ? COPY.trivia.again : COPY.trivia.start}</button>
      </section>`;
  }

  if (t.phase === 'question' && t.question) {
    const q = t.question;
    const mine = t.me.answered;
    const canAnswer = t.me.playing && mine === null;
    const left = secondsLeft(t.endsAt, clockOffsetMs);
    return `${header}
      <section class="panel trivia-panel">
        <div class="trivia-top"><span class="clock clock--sm" data-trivia-clock>${left}</span><span class="muted small">${COPY.trivia.lockedCount(t.answeredCount, t.playingCount)}</span></div>
        <div class="prompt">${esc(q.text)}</div>
        <div class="choices">${q.choices
          .map(
            (c, i) =>
              `<button class="choice ${mine === i ? 'choice--mine' : ''}" data-qid="${esc(q.id)}" data-choice="${i}" ${canAnswer ? '' : 'disabled'}><span class="choice__key">${KEYS[i]}</span>${esc(c)}</button>`,
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
            `<div class="choice ${i === r.correct ? 'choice--correct' : mineResult?.choice === i ? 'choice--wrong' : ''}"><span class="choice__key">${KEYS[i]}</span>${esc(c)}<span class="choice__count">${COPY.trivia.answers(r.counts[i] ?? 0)}</span></div>`,
        )
        .join('')}</div>
      <p class="status ${mineResult?.correct ? 'status--win' : ''}">${esc(verdict)}</p>
      <p class="muted small">${COPY.trivia.nextUp}</p>
    </section>
    <aside class="panel">${board(view, gained)}</aside>`;
}
