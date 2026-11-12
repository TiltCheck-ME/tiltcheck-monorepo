// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// Lobby: who's here plus three tiles. Trivia is a stub until phase 2.

import { COPY } from '../copy.js';
import type { RoomUser, RoomView } from '../../shared/protocol.js';
import { avatarImg, esc } from './util.js';

export interface LobbyPerson extends Pick<RoomUser, 'id' | 'name' | 'avatar'> {}

/** Room members first (they are actually connected), then anyone Discord says is in the Activity. */
export function mergePeople(view: RoomView | null, participants: LobbyPerson[]): LobbyPerson[] {
  const out = new Map<string, LobbyPerson>();
  for (const m of view?.members ?? []) out.set(m.id, m);
  for (const p of participants) if (!out.has(p.id)) out.set(p.id, p);
  return [...out.values()];
}

export function renderLobby(view: RoomView | null, people: LobbyPerson[]): string {
  const seated = view?.dad.seats.length ?? 0;
  const dadBadge = view && view.dad.phase !== 'seating' ? `<span class="badge">Round ${view.dad.round}</span>` : seated ? `<span class="badge">${seated} seated</span>` : '';
  const brkBadge = view?.brk.phase === 'running' ? '<span class="badge badge--live">Running</span>' : '';
  return `
    <section class="panel lobby-head">
      <h1 class="title">${esc(COPY.appTitle)}</h1>
      <p class="lede">${esc(COPY.lobbyLede)}</p>
      <h2 class="eyebrow">${esc(COPY.whoHere)} <span class="count">${people.length}</span></h2>
      <div class="people">
        ${people.length ? people.map((p) => `<span class="person">${avatarImg(p)}<span class="person__name">${esc(p.name)}</span></span>`).join('') : `<p class="muted">${esc(COPY.nobodyHere)}</p>`}
      </div>
    </section>
    <section class="tiles">
      <button class="tile tile--dad" data-go="dad">
        <span class="tile__name">${esc(COPY.tiles.dad.name)}</span>
        <span class="tile__desc">${esc(COPY.tiles.dad.desc)}</span>
        ${dadBadge}
      </button>
      <button class="tile tile--brk" data-go="break">
        <span class="tile__name">${esc(COPY.tiles.brk.name)}</span>
        <span class="tile__desc">${esc(COPY.tiles.brk.desc)}</span>
        ${brkBadge}
      </button>
      <button class="tile tile--soon" disabled aria-disabled="true">
        <span class="tile__name">${esc(COPY.tiles.trivia.name)}</span>
        <span class="tile__desc">${esc(COPY.tiles.trivia.desc)}</span>
        <span class="badge">soon</span>
      </button>
    </section>`;
}
