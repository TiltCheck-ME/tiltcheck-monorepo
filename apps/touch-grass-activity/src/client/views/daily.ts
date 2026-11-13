// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// Daily Grass. Renders whatever the server says: the viewer's own rows and colors, friends' progress
// (rows used, solved or not, never letters) and this server's Today's solvers. The answer only shows
// up in the view once the viewer's own game is over.

import { COPY } from '../copy.js';
import type { RoomView } from '../../shared/protocol.js';
import { MAX_GUESSES, WORD_LEN, puzzleNumber, shareText, type Tile } from '../../shared/daily.js';
import { avatarImg, esc, medal, nameOf, userById } from './util.js';
import { DAILY_ART } from '../art.js';

const KEY_ROWS = ['qwertyuiop', 'asdfghjkl', '+zxcvbnm-'];
const RANK: Record<Tile, number> = { b: 1, y: 2, g: 3 };

/** Best color seen for each letter, for the on-screen keyboard. */
export function keyColors(rows: Array<{ word: string; colors: Tile[] }>): Record<string, Tile> {
  const out: Record<string, Tile> = {};
  for (const r of rows) {
    for (let i = 0; i < r.word.length; i += 1) {
      const ch = r.word[i] as string;
      const c = r.colors[i] as Tile;
      if (!out[ch] || RANK[c] > RANK[out[ch] as Tile]) out[ch] = c;
    }
  }
  return out;
}

export function dailyShare(view: RoomView): string | null {
  const me = view.daily.me;
  if (!me || me.status === 'playing') return null;
  return shareText(COPY.daily.title, me);
}

function mmss(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

function tileHtml(ch: string, color: Tile | null, i: number, state: 'done' | 'typing' | 'empty'): string {
  const letter = ch ? ch.toUpperCase() : '';
  const label = state === 'done' && color ? `${letter}, ${COPY.daily.tile[color]}` : letter ? `${letter}, typed` : 'empty';
  const cls = color ? `dg-tile--${color} fx fx-flip` : state === 'typing' && letter ? 'dg-tile--typed' : '';
  return `<span class="dg-tile ${cls}" role="gridcell" aria-label="${label}" style="--i:${i}">${esc(letter)}</span>`;
}

function grid(view: RoomView, draft: string): string {
  const me = view.daily.me;
  const rows = me?.rows ?? [];
  const playing = me?.status === 'playing';
  const out: string[] = [];
  for (let r = 0; r < MAX_GUESSES; r += 1) {
    const done = rows[r];
    let cells = '';
    let label: string;
    if (done) {
      for (let i = 0; i < WORD_LEN; i += 1) cells += tileHtml(done.word[i] ?? '', done.colors[i] ?? 'b', i, 'done');
      label = `Guess ${r + 1}: ${done.word.toUpperCase()}`;
    } else if (playing && r === rows.length) {
      for (let i = 0; i < WORD_LEN; i += 1) cells += tileHtml(draft[i] ?? '', null, i, 'typing');
      label = `Guess ${r + 1}, typing`;
    } else {
      for (let i = 0; i < WORD_LEN; i += 1) cells += tileHtml('', null, i, 'empty');
      label = `Guess ${r + 1}, empty`;
    }
    out.push(`<div class="dg-row ${done ? 'dg-row--done' : ''}" role="row" aria-label="${label}" data-dg-row="${r}">${cells}</div>`);
  }
  return `<div class="dg-grid" role="grid" aria-label="Daily Grass board" data-dg-grid>${out.join('')}</div>`;
}

function keyboard(view: RoomView, enabled: boolean): string {
  const colors = keyColors(view.daily.me?.rows ?? []);
  return `<div class="dg-keys" role="group" aria-label="Keyboard">${KEY_ROWS.map(
    (row) =>
      `<div class="dg-keyrow">${[...row]
        .map((k) => {
          if (k === '+') return `<button type="button" class="dg-key dg-key--wide" data-dg-key="enter" aria-label="${COPY.daily.enter}" ${enabled ? '' : 'disabled'}>${COPY.daily.enter}</button>`;
          if (k === '-')
            return `<button type="button" class="dg-key dg-key--wide" data-dg-key="back" aria-label="${COPY.daily.back}" ${enabled ? '' : 'disabled'}><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 6h11v12H9l-6-6zM12 9l6 6M18 9l-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg></button>`;
          const c = colors[k];
          const state = c ? `, ${COPY.daily.tile[c]}` : '';
          return `<button type="button" class="dg-key ${c ? `dg-key--${c}` : ''}" data-dg-key="${k}" aria-label="${k.toUpperCase()}${state}" ${enabled ? '' : 'disabled'}>${k.toUpperCase()}</button>`;
        })
        .join('')}</div>`,
  ).join('')}</div>`;
}

function friends(view: RoomView): string {
  const list = view.daily.friends;
  if (!list.length) return '';
  return `<h3 class="eyebrow">${COPY.daily.friends}</h3><ul class="dg-friends">${list
    .map(
      (f) => `<li class="dg-friend" data-dg-friend="${esc(f.id)}">${avatarImg(userById(view, f.id), 'avatar avatar--sm')}<span class="score__name">${esc(nameOf(view, f.id))}</span>
        <span class="dg-dots" aria-hidden="true">${Array.from({ length: MAX_GUESSES }, (_, i) => `<span class="dg-dot ${i < f.rows ? (f.status === 'won' && i === f.rows - 1 ? 'dg-dot--win' : 'dg-dot--on') : ''}"></span>`).join('')}</span>
        <span class="tag ${f.status === 'won' ? 'tag--ok' : f.status === 'lost' ? 'tag--away' : 'tag--soft'}">${f.status === 'won' ? COPY.daily.solved : f.status === 'lost' ? COPY.daily.out : COPY.daily.friendRows(f.rows)}</span>
        ${f.away ? `<span class="tag tag--away">${COPY.away}</span>` : ''}</li>`,
    )
    .join('')}</ul>`;
}

function stats(view: RoomView): string {
  const me = view.daily.me;
  if (!me || me.status === 'playing') return '';
  const s = me.stats;
  const max = Math.max(1, ...s.dist);
  const pct = s.played ? Math.round((100 * s.wins) / s.played) : 0;
  const cell = (n: number | string, label: string) => `<div class="dg-stat"><span class="dg-stat__n">${n}</span><span class="dg-stat__l">${label}</span></div>`;
  return `<h3 class="eyebrow">${COPY.daily.stats}</h3>
    <div class="dg-stats" data-dg-stats>${cell(s.played, COPY.daily.played)}${cell(pct, COPY.daily.winPct)}${cell(s.current, COPY.daily.streak)}${cell(s.best, COPY.daily.best)}</div>
    <h3 class="eyebrow">${COPY.daily.dist}</h3>
    <ol class="dg-dist">${s.dist
      .map(
        (n, i) =>
          `<li class="dg-dist__row ${me.status === 'won' && me.rows.length === i + 1 ? 'dg-dist__row--me' : ''}"><span class="dg-dist__k">${i + 1}</span><span class="dg-dist__bar" style="--w:${Math.max(8, Math.round((100 * n) / max))}%"><span>${n}</span></span></li>`,
      )
      .join('')}</ol>`;
}

function solvers(view: RoomView): string {
  const b = view.daily.solvers;
  let body: string;
  if (b.kind === 'no-server') body = `<p class="muted small">No server, no board. Games in DMs are off the record.</p>`;
  else if (b.kind === 'loading') body = `<p class="muted small">Checking the board...</p>`;
  else if (!b.rows.length) body = `<p class="muted small">${COPY.daily.solversEmpty}</p>`;
  else
    body = `<ol class="scores">${b.rows
      .map(
        (r, i) => `<li class="score ${r.id === view.you ? 'score--me' : ''}${medal(i + 1)}" data-dg-solver="${esc(r.id)}">
        <span class="score__rank">${i + 1}</span>${avatarImg({ id: r.id, avatar: r.avatar, name: r.name }, 'avatar avatar--sm')}
        <span class="score__name">${esc(r.id === view.you ? 'You' : r.name)}</span>
        <span class="muted small">${COPY.daily.guessesLabel(r.guesses)}</span><span class="score__pts">${mmss(r.ms)}</span></li>`,
      )
      .join('')}</ol>`;
  return `<section class="panel hs" data-dg-solvers><div class="hs-head"><h2 class="eyebrow">${COPY.daily.solvers}</h2></div>${body}<p class="muted small hs-foot">${COPY.daily.solversFoot}</p></section>`;
}

export function renderDaily(view: RoomView, draft: string, guest: boolean, invite = ''): string {
  const d = view.daily;
  const me = d.me && d.me.day === d.today ? d.me : null;
  const header = `<header class="bar"><button class="btn btn--ghost btn--sm" data-go="lobby">${COPY.back}</button><h1 class="bar__title">${COPY.daily.title}</h1><span class="bar__meta">${me ? COPY.daily.number(puzzleNumber(me.dayNumber)) : ''}</span>${invite}</header>`;

  if (!me) {
    const stale = Boolean(d.me);
    return `${header}
      <section class="panel daily-panel daily-intro">
        <div class="game-hero" aria-hidden="true">${DAILY_ART}</div>
        <h2 class="h2">${COPY.daily.title}</h2>
        <p class="lede">${COPY.daily.intro}</p>
        <p class="muted small">${stale ? COPY.daily.newDay : COPY.daily.sameForAll}</p>
        <button class="btn btn--primary btn--big" data-act="daily.open">${COPY.daily.play}</button>
      </section>
      ${solvers(view)}`;
  }

  const playing = me.status === 'playing';
  let status = '';
  if (me.status === 'won') status = `<p class="status status--win fx fx-pop" data-dg-result>${esc(COPY.daily.won(me.rows.length))}${d.myRank ? ` ${esc(COPY.daily.rankLine(d.myRank))}` : ''}</p>`;
  else if (me.status === 'lost') status = `<p class="status" data-dg-result>${esc(COPY.daily.lost(me.answer ?? ''))}</p>`;
  const share = !playing
    ? `<div class="row"><button class="btn btn--primary" data-dg-share>${COPY.daily.share}</button><span class="muted small">${COPY.daily.done}</span></div>`
    : '';
  return `${header}
    <section class="panel daily-panel">
      ${guest ? `<p class="muted small">${COPY.daily.practice}</p>` : ''}
      ${grid(view, playing ? draft : '')}
      <p class="sr-only" aria-live="polite" data-dg-live>${playing ? `Guess ${me.rows.length + 1} of ${MAX_GUESSES}` : ''}</p>
      ${status}
      ${playing ? keyboard(view, true) : ''}
      ${share}
      ${stats(view)}
    </section>
    ${friends(view) ? `<aside class="panel">${friends(view)}</aside>` : ''}
    ${solvers(view)}`;
}
