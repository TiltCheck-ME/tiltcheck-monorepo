// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// Lobby: who's here, three table games (DA&D, Trivia, Bluff) with seated/playing counts, and two
// solo games (Daily Grass, Myth or Math) with a "solo" pill showing how many people are playing.

import { COPY } from '../copy.js';
import type { RoomUser, RoomView } from '../../shared/protocol.js';
import { avatarImg, esc } from './util.js';
import { BLUFF_ART, DAILY_ART, GRASS_SVG, FLAG_SVG, MYTH_ART, SUN_SVG, TRIVIA_ART, dadLogoUrl } from '../art.js';
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

export function renderLobby(view: RoomView | null, people: LobbyPerson[], scores: ScoresResult | null = null, tab: ScoresTab = 'week'): string {
  const seated = view?.dad.seats.length ?? 0;
  const dadLive = Boolean(view && ['submitting', 'judging', 'reveal'].includes(view.dad.phase));
  const playing = view?.trivia.playingCount ?? 0;
  const triviaLive = Boolean(view && (view.trivia.phase === 'question' || view.trivia.phase === 'reveal'));
  const bluffSeated = view?.bluff.seats.length ?? 0;
  const bluffLive = Boolean(view && ['writing', 'guessing', 'reveal'].includes(view.bluff.phase));
  const badge = (game: string, n: number, word: string, live: boolean, extra: string) =>
    `<span class="badge ${live ? 'badge--live' : ''} ${n > 0 ? 'badge--on' : ''}" data-count="${game}">${n} ${word}${live ? extra : ''}</span>`;
  const bluffBadge = badge('bluff', bluffSeated, 'seated', bluffLive, ` / T${view?.bluff.round}`);
  const dadBadge = badge('dad', seated, 'seated', dadLive, ` / R${view?.dad.round}`);
  const triviaBadge = badge('trivia', playing, 'playing', triviaLive, ` / Q${view?.trivia.number}`);
  const soloBadge = (game: 'daily' | 'myth', n: number) =>
    `<span class="badge badge--solo ${n > 0 ? 'badge--on' : ''}" data-count="${game}">${esc(COPY.solo(n))}</span>`;
  const tile = (game: 'dad' | 'trivia' | 'bluff' | 'daily' | 'myth', art: string, badgeHtml: string) =>
    `<button class="tile tile--${game}" data-go="${game}" style="--i:${['dad', 'trivia', 'bluff', 'daily', 'myth'].indexOf(game)}">
        <span class="tile__art">${art}</span>
        <span class="tile__body">
          <span class="tile__name">${esc(COPY.tiles[game].name)}</span>
          <span class="tile__desc">${esc(COPY.tiles[game].desc)}</span>
          ${badgeHtml}
        </span>
      </button>`;
  return `
    <section class="panel hero lobby-head">
      ${SUN_SVG}
      <div class="hero__body">
        <h1 class="title">${FLAG_SVG}<span>${esc(COPY.appTitle)}</span></h1>
        <p class="lede">${esc(COPY.lobbyLede)}</p>
        ${inviteButton('hero__invite')}
        <h2 class="eyebrow">${esc(COPY.whoHere)} <span class="count">${people.length}</span></h2>
        <div class="people">
          ${people.length ? people.map((p) => `<span class="person ${p.away ? 'person--away' : ''}">${avatarImg(p)}<span class="person__name">${esc(p.name)}</span>${p.away ? `<span class="tag tag--away">${COPY.away}</span>` : ''}</span>`).join('') : `<p class="muted">${esc(COPY.nobodyHere)}</p>`}
        </div>
      </div>
      ${GRASS_SVG}
    </section>
    <section class="tiles">
      ${tile('dad', `<img class="tile__logo" src="${dadLogoUrl}" alt="" width="240" height="240" />`, dadBadge)}
      ${tile('trivia', TRIVIA_ART, triviaBadge)}
      ${tile('bluff', BLUFF_ART, bluffBadge)}
      ${tile('daily', DAILY_ART, soloBadge('daily', view?.daily.playingCount ?? 0))}
      ${tile('myth', MYTH_ART, soloBadge('myth', view?.myth.playingCount ?? 0))}
    </section>
    ${renderHighScores(scores, tab, view?.you ?? '')}`;
}
