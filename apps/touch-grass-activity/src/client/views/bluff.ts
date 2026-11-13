// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// Bluff (two truths and a lie). Renders whatever the server says; the lie only shows up in the view
// for the teller (their own statements) or after the reveal.

import { COPY } from '../copy.js';
import { MAX_PLAYERS, MAX_STATEMENT_CHARS, MIN_PLAYERS } from '../../shared/bluff.js';
import type { RoomView } from '../../shared/protocol.js';
import { avatarImg, esc, nameOf, podium, userById } from './util.js';
import { BLUFF_ART } from '../art.js';

const KEYS = ['A', 'B', 'C'];

/** What the teller has typed so far. Lives in the client so a re-render never wipes it. */
export interface BluffDraft {
  statements: [string, string, string];
  lie: number | null;
}

export function emptyDraft(): BluffDraft {
  return { statements: ['', '', ''], lie: null };
}

/** Seconds left on whichever Bluff clock is running. */
export function bluffSecondsLeft(view: RoomView, clockOffsetMs: number): number | null {
  const b = view.bluff;
  const end = b.phase === 'writing' ? b.writeEndsAt : b.phase === 'guessing' ? b.guessEndsAt : null;
  if (end === null) return null;
  return Math.max(0, Math.ceil((end - (Date.now() + clockOffsetMs)) / 1000));
}

function board(view: RoomView): string {
  const b = view.bluff;
  if (!b.seats.length) return '';
  const order = b.phase === 'seating' ? b.seats : [...b.seats].sort((x, y) => y.score - x.score);
  return `<h3 class="eyebrow">${COPY.bluff.board}</h3><ol class="scores">${order
    .map(
      (s) => `<li class="score ${s.isTeller ? 'score--judge' : ''} ${s.id === view.you ? 'score--me' : ''}">
        ${avatarImg(userById(view, s.id), 'avatar avatar--sm')}
        <span class="score__name">${esc(nameOf(view, s.id))}</span>
        ${s.away ? `<span class="tag tag--away">${COPY.away}</span>` : ''}
        ${s.isTeller ? `<span class="tag">${COPY.bluff.tellerTag}</span>` : s.guessed ? '<span class="tag tag--ok">in</span>' : ''}
        <span class="score__pts" data-pts="${esc(s.id)}">${s.score}</span>
      </li>`,
    )
    .join('')}</ol>${b.waiting.length ? `<p class="muted small">Next game: ${b.waiting.map((id) => esc(nameOf(view, id))).join(', ')}</p>` : ''}`;
}

function seatControls(view: RoomView): string {
  const b = view.bluff;
  if (b.me.seated) return `<button class="btn btn--ghost" data-act="bluff.stand">${COPY.bluff.stand}</button>`;
  if (b.me.waiting) return `<p class="muted">${COPY.bluff.waitingForNext}</p>`;
  if (b.seats.length + b.waiting.length >= MAX_PLAYERS) return '<p class="muted">Table full.</p>';
  return `<button class="btn btn--primary" data-act="bluff.sit">${COPY.bluff.sit}</button>`;
}

function skipNote(view: RoomView): string {
  const r = view.bluff.lastRound;
  if (!r || !r.skipped) return '';
  const msg = r.skipped === 'teller-left' ? COPY.bluff.skippedLeft : r.skipped === 'teller-timeout' ? COPY.bluff.skippedTimeout : COPY.bluff.skippedShort;
  return `<p class="note">${msg}</p>`;
}

export function winnerNames(view: RoomView): string[] {
  const ids = [...view.bluff.winnerIds].sort((a, b) => Number(b === view.you) - Number(a === view.you));
  return ids.map((id) => nameOf(view, id));
}

function revealBlock(view: RoomView): string {
  const r = view.bluff.lastRound;
  if (!r || r.skipped || !r.statements || r.lie === null) return '';
  const teller = nameOf(view, r.tellerId);
  const mine = r.picks.find((p) => p.id === view.you);
  const verdict = r.tellerId === view.you ? '' : !mine ? '' : mine.correct ? COPY.bluff.youRight : mine.pick === null ? COPY.bluff.youMissed : COPY.bluff.youWrong;
  return `<h2 class="h2">${esc(COPY.bluff.reveal(teller))}</h2>
    <div class="prompt prompt--sm">${esc(r.prompt)}</div>
    <div class="choices">${r.statements
      .map((text, i) => {
        const who = r.picks.filter((p) => p.pick === i).map((p) => nameOf(view, p.id));
        return `<div class="choice fx fx-flip ${i === r.lie ? 'choice--correct choice--lie' : mine?.pick === i ? 'choice--wrong' : ''}" style="--i:${i}" data-statement="${i}">
          <span class="choice__key">${KEYS[i]}</span><span class="choice__text">${esc(text)}${i === r.lie ? ` <span class="tag tag--lie fx fx-stamp">${COPY.bluff.lieTag}</span>` : ''}</span>
          <span class="choice__count" data-picked-by="${i}">${who.length ? esc(who.join(', ')) : COPY.bluff.nobodyPicked}</span></div>`;
      })
      .join('')}</div>
    ${verdict ? `<p class="status ${mine?.correct ? 'status--win fx fx-pop' : ''}">${verdict}</p>` : ''}
    <p class="muted">${esc(COPY.bluff.tellerScored(teller, r.tellerPoints))}</p>`;
}

export function renderBluff(view: RoomView, draft: BluffDraft, clockOffsetMs: number): string {
  const b = view.bluff;
  const meta = b.round && b.total ? COPY.bluff.round(Math.min(b.round, b.total), b.total) : '';
  const header = `<header class="bar"><button class="btn btn--ghost btn--sm" data-go="lobby">${COPY.back}</button><h1 class="bar__title">${COPY.bluff.title}</h1><span class="bar__meta">${meta}</span></header>`;
  const left = bluffSecondsLeft(view, clockOffsetMs);
  const clock = left === null ? '' : `<span class="clock clock--sm" data-bluff-clock>${left}</span>`;

  if (b.phase === 'seating' || b.phase === 'paused') {
    const canStart = b.me.seated && b.seats.length >= MIN_PLAYERS;
    return `${header}
      <section class="panel bluff-panel">
        <div class="game-hero" aria-hidden="true">${BLUFF_ART}</div>
        <h2 class="h2">${b.phase === 'paused' ? COPY.bluff.paused : COPY.bluff.seatingTitle}</h2>
        ${skipNote(view)}
        <p class="lede">${COPY.bluff.rules}</p>
        <p class="muted">${COPY.bluff.seatingBody(b.seats.length)}</p>
        ${board(view)}
        <div class="row">
          ${seatControls(view)}
          <button class="btn btn--primary" data-act="bluff.start" ${canStart ? '' : 'disabled'}>${b.phase === 'paused' ? COPY.bluff.resume : COPY.bluff.start}</button>
        </div>
      </section>`;
  }

  if (b.phase === 'over') {
    const winners = winnerNames(view);
    const canGo = b.me.seated || b.me.waiting;
    return `${header}
      <section class="panel panel--win bluff-panel">
        <h2 class="h2" data-bluff-winner>${winners.length ? esc(COPY.bluff.winner(winners)) : COPY.bluff.noWinner}</h2>
        ${podium(view, [...b.seats].sort((x, y) => y.score - x.score))}
        ${revealBlock(view)}
        <h3 class="eyebrow">${COPY.bluff.overTitle}</h3>
        ${board(view)}
        <div class="row">${canGo ? `<button class="btn btn--primary" data-act="bluff.start" ${b.seats.length + b.waiting.length >= MIN_PLAYERS ? '' : 'disabled'}>${COPY.bluff.again}</button>` : ''}${seatControls(view)}</div>
      </section>`;
  }

  const teller = nameOf(view, b.tellerId);
  let body = '';

  if (b.phase === 'writing') {
    if (b.me.isTeller) {
      const ready = draft.lie !== null && draft.statements.every((x) => x.trim().length > 0);
      body = `<p class="status">${COPY.bluff.yourTurn}</p><p class="muted small">${COPY.bluff.writeHint}</p>
        <div class="bluff-write">${draft.statements
          .map(
            (text, i) => `<div class="bluff-line ${draft.lie === i ? 'bluff-line--lie' : ''}">
              <input class="bluff-input" type="text" data-draft="${i}" maxlength="${MAX_STATEMENT_CHARS}" placeholder="${esc(COPY.bluff.placeholder(i + 1))}" value="${esc(text)}" autocomplete="off" />
              <button class="btn btn--sm ${draft.lie === i ? 'btn--primary' : 'btn--ghost'}" data-lie="${i}" aria-pressed="${draft.lie === i}">${draft.lie === i ? COPY.bluff.isLie : COPY.bluff.mark}</button>
            </div>`,
          )
          .join('')}</div>
        <button class="btn btn--primary btn--big" data-act="bluff.tell" ${ready ? '' : 'disabled'}>${COPY.bluff.send}</button>`;
    } else {
      body = `<p class="status">${esc(COPY.bluff.writing(teller))}</p>${b.me.seated ? '' : `<p class="muted">${b.me.waiting ? COPY.bluff.waitingForNext : COPY.bluff.spectating}</p>${seatControls(view)}`}`;
    }
  }

  if (b.phase === 'guessing' && b.statements) {
    if (b.me.isTeller && b.me.mine) {
      const mine = b.me.mine;
      body = `<p class="status">${COPY.bluff.yourLie}</p><div class="choices">${mine.statements
        .map((text, i) => `<div class="choice fx fx-flip ${i === mine.lie ? 'choice--mine' : ''}" style="--i:${i}"><span class="choice__key">${KEYS[i]}</span><span class="choice__text">${esc(text)}${i === mine.lie ? ` <span class="tag tag--lie">${COPY.bluff.lieTag}</span>` : ''}</span></div>`)
        .join('')}</div>`;
    } else {
      const canGuess = b.me.seated && b.me.guess === null;
      body = `<h3 class="eyebrow">${COPY.bluff.pickLie}</h3><div class="choices">${b.statements
        .map(
          (text, i) =>
            `<button class="choice fx fx-flip ${b.me.guess === i ? 'choice--mine' : ''}" style="--i:${i}" data-rid="${esc(b.rid ?? '')}" data-pick="${i}" ${canGuess ? '' : 'disabled'}><span class="choice__key">${KEYS[i]}</span><span class="choice__text">${esc(text)}</span></button>`,
        )
        .join('')}</div>
        <p class="status">${!b.me.seated ? (b.me.waiting ? COPY.bluff.waitingForNext : COPY.bluff.spectating) : b.me.guess !== null ? COPY.bluff.locked : ''}</p>`;
    }
    body += `<p class="muted small">${COPY.bluff.guessCount(b.guessedCount, b.neededCount)}</p>`;
  }

  if (b.phase === 'reveal') {
    body = `${revealBlock(view)}${b.me.seated ? `<button class="btn btn--primary" data-act="bluff.next">${COPY.bluff.next}</button>` : ''}`;
  }

  const promptBox = b.phase === 'reveal' ? '' : `<div class="prompt prompt--smoke">${esc(b.prompt ?? '')}</div>`;
  return `${header}
    <div class="dad-grid">
      <section class="panel dad-main bluff-panel">${skipNote(view)}<div class="trivia-top">${clock}<span class="muted small">${esc(b.tellerId ? `${COPY.bluff.tellerTag}: ${teller}` : '')}</span></div>${promptBox}${body}</section>
      <aside class="panel dad-side">${board(view)}${b.me.seated ? seatControls(view) : ''}</aside>
    </div>`;
}
