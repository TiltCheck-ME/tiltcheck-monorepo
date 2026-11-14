// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-13
// @vitest-environment jsdom
// Screen side of the 4-player DA&D playtest regressions (2026-11-13): "rounds went to 6/5" and
// "my cards in my hand were the same each time".
import { describe, expect, it } from 'vitest';
import * as dad from '../src/shared/dad.js';
import { Room, createRoomState } from '../src/shared/room.js';
import { makeRng } from '../src/shared/rng.js';
import { renderDad } from '../src/client/views/dad.js';
import { allSubmit } from './helpers.js';

const PLAYERS = ['a', 'b', 'c', 'd'];

// Each action a second apart so the per-player rate limit never drops a click.
let clock = 0;
const tick = (): number => (clock += 1000);

function room4(target = 5, n = 11): Room {
  const room = new Room(createRoomState('i-playtest'), makeRng(n));
  for (const id of PLAYERS) {
    room.join({ id, name: id.toUpperCase(), avatar: null }, 0);
    room.handle(id, { t: 'dad.sit' }, tick());
  }
  room.handle('a', { t: 'dad.start', target }, tick());
  return room;
}

function html(s: string): HTMLElement {
  const d = document.createElement('div');
  d.innerHTML = s;
  return d;
}

describe('DA&D playtest: what the table shows', () => {
  it('header says the round and the target in words, not "R6 / to 5"', () => {
    const room = room4(5);
    const s = room.state.dad;
    for (let r = 0; r < 5 && s.phase !== 'over'; r += 1) {
      allSubmit(s, makeRng(3));
      // Spread the points so nobody wins inside five rounds.
      const pickFor = s.entries.find((e) => (s.scores[e.playerId] ?? 0) === Math.min(...s.entries.map((x) => s.scores[x.playerId] ?? 0)))!;
      room.handle(s.judgeId!, { t: 'dad.pick', entryId: pickFor.entryId }, tick());
      room.handle('a', { t: 'dad.next' }, tick());
    }
    expect(s.round).toBe(6);
    const meta = html(renderDad(room.viewFor('a', 0), 5)).querySelector('.bar__meta')!.textContent;
    expect(meta).toBe('Round 6 · first to 5');
    expect(meta).not.toMatch(/\d+\s*\/\s*(to\s*)?\d+/);
  });

  it('a played-and-refilled hand shows the new card first with a New tag', () => {
    const room = room4(15);
    const s = room.state.dad;
    const me = s.seats.find((id) => id !== s.judgeId)!;
    allSubmit(s, makeRng(1));
    room.handle(s.judgeId!, { t: 'dad.pick', entryId: s.entries[0]!.entryId }, tick());
    room.handle('a', { t: 'dad.next' }, tick());
    const v = room.viewFor(me, 0);
    if (v.dad.me.isJudge) return; // rotated onto the judge seat: covered by the judge tests
    const el = html(renderDad(v, 15));
    const cards = [...el.querySelectorAll('.hand .card')];
    expect(cards).toHaveLength(dad.HAND_SIZE);
    expect(cards[0]!.classList.contains('card--new')).toBe(true);
    expect(cards[0]!.querySelector('.card__new')?.textContent).toBe('New');
    expect(el.querySelectorAll('.card--new')).toHaveLength(1);
    expect(cards[0]!.getAttribute('data-card')).toBe(v.dad.freshIds[0]);
  });
});
