// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// Degens Against Decency table. Renders whatever the server says; never decides anything itself.

import { COPY } from '../copy.js';
import { fillPrompt } from '../../shared/deck.js';
import { MAX_PLAYERS, MIN_PLAYERS } from '../../shared/dad.js';
import type { RoomView } from '../../shared/protocol.js';
import { avatarImg, esc, nameOf, podium, userById } from './util.js';
import { dadLogoUrl } from '../art.js';
import { inviteButton } from './invite.js';

function scoreboard(view: RoomView): string {
  const d = view.dad;
  if (!d.seats.length) return '';
  return `<ol class="scores">${d.seats
    .map(
      (s) => `<li class="score ${s.isJudge ? 'score--judge' : ''} ${s.id === view.you ? 'score--me' : ''}">
        ${avatarImg(userById(view, s.id), 'avatar avatar--sm')}
        <span class="score__name">${esc(nameOf(view, s.id))}</span>
        ${s.away ? `<span class="tag tag--away">${COPY.away}</span>` : ''}
        ${s.isJudge ? `<span class="tag">${COPY.dad.judgeTag}</span>` : s.submitted && d.phase === 'submitting' ? '<span class="tag tag--ok">in</span>' : ''}
        <span class="score__pts" data-pts="${esc(s.id)}">${s.score}</span>
      </li>`,
    )
    .join('')}</ol>${
    d.waiting.length ? `<p class="muted small">Next round: ${d.waiting.map((id) => esc(nameOf(view, id))).join(', ')}</p>` : ''
  }`;
}

function lastRoundNote(view: RoomView): string {
  const r = view.dad.lastRound;
  if (!r) return '';
  if (r.skipped === 'judge-left') return `<p class="note">${COPY.dad.judgeLeft}</p>`;
  if (r.skipped === 'not-enough-players') return `<p class="note">${COPY.dad.notEnough}</p>`;
  return '';
}

function seatControls(view: RoomView): string {
  const d = view.dad;
  if (d.me.seated) return `<button class="btn btn--ghost" data-act="dad.stand">${COPY.dad.stand}</button>`;
  if (d.me.waiting) return `<p class="muted">${COPY.dad.waitingForNext}</p>`;
  if (d.seats.length + d.waiting.length >= MAX_PLAYERS) return '<p class="muted">Table full.</p>';
  return `<button class="btn btn--primary" data-act="dad.sit">${COPY.dad.sit}</button>`;
}

export function renderDad(view: RoomView, target: number): string {
  const d = view.dad;
  const header = `<header class="bar"><button class="btn btn--ghost btn--sm" data-go="lobby">${COPY.back}</button><img class="bar__logo" src="${dadLogoUrl}" alt="" width="240" height="240" /><h1 class="bar__title">${esc(COPY.tiles.dad.name)}</h1><span class="bar__meta">${d.round ? `R${d.round} / to ${d.targetScore}` : ''}</span></header>`;

  if (d.phase === 'seating' || d.phase === 'paused') {
    const canStart = d.me.seated && d.seats.length >= MIN_PLAYERS;
    return `${header}
      <section class="panel dad-seating">
        <div class="game-hero game-hero--dad" aria-hidden="true"><img src="${dadLogoUrl}" alt="" width="240" height="240" /></div>
        <h2 class="h2">${d.phase === 'paused' ? COPY.dad.paused : COPY.dad.seatingTitle}</h2>
        ${lastRoundNote(view)}
        <p class="muted">${COPY.dad.seatingBody(d.seats.length)}</p>
        ${scoreboard(view)}
        <div class="row">
          ${seatControls(view)}
          ${inviteButton()}
          ${
            d.phase === 'seating'
              ? `<label class="field">${COPY.dad.target}
                  <select data-target>${[3, 5, 7, 10].map((n) => `<option value="${n}" ${n === target ? 'selected' : ''}>${n}</option>`).join('')}</select>
                </label>`
              : ''
          }
          <button class="btn btn--primary" data-act="dad.start" ${canStart ? '' : 'disabled'}>${d.phase === 'paused' ? COPY.dad.resume : COPY.dad.start}</button>
        </div>
      </section>`;
  }

  if (d.phase === 'over') {
    return `${header}
      <section class="panel panel--win">
        <h2 class="h2">${esc(COPY.dad.gameOver(nameOf(view, d.winnerId)))}</h2>
        ${podium(view, [...d.seats].sort((a, b) => b.score - a.score))}
        ${d.lastRound?.winningText ? `<blockquote class="answer answer--win fx fx-flip">${esc(d.lastRound.winningText)}</blockquote>` : ''}
        ${scoreboard(view)}
        <div class="row">
          ${d.me.seated || d.me.waiting ? `<button class="btn btn--primary" data-act="dad.reset">${COPY.dad.playAgain}</button>` : seatControls(view)}
        </div>
      </section>`;
  }

  const promptBox = `<div class="prompt prompt--black fx fx-flip">${esc(d.prompt ?? '')}</div>`;
  let body = '';

  if (d.phase === 'submitting') {
    if (d.me.isJudge) {
      body = `<h3 class="h2 judge-note" data-judge-note>${COPY.dad.judgingRound}</h3><p class="status">${COPY.dad.judgeWait(d.submittedCount, d.neededCount)}</p>`;
    } else if (d.me.seated) {
      body = d.mySubmission
        ? `<p class="status">${COPY.dad.submitted}</p><blockquote class="answer">${esc(fillPrompt(d.prompt ?? '', d.mySubmission.text))}</blockquote>`
        : `<h3 class="eyebrow">${COPY.dad.playCard}</h3>`;
      body += `<div class="hand">${d.hand
        .map((c, i) => `<button class="card fx fx-deal" style="--i:${i}" data-card="${esc(c.id)}" ${d.mySubmission ? 'disabled' : ''}>${esc(c.text)}</button>`)
        .join('')}</div>`;
    } else {
      body = `<p class="muted">${d.me.waiting ? COPY.dad.waitingForNext : COPY.dad.spectating}</p>${seatControls(view)}`;
    }
  }

  if (d.phase === 'judging') {
    body = `<h3 class="eyebrow">${d.me.isJudge ? COPY.dad.pickTitle : COPY.dad.judgingOthers}</h3>
      <div class="answers">${d.entries
        .map((e, i) =>
          d.me.isJudge
            ? `<button class="answer answer--pick fx fx-flip" style="--i:${i}" data-entry="${esc(e.entryId)}">${esc(fillPrompt(d.prompt ?? '', e.text))}</button>`
            : `<div class="answer fx fx-flip" style="--i:${i}">${esc(fillPrompt(d.prompt ?? '', e.text))}</div>`,
        )
        .join('')}</div>`;
  }

  if (d.phase === 'reveal' && d.lastRound) {
    body = `<p class="status status--win fx fx-pop">${esc(COPY.dad.roundWinner(nameOf(view, d.lastRound.winnerId)))}</p>
      <blockquote class="answer answer--win fx fx-flip">${esc(d.lastRound.winningText ?? '')}</blockquote>
      ${d.me.seated ? `<button class="btn btn--primary" data-act="dad.next">${COPY.dad.nextRound}</button>` : ''}`;
  }

  return `${header}
    <div class="dad-grid">
      <section class="panel dad-main">${lastRoundNote(view)}${promptBox}${body}</section>
      <aside class="panel dad-side">${scoreboard(view)}<div class="row">${d.me.seated ? seatControls(view) : ''}${inviteButton()}</div></aside>
    </div>`;
}
