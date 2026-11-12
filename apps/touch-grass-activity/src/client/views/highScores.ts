// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// Trivia high scores for this server: This week / All time tabs. Read only; the server writes it.

import { COPY } from '../copy.js';
import type { BoardView, ScoreRow } from '../../shared/scores.js';
import { avatarImg, esc } from './util.js';

export type ScoresTab = 'week' | 'all';

/** What the client knows about the board. null = still loading. */
export type ScoresResult = { kind: 'board'; board: BoardView; guest?: boolean } | { kind: 'no-server' } | { kind: 'error' };

function row(r: ScoreRow, rank: number, you: string): string {
  return `<li class="score ${r.id === you ? 'score--me' : ''}" data-hs-row="${esc(r.id)}">
    <span class="score__rank">${rank}</span>
    ${avatarImg({ id: r.id, avatar: r.avatar, name: r.name }, 'avatar avatar--sm')}
    <span class="score__name">${esc(r.name)}</span>
    <span class="score__pts">${r.score}</span>
  </li>`;
}

export function renderHighScores(result: ScoresResult | null, tab: ScoresTab, you: string): string {
  const tabs = `<div class="hs-tabs" role="tablist">${(['week', 'all'] as const)
    .map(
      (t) =>
        `<button class="hs-tab ${t === tab ? 'hs-tab--on' : ''}" role="tab" aria-selected="${t === tab}" data-scores-tab="${t}">${t === 'week' ? COPY.highScores.week : COPY.highScores.allTime}</button>`,
    )
    .join('')}</div>`;
  const head = `<div class="hs-head"><h2 class="eyebrow">${COPY.highScores.title}</h2>${result?.kind === 'board' ? tabs : ''}</div>`;

  let body: string;
  if (!result) body = `<p class="muted small">${COPY.highScores.loading}</p>`;
  else if (result.kind === 'no-server') body = `<p class="muted small">${COPY.highScores.noServer}</p>`;
  else if (result.kind === 'error') body = `<p class="muted small">${COPY.highScores.error}</p>`;
  else {
    const b = result.board;
    const rows = tab === 'week' ? b.week : b.allTime;
    const mine = tab === 'week' ? b.me.week : b.me.allTime;
    const onBoard = rows.some((r) => r.id === you);
    const list = rows.length ? `<ol class="scores">${rows.map((r, i) => row(r, i + 1, you)).join('')}</ol>` : `<p class="muted small">${COPY.highScores.empty}</p>`;
    const me =
      mine && !onBoard
        ? `<div class="score score--me score--pb" data-hs-mine><span class="score__rank">-</span><span class="score__name">${COPY.highScores.yourBest} <span class="muted small">${COPY.highScores.offBoard}</span></span><span class="score__pts">${mine.score}</span></div>`
        : '';
    body = `${list}${me}${result.guest ? `<p class="muted small">${COPY.highScores.guest}</p>` : ''}`;
  }
  return `<section class="panel hs" data-high-scores>${head}${body}<p class="muted small hs-foot">${COPY.highScores.footnote}</p></section>`;
}
