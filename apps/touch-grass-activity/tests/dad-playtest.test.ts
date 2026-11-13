// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-13
// Regressions from the 4-player DA&D playtest (2026-11-13): "rounds went to 6/5" and "my cards in
// my hand were the same each time".
import { describe, expect, it } from 'vitest';
import * as dad from '../src/shared/dad.js';
import { Room, createRoomState } from '../src/shared/room.js';
import { makeRng } from '../src/shared/rng.js';
import { whiteCards } from '../src/shared/deck.js';
import { allSubmit, table } from './helpers.js';

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

/** Every white card is in exactly one place: a hand, a submission, the draw pile or the discard. */
function expectNoDuplicates(s: dad.DadState): void {
  const ids = [
    ...Object.values(s.hands).flat(),
    ...Object.values(s.submissions),
    ...s.drawPile,
    ...s.discardPile,
  ].map((c) => c.id);
  expect(new Set(ids).size).toBe(ids.length);
  expect(ids.length).toBe(whiteCards().length);
}

describe('DA&D playtest: the game stops at the target', () => {
  it('no score ever passes the target and no round starts after the winning pick (many games)', () => {
    for (let n = 1; n <= 40; n += 1) {
      const room = room4(5, n);
      const s = room.state.dad;
      let guard = 0;
      while (s.phase !== 'over' && guard++ < 200) {
        allSubmit(s, makeRng(n));
        room.handle(s.judgeId!, { t: 'dad.pick', entryId: s.entries[0]!.entryId }, tick());
        for (const id of s.seats) expect(s.scores[id] ?? 0).toBeLessThanOrEqual(5);
        if (s.phase === 'reveal') room.handle('b', { t: 'dad.next' }, tick());
      }
      expect(s.phase).toBe('over');
      expect(s.scores[s.winnerId!]).toBe(5);
      const roundAtWin = s.round;
      // Anyone pressing Next round (or a stale client) cannot start round 6 of a finished game.
      for (const id of PLAYERS) expect(room.handle(id, { t: 'dad.next' }, tick())).toMatchObject({ ok: false, code: 'wrong-phase' });
      expect(s.round).toBe(roundAtWin);
      expect(room.viewFor('a', 0).dad.winnerId).toBe(s.winnerId);
    }
  });

  it('a stored room where someone already has the target ends instead of dealing another round', () => {
    const { s, rng } = table(PLAYERS);
    dad.start(s, 'a', rng, 5);
    allSubmit(s, rng);
    dad.pick(s, s.judgeId!, s.entries[0]!.entryId, rng);
    expect(s.phase).toBe('reveal');
    s.scores.c = 6; // e.g. state written by an older build
    const round = s.round;
    expect(dad.next(s, 'a', rng)).toEqual({ ok: true });
    expect(s.phase).toBe('over');
    expect(s.winnerId).toBe('c');
    expect(s.round).toBe(round);
    expect(s.judgeId).toBeNull();
  });

  it('resuming a paused table with someone at the target ends the game', () => {
    const { s, rng } = table(PLAYERS);
    dad.start(s, 'a', rng, 3);
    s.phase = 'paused';
    s.scores.b = 3;
    expect(dad.start(s, 'a', rng)).toEqual({ ok: true });
    expect(s.phase).toBe('over');
    expect(s.winnerId).toBe('b');
  });

});

describe('DA&D playtest: hands change every round', () => {
  it('each player who played gets their card replaced at the pick, no duplicates anywhere', () => {
    const room = room4(15);
    const s = room.state.dad;
    for (let r = 0; r < 30 && s.phase !== 'over'; r += 1) {
      const players = s.seats.filter((id) => id !== s.judgeId);
      const before: Record<string, string[]> = {};
      for (const id of players) before[id] = s.hands[id]!.map((c) => c.id);
      allSubmit(s, makeRng(r));
      const played: Record<string, string> = {};
      for (const id of players) played[id] = s.submissions[id]!.id;
      room.handle(s.judgeId!, { t: 'dad.pick', entryId: s.entries[r % s.entries.length]!.entryId }, tick());
      if ((s.phase as string) === 'over') break;
      for (const id of players) {
        const now = s.hands[id]!.map((c) => c.id);
        expect(now).toHaveLength(dad.HAND_SIZE);
        expect(now).not.toContain(played[id]);
        const drawn = now.filter((c) => !before[id]!.includes(c));
        expect(drawn).toHaveLength(1);
        // The view flags the replacement as new (on the reveal screen and next round's hand).
        expect(room.viewFor(id, 0).dad.freshIds).toEqual(drawn);
      }
      expectNoDuplicates(s);
      room.handle('a', { t: 'dad.next' }, tick());
      expectNoDuplicates(s);
    }
  });

  it('reshuffles the discard pile when the deck runs low, without handing back the card just played', () => {
    const room = room4(15, 4);
    const s = room.state.dad;
    for (let r = 0; r < 80 && s.phase !== 'over'; r += 1) {
      allSubmit(s, makeRng(r));
      const played = new Map(Object.entries(s.submissions).map(([id, c]) => [id, c.id]));
      room.handle(s.judgeId!, { t: 'dad.pick', entryId: s.entries[0]!.entryId }, tick());
      if ((s.phase as string) === 'over') break;
      for (const [id, cardId] of played) expect(s.hands[id]!.map((c) => c.id)).not.toContain(cardId);
      for (const id of s.seats) expect(s.hands[id]!.length).toBe(dad.HAND_SIZE);
      expectNoDuplicates(s);
      room.handle('a', { t: 'dad.next' }, tick());
    }
    // 80 rounds x 3 cards is far more than the deck: the discard pile must have been recycled.
    expect(s.round).toBeGreaterThan(Math.ceil(whiteCards().length / 3));
  });


  it('the New tag clears once the player plays a card', () => {
    const room = room4(15);
    const s = room.state.dad;
    allSubmit(s, makeRng(1));
    room.handle(s.judgeId!, { t: 'dad.pick', entryId: s.entries[0]!.entryId }, tick());
    room.handle('a', { t: 'dad.next' }, tick());
    const me = s.seats.find((id) => id !== s.judgeId && (s.fresh?.[id]?.length ?? 0) > 0)!;
    expect(room.viewFor(me, 0).dad.freshIds).toHaveLength(1);
    room.handle(me, { t: 'dad.submit', cardId: s.hands[me]![1]!.id }, tick());
    expect(room.viewFor(me, 0).dad.freshIds).toEqual([]);
  });

  it('the opening deal marks nothing as new', () => {
    const room = room4(5);
    for (const id of PLAYERS) expect(room.viewFor(id, 0).dad.freshIds).toEqual([]);
  });
});
