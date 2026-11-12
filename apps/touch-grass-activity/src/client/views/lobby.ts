// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// Lobby: who's here plus two live tiles, DA&D and Trivia, each with a seated/playing count.

import { COPY } from '../copy.js';
import type { RoomUser, RoomView } from '../../shared/protocol.js';
import { avatarImg, esc } from './util.js';

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

export function renderLobby(view: RoomView | null, people: LobbyPerson[]): string {
  const seated = view?.dad.seats.length ?? 0;
  const dadLive = Boolean(view && ['submitting', 'judging', 'reveal'].includes(view.dad.phase));
  const playing = view?.trivia.playingCount ?? 0;
  const triviaLive = Boolean(view && (view.trivia.phase === 'question' || view.trivia.phase === 'reveal'));
  const dadBadge = `<span class="badge ${dadLive ? 'badge--live' : ''}" data-count="dad">${seated} seated${dadLive ? ` / R${view?.dad.round}` : ''}</span>`;
  const triviaBadge = `<span class="badge ${triviaLive ? 'badge--live' : ''}" data-count="trivia">${playing} playing${triviaLive ? ` / Q${view?.trivia.number}` : ''}</span>`;
  return `
    <section class="panel lobby-head">
      <h1 class="title">${esc(COPY.appTitle)}</h1>
      <p class="lede">${esc(COPY.lobbyLede)}</p>
      <h2 class="eyebrow">${esc(COPY.whoHere)} <span class="count">${people.length}</span></h2>
      <div class="people">
        ${people.length ? people.map((p) => `<span class="person ${p.away ? 'person--away' : ''}">${avatarImg(p)}<span class="person__name">${esc(p.name)}</span>${p.away ? `<span class="tag tag--away">${COPY.away}</span>` : ''}</span>`).join('') : `<p class="muted">${esc(COPY.nobodyHere)}</p>`}
      </div>
    </section>
    <section class="tiles">
      <button class="tile tile--dad" data-go="dad">
        <span class="tile__name">${esc(COPY.tiles.dad.name)}</span>
        <span class="tile__desc">${esc(COPY.tiles.dad.desc)}</span>
        ${dadBadge}
      </button>
      <button class="tile tile--trivia" data-go="trivia">
        <span class="tile__name">${esc(COPY.tiles.trivia.name)}</span>
        <span class="tile__desc">${esc(COPY.tiles.trivia.desc)}</span>
        ${triviaBadge}
      </button>
    </section>`;
}
