// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-13
// Lobby: a compact header (Touch Grass eyebrow, TiltCheck title, who's here, Scores and Invite), then
// a flat list of game rows: three table games (DA&D, Trivia, Bluff) with seated/playing counts and two
// solo games (Daily Grass, Myth or Math), then Chess (1v1, the room watches). Trivia high scores open in a
// sheet from the header.

import { COPY } from '../copy.js';
import type { RoomUser, RoomView } from '../../shared/protocol.js';
import { avatarImg, esc } from './util.js';
import { BLUFF_ART, CHESS_ART, DAILY_ART, FLAG_SVG, MYTH_ART, TRIVIA_ART, dadLogoUrl } from '../art.js';
import { inviteButton } from './invite.js';
import { renderHighScores, type ScoresResult, type ScoresTab } from './highScores.js';

export interface LobbyPerson extends Pick<RoomUser, 'id' | 'name' | 'avatar'> {
  away?: boolean;
}

/** Room members first (they are actually connected), then anyone Discord says is in the Activity. */
export function mergePeople(view: RoomView | null, participants: LobbyPerson[]): LobbyPerson[] {
  const out = new Map<string, LobbyPerson>();
  for (const m of view?.members ?? []) out.set(m.id, m);
  for (const p of participants) if (!out.has(p.id)) out.set(p.id, p);
  return [...out.values()];
}

/** The Scores sheet: the same This week / All time board, in a dialog over the lobby. */
export function renderScoresSheet(scores: ScoresResult | null, tab: ScoresTab, you: string): string {
  return `<div class="sheet" data-scores-sheet>
    <div class="sheet__backdrop" data-scores-close></div>
    <div class="sheet__panel" role="dialog" aria-modal="true" aria-labelledby="scores-title">
      <div class="sheet__head"><h2 class="sheet__title" id="scores-title">${COPY.highScores.title}</h2><button type="button" class="btn btn--sm btn--ghost" data-scores-close>${COPY.close}</button></div>
      <p class="muted small sheet__scope">${COPY.highScores.scope}</p>
      ${renderHighScores(scores, tab, you)}
    </div>
  </div>`;
}

export function renderLobby(view: RoomView | null, people: LobbyPerson[], scores: ScoresResult | null = null, tab: ScoresTab = 'week', scoresOpen = false): string {
  const seated = view?.dad.seats.length ?? 0;
  const dadLive = Boolean(view && ['submitting', 'judging', 'reveal'].includes(view.dad.phase));
  const playing = view?.trivia.playingCount ?? 0;
  const triviaLive = Boolean(view && (view.trivia.phase === 'question' || view.trivia.phase === 'reveal'));
  const bluffSeated = view?.bluff.seats.length ?? 0;
  const bluffLive = Boolean(view && ['writing', 'guessing', 'reveal'].includes(view.bluff.phase));
  const chessSeated = view ? Number(Boolean(view.chess.white)) + Number(Boolean(view.chess.black)) : 0;
  const chessLive = view?.chess.phase === 'playing';
  const badge = (game: string, n: number, word: string, live: boolean, extra: string) =>
    `<span class="badge ${live ? 'badge--live' : ''}" data-count="${game}">${n} ${word}${live ? extra : ''}</span>`;
  const soloBadge = (game: 'daily' | 'myth', n: number) => `<span class="badge" data-count="${game}">${esc(COPY.solo(n))}</span>`;
  const tile = (game: 'dad' | 'trivia' | 'bluff' | 'daily' | 'myth' | 'chess', art: string, badgeHtml: string) =>
    `<button class="tile tile--${game}" data-go="${game}">
        <span class="tile__art">${art}</span>
        <span class="tile__body">
          <span class="tile__name">${esc(COPY.tiles[game].name)}</span>
          <span class="tile__desc">${esc(COPY.tiles[game].desc)}</span>
        </span>
        ${badgeHtml}
      </button>`;
  const who = people.length
    ? people
        .map((p) => `<span class="person ${p.away ? 'person--away' : ''}">${avatarImg(p, 'avatar avatar--sm')}<span class="person__name">${esc(p.name)}</span>${p.away ? `<span class="tag tag--away">${COPY.away}</span>` : ''}</span>`)
        .join('')
    : `<span class="muted small">${esc(COPY.nobodyHere)}</span>`;
  return `
    <header class="panel lobby-head">
      <div class="lobby-head__top">
        <div class="brand">
          <p class="brand__eyebrow">${esc(COPY.eyebrow)}</p>
          <h1 class="title">${FLAG_SVG}<span>${esc(COPY.appTitle)}</span></h1>
          <p class="lede">${esc(COPY.lobbyLede)}</p>
        </div>
        <div class="lobby-head__actions">
          <button type="button" class="btn btn--sm" data-scores-open aria-haspopup="dialog" aria-label="${esc(COPY.highScores.title)}">${COPY.scores}</button>
          ${inviteButton()}
        </div>
      </div>
      <div class="who"><span class="who__label">${esc(COPY.whoHere)} <span class="count">${people.length}</span></span><span class="people">${who}</span></div>
    </header>
    <section class="tiles" aria-label="Games">
      ${tile('dad', `<img class="tile__logo" src="${dadLogoUrl}" alt="" width="240" height="240" />`, badge('dad', seated, 'seated', dadLive, ` · round ${view?.dad.round}`))}
      ${tile('trivia', TRIVIA_ART, badge('trivia', playing, 'playing', triviaLive, ` · Q${view?.trivia.number}`))}
      ${tile('bluff', BLUFF_ART, badge('bluff', bluffSeated, 'seated', bluffLive, ` · T${view?.bluff.round}`))}
      ${tile('daily', DAILY_ART, soloBadge('daily', view?.daily.playingCount ?? 0))}
      ${tile('myth', MYTH_ART, soloBadge('myth', view?.myth.playingCount ?? 0))}
      ${tile('chess', CHESS_ART, badge('chess', chessSeated, 'seated', chessLive, ` · M${Math.floor((view?.chess.ply ?? 0) / 2) + 1}`))}
    </section>
    ${scoresOpen ? renderScoresSheet(scores, tab, view?.you ?? '') : ''}`;
}
