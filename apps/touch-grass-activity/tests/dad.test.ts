// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
import { describe, expect, it } from 'vitest';
import * as dad from '../src/shared/dad.js';
import { Room, createRoomState } from '../src/shared/room.js';
import { makeRng } from '../src/shared/rng.js';
import { allSubmit, table } from './helpers.js';

describe('DA&D: start and dealing', () => {
  it('needs 3 players and a seated starter', () => {
    const { s, rng } = table(['a', 'b']);
    expect(dad.start(s, 'a', rng)).toMatchObject({ ok: false, code: 'not-enough-players' });
    s.seats.push('c');
    expect(dad.start(s, 'zz', rng)).toMatchObject({ ok: false, code: 'not-seated' });
    expect(dad.start(s, 'a', rng)).toEqual({ ok: true });
    expect(s.phase).toBe('submitting');
  });

  it('caps the table at 8', () => {
    const s = dad.createDad();
    for (let i = 0; i < 8; i += 1) expect(dad.sit(s, `p${i}`).ok).toBe(true);
    expect(dad.sit(s, 'p9')).toMatchObject({ ok: false, code: 'table-full' });
  });

  it('deals 7 unique cards to everyone and picks a prompt', () => {
    const { s, rng } = table(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
    dad.start(s, 'a', rng);
    const all = s.seats.flatMap((id) => s.hands[id]!.map((c) => c.id));
    for (const id of s.seats) expect(s.hands[id]).toHaveLength(dad.HAND_SIZE);
    expect(new Set(all).size).toBe(all.length);
    expect(s.prompt?.text).toContain('_____');
    expect(s.judgeId).not.toBeNull();
  });

  it('refills hands back to 7 each round', () => {
    const { s, rng } = table(['a', 'b', 'c']);
    dad.start(s, 'a', rng);
    allSubmit(s, rng);
    dad.pick(s, s.judgeId!, s.entries[0]!.entryId);
    dad.next(s, 'a', rng);
    // Everyone who plays this round is back to 7; the new judge gets no top-up while judging.
    for (const id of s.seats) if (id !== s.judgeId) expect(s.hands[id]).toHaveLength(7);
    expect(s.hands[s.judgeId!]!.length).toBeLessThanOrEqual(7);
  });

  it('clamps the target score', () => {
    expect(dad.clampTarget(0)).toBe(1);
    expect(dad.clampTarget(99)).toBe(15);
    expect(dad.clampTarget('x')).toBe(5);
  });
});

describe('DA&D: judge rotation', () => {
  it('rotates through every seat in order', () => {
    const { s, rng } = table(['a', 'b', 'c', 'd']);
    dad.start(s, 'a', rng);
    const judges: string[] = [];
    for (let r = 0; r < 8; r += 1) {
      judges.push(s.judgeId!);
      allSubmit(s, rng);
      dad.pick(s, s.judgeId!, s.entries[0]!.entryId);
      if (s.phase === 'over') break;
      dad.next(s, s.seats[0]!, rng);
    }
    const first = s.seats.indexOf(judges[0]!);
    judges.forEach((j, i) => expect(j).toBe(s.seats[(first + i) % 4]));
  });
});

describe('DA&D: submissions', () => {
  it('validates phase, player, judge and card ownership', () => {
    const { s, rng } = table(['a', 'b', 'c']);
    expect(dad.submit(s, 'a', 'w1', rng)).toMatchObject({ code: 'wrong-phase' });
    dad.start(s, 'a', rng);
    const judge = s.judgeId!;
    const player = s.seats.find((id) => id !== judge)!;
    const other = s.seats.find((id) => id !== judge && id !== player)!;
    expect(dad.submit(s, judge, s.hands[judge]![0]!.id, rng)).toMatchObject({ code: 'judge-cannot-submit' });
    expect(dad.submit(s, 'spectator', 'w1', rng)).toMatchObject({ code: 'not-seated' });
    const othersCard = s.hands[other]![0]!.id;
    expect(dad.submit(s, player, othersCard, rng)).toMatchObject({ code: 'card-not-in-hand' });
    expect(dad.submit(s, player, s.hands[player]![0]!.id, rng)).toEqual({ ok: true });
    expect(dad.submit(s, player, s.hands[player]![0]!.id, rng)).toMatchObject({ code: 'already-submitted' });
    expect(s.hands[player]).toHaveLength(6);
    expect(s.phase).toBe('submitting');
    dad.submit(s, other, othersCard, rng);
    expect(s.phase).toBe('judging');
  });

  it('only the judge can pick, and only a real entry', () => {
    const { s, rng } = table(['a', 'b', 'c']);
    dad.start(s, 'a', rng);
    expect(dad.pick(s, s.judgeId!, 'nope')).toMatchObject({ code: 'wrong-phase' });
    allSubmit(s, rng);
    const notJudge = s.seats.find((id) => id !== s.judgeId)!;
    expect(dad.pick(s, notJudge, s.entries[0]!.entryId)).toMatchObject({ code: 'not-judge' });
    expect(dad.pick(s, s.judgeId!, 'e-fake')).toMatchObject({ code: 'unknown-entry' });
  });
});

describe('DA&D: anonymity', () => {
  it('views never carry other hands or answer authors', () => {
    const room = new Room(createRoomState('i-1'), makeRng(7));
    for (const id of ['a', 'b', 'c', 'd']) {
      room.join({ id, name: id.toUpperCase(), avatar: null }, 0);
      room.handle(id, { t: 'dad.sit' }, 0);
    }
    room.handle('a', { t: 'dad.start' }, 0);
    const s = room.state.dad;
    for (const id of s.seats) {
      const v = room.viewFor(id, 0);
      // The judge's view carries no hand at all; everyone else sees exactly their own.
      const expected = id === s.judgeId ? [] : s.hands[id]!.map((c) => c.id).sort();
      expect(v.dad.hand.map((c) => c.id).sort()).toEqual(expected);
      const json = JSON.stringify(v);
      for (const other of s.seats.filter((o) => o !== id)) {
        for (const c of s.hands[other]!) expect(json).not.toContain(`"${c.id}"`);
      }
    }
    allSubmit(s, makeRng(3));
    expect(s.phase).toBe('judging');
    const judgeView = room.viewFor(s.judgeId!, 0);
    expect(judgeView.dad.entries).toHaveLength(3);
    for (const e of judgeView.dad.entries) expect(Object.keys(e).sort()).toEqual(['entryId', 'text']);
    expect(JSON.stringify(judgeView.dad.entries)).not.toMatch(/"playerId"/);
    // Entries are not in seat order.
    const seatOrder = s.seats.filter((id) => id !== s.judgeId);
    const orders = new Set<string>();
    for (let n = 1; n <= 12; n += 1) {
      const t = table(['a', 'b', 'c', 'd', 'e'], n);
      dad.start(t.s, 'a', t.rng);
      allSubmit(t.s, t.rng);
      orders.add(t.s.entries.map((e) => e.playerId).join(','));
    }
    expect(orders.size).toBeGreaterThan(1);
    expect(seatOrder).toHaveLength(3);
  });

  it('entry ids are random, not derived from player ids', () => {
    const { s, rng } = table(['alice', 'bob', 'carl']);
    dad.start(s, 'alice', rng);
    allSubmit(s, rng);
    for (const e of s.entries) {
      expect(e.entryId).toMatch(/^e[a-z0-9]{10}$/);
      expect(e.entryId).not.toContain(e.playerId);
    }
  });
});

describe('DA&D: scoring and win', () => {
  it('awards one point to the picked answer owner', () => {
    const { s, rng } = table(['a', 'b', 'c']);
    dad.start(s, 'a', rng);
    allSubmit(s, rng);
    const entry = s.entries[0]!;
    dad.pick(s, s.judgeId!, entry.entryId);
    expect(s.scores[entry.playerId]).toBe(1);
    expect(s.phase).toBe('reveal');
    expect(s.lastRound?.winnerId).toBe(entry.playerId);
    expect(s.lastRound?.winningText).not.toContain('_____');
  });

  it('first to the target wins and the game ends', () => {
    const { s, rng } = table(['a', 'b', 'c']);
    dad.start(s, 'a', rng, 2);
    let rounds = 0;
    while (s.phase !== 'over' && rounds < 50) {
      allSubmit(s, rng);
      const pickFor = s.entries.find((e) => e.playerId === 'a') ?? s.entries[0]!;
      dad.pick(s, s.judgeId!, pickFor.entryId);
      if (s.phase === 'reveal') dad.next(s, 'b', rng);
      rounds += 1;
    }
    expect(s.phase).toBe('over');
    expect(s.scores[s.winnerId!]).toBe(2);
    expect(dad.next(s, 'a', rng)).toMatchObject({ code: 'wrong-phase' });
    expect(dad.reset(s, 'a')).toEqual({ ok: true });
    expect(s.phase).toBe('seating');
    expect(s.seats).toEqual(['a', 'b', 'c']);
  });
});

describe('DA&D: leaving', () => {
  it('a player leaving mid-submit does not block the round', () => {
    const { s, rng } = table(['a', 'b', 'c', 'd']);
    dad.start(s, 'a', rng);
    const nonJudge = s.seats.filter((id) => id !== s.judgeId);
    dad.submit(s, nonJudge[0]!, s.hands[nonJudge[0]!]![0]!.id, rng);
    dad.submit(s, nonJudge[1]!, s.hands[nonJudge[1]!]![0]!.id, rng);
    dad.removePlayer(s, nonJudge[2]!, rng);
    expect(s.phase).toBe('judging');
    expect(s.entries).toHaveLength(2);
  });

  it('a submitted player leaving drops their entry', () => {
    const { s, rng } = table(['a', 'b', 'c', 'd']);
    dad.start(s, 'a', rng);
    allSubmit(s, rng);
    const leaver = s.entries[0]!.playerId;
    dad.removePlayer(s, leaver, rng);
    expect(s.entries.map((e) => e.playerId)).not.toContain(leaver);
    expect(s.phase).toBe('judging');
  });

  it('the judge leaving skips the round and returns cards', () => {
    const { s, rng } = table(['a', 'b', 'c', 'd']);
    dad.start(s, 'a', rng);
    const judge = s.judgeId!;
    const idx = s.seats.indexOf(judge);
    const nextJudge = s.seats[(idx + 1) % 4]!;
    const p = s.seats.find((id) => id !== judge)!;
    const card = s.hands[p]![0]!;
    dad.submit(s, p, card.id, rng);
    const round = s.round;
    dad.removePlayer(s, judge, rng);
    expect(s.lastRound?.skipped).toBe('judge-left');
    expect(s.round).toBe(round + 1);
    expect(s.phase).toBe('submitting');
    expect(s.judgeId).toBe(nextJudge);
    expect(s.hands[p]!.map((c) => c.id)).toContain(card.id);
    expect(s.hands[p]).toHaveLength(7);
  });

  it('the judge leaving during judging also skips', () => {
    const { s, rng } = table(['a', 'b', 'c', 'd']);
    dad.start(s, 'a', rng);
    allSubmit(s, rng);
    dad.removePlayer(s, s.judgeId!, rng);
    expect(s.lastRound?.skipped).toBe('judge-left');
    expect(s.phase).toBe('submitting');
    expect(Object.values(s.scores).every((v) => v === 0)).toBe(true);
  });

  it('dropping under 3 players pauses, sitting back down resumes with scores kept', () => {
    const { s, rng } = table(['a', 'b', 'c']);
    dad.start(s, 'a', rng);
    allSubmit(s, rng);
    const e = s.entries[0]!;
    dad.pick(s, s.judgeId!, e.entryId);
    const leaver = s.seats.find((id) => id !== e.playerId)!;
    dad.removePlayer(s, leaver, rng);
    expect(s.phase).toBe('paused');
    expect(dad.start(s, e.playerId, rng)).toMatchObject({ code: 'not-enough-players' });
    expect(dad.sit(s, 'z').ok).toBe(true);
    expect(dad.start(s, 'z', rng)).toEqual({ ok: true });
    expect(s.phase).toBe('submitting');
    expect(s.scores[e.playerId]).toBe(1);
    // Dealt in unless z opens as the judge (no hand needed while judging).
    expect(s.hands.z ?? []).toHaveLength(s.judgeId === 'z' ? 0 : 7);
  });
});

describe('DA&D: late join', () => {
  it('joins as a spectator and is dealt in next round', () => {
    const { s, rng } = table(['a', 'b', 'c']);
    dad.start(s, 'a', rng);
    expect(dad.sit(s, 'late')).toEqual({ ok: true });
    expect(s.waiting).toEqual(['late']);
    expect(s.seats).not.toContain('late');
    expect(dad.submit(s, 'late', 'w1', rng)).toMatchObject({ code: 'not-seated' });
    // the round still closes without them
    allSubmit(s, rng);
    expect(s.phase).toBe('judging');
    dad.pick(s, s.judgeId!, s.entries[0]!.entryId);
    dad.next(s, 'a', rng);
    expect(s.seats).toContain('late');
    expect(s.waiting).toEqual([]);
    expect(s.hands.late ?? []).toHaveLength(s.judgeId === 'late' ? 0 : 7);
    expect(s.scores.late).toBe(0);
  });

  it('late joiners count toward the 8 cap', () => {
    const { s, rng } = table(['a', 'b', 'c', 'd', 'e', 'f', 'g']);
    dad.start(s, 'a', rng);
    expect(dad.sit(s, 'h').ok).toBe(true);
    expect(dad.sit(s, 'i')).toMatchObject({ code: 'table-full' });
  });
});

describe('DA&D: the judge holds no hand', () => {
  function table4() {
    const room = new Room(createRoomState('i-judge'), makeRng(11));
    for (const id of ['a', 'b', 'c', 'd']) {
      room.join({ id, name: id.toUpperCase(), avatar: null }, 0);
      room.handle(id, { t: 'dad.sit' }, 0);
    }
    room.handle('a', { t: 'dad.start', target: 10 }, 0);
    return room;
  }

  it('judge view has an empty hand while judging; the cards stay server side', () => {
    const room = table4();
    const s = room.state.dad;
    const judge = s.judgeId!;
    const v = room.viewFor(judge, 0).dad;
    expect(v.me.isJudge).toBe(true);
    expect(v.hand).toEqual([]);
    expect(s.hands[judge]).toHaveLength(dad.HAND_SIZE);
    for (const c of s.hands[judge]!) expect(JSON.stringify(room.viewFor(judge, 0))).not.toContain(`"${c.id}"`);
    for (const id of s.seats.filter((x) => x !== judge)) expect(room.viewFor(id, 0).dad.hand).toHaveLength(dad.HAND_SIZE);
  });

  it('server rejects a judge submission, even with a card they really hold', () => {
    const room = table4();
    const s = room.state.dad;
    const judge = s.judgeId!;
    const held = s.hands[judge]![0]!.id;
    expect(room.handle(judge, { t: 'dad.submit', cardId: held }, 0)).toMatchObject({ ok: false, code: 'judge-cannot-submit' });
    expect(s.hands[judge]).toHaveLength(dad.HAND_SIZE);
  });

  it('no top-up to the judge mid-round, and the ex-judge has a full hand next round', () => {
    const room = table4();
    const s = room.state.dad;
    const judge = s.judgeId!;
    const before = s.hands[judge]!.map((c) => c.id);
    allSubmit(s, makeRng(5));
    expect(s.hands[judge]!.map((c) => c.id)).toEqual(before);
    room.handle(judge, { t: 'dad.pick', entryId: s.entries[0]!.entryId }, 0);
    room.handle(judge, { t: 'dad.next' }, 0);
    expect(s.judgeId).not.toBe(judge);
    const v = room.viewFor(judge, 0).dad;
    expect(v.hand).toHaveLength(dad.HAND_SIZE);
    expect(v.hand.map((c) => c.id).sort()).toEqual([...before].sort());
    // Players who played a card were topped back up; the new judge's view is empty.
    expect(room.viewFor(s.judgeId!, 0).dad.hand).toEqual([]);
  });
});
