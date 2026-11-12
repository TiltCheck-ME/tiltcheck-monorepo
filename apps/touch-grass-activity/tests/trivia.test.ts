// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// Trivia state machine: start, answer window, speed scoring, duplicate/late answers, hidden answer,
// end and restart, late join, away players.
import { describe, expect, it } from 'vitest';
import * as tv from '../src/shared/trivia.js';
import { Room, createRoomState } from '../src/shared/room.js';
import { makeRng } from '../src/shared/rng.js';
import { TRIVIA_BANK, triviaById } from '../src/shared/triviaBank.js';

const T0 = 1_000_000;

function game(players = ['a', 'b', 'c'], seed = 7) {
  const s = tv.createTrivia();
  const rng = makeRng(seed);
  expect(tv.start(s, players[0]!, T0, rng, players)).toEqual({ ok: true });
  return { s, rng };
}

function wrongChoice(s: tv.TriviaState): number {
  return (s.current!.correct + 1) % 4;
}

describe('trivia: start', () => {
  it('opens question 1 of 10 with a 15 s window for everyone present', () => {
    const { s } = game();
    expect(s.phase).toBe('question');
    expect(s.total).toBe(10);
    expect(s.questionIds).toHaveLength(10);
    expect(new Set(s.questionIds).size).toBe(10);
    expect(s.current!.endsAt - s.current!.startedAt).toBe(tv.ANSWER_MS);
    expect(Object.keys(s.scores).sort()).toEqual(['a', 'b', 'c']);
  });

  it('shuffled choices still point at the right answer', () => {
    const { s } = game();
    const q = triviaById(s.current!.id)!;
    expect(s.current!.choices[s.current!.correct]).toBe(q.choices[q.answer]);
    expect([...s.current!.choices].sort()).toEqual([...q.choices].sort());
  });

  it('cannot start twice; solo start is fine', () => {
    const { s, rng } = game(['solo']);
    expect(tv.start(s, 'solo', T0 + 1, rng, ['solo'])).toMatchObject({ code: 'already-running' });
  });

  it('draws without repeats per instance until the bank runs dry', () => {
    const s = tv.createTrivia();
    const rng = makeRng(3);
    const seen: string[] = [];
    const games = Math.floor(TRIVIA_BANK.length / 10);
    for (let g = 0; g < games; g += 1) {
      tv.start(s, 'a', T0, rng, ['a']);
      seen.push(...s.questionIds);
      Object.assign(s, { phase: 'over', current: null });
    }
    expect(new Set(seen).size).toBe(seen.length);
    tv.start(s, 'a', T0, rng, ['a']);
    expect(s.questionIds).toHaveLength(10);
    expect(new Set(s.questionIds).size).toBe(10);
  });
});

describe('trivia: answers and scoring', () => {
  it('speed score: 150 instantly, 100 at the buzzer, linear in between', () => {
    expect(tv.speedPoints(0, 0, 15_000)).toBe(50);
    expect(tv.speedPoints(7_500, 0, 15_000)).toBe(25);
    expect(tv.speedPoints(15_000, 0, 15_000)).toBe(0);
    expect(tv.speedPoints(-5, 0, 15_000)).toBe(50);
  });

  it('scores correct answers by speed, wrong and missing as 0', () => {
    const { s, rng } = game();
    const c = s.current!;
    expect(tv.answer(s, 'a', c.id, c.correct, T0 + 3_000)).toEqual({ ok: true });
    expect(tv.answer(s, 'b', c.id, wrongChoice(s), T0 + 1_000)).toEqual({ ok: true });
    // c says nothing; window runs out.
    expect(tv.tick(s, T0 + 14_999, rng, ['a', 'b', 'c'])).toBe(false);
    expect(tv.tick(s, T0 + 15_000, rng, ['a', 'b', 'c'])).toBe(true);
    expect(s.phase).toBe('reveal');
    expect(s.scores).toEqual({ a: 100 + 40, b: 0, c: 0 });
    const r = s.lastReveal!;
    expect(r.correct).toBe(c.correct);
    expect(r.results.find((x) => x.id === 'c')).toMatchObject({ choice: null, points: 0 });
    expect(r.counts.reduce((x, y) => x + y, 0)).toBe(2);
  });

  it('one answer per player per question', () => {
    const { s } = game();
    const c = s.current!;
    tv.answer(s, 'a', c.id, 0, T0 + 10);
    expect(tv.answer(s, 'a', c.id, 1, T0 + 20)).toMatchObject({ code: 'already-answered' });
    expect(s.answers.a!.choice).toBe(0);
  });

  it('late, stale, out of range and spectator answers are refused', () => {
    const { s, rng } = game();
    const c = s.current!;
    expect(tv.answer(s, 'a', c.id, 0, c.endsAt)).toMatchObject({ code: 'too-late' });
    expect(tv.answer(s, 'a', 'q999', 0, T0)).toMatchObject({ code: 'stale-question' });
    expect(tv.answer(s, 'a', c.id, 4, T0)).toMatchObject({ code: 'bad-choice' });
    expect(tv.answer(s, 'a', c.id, 1.5, T0)).toMatchObject({ code: 'bad-choice' });
    expect(tv.answer(s, 'zed', c.id, 0, T0)).toMatchObject({ code: 'spectating' });
    tv.tick(s, c.endsAt, rng, ['a', 'b', 'c']);
    expect(tv.answer(s, 'a', c.id, 0, c.endsAt + 1)).toMatchObject({ code: 'not-open' });
  });

  it('window closes early once every connected player has answered', () => {
    const { s, rng } = game();
    const c = s.current!;
    for (const p of ['a', 'b', 'c']) tv.answer(s, p, c.id, c.correct, T0 + 2_000);
    expect(tv.tick(s, T0 + 2_000, rng, ['a', 'b', 'c'])).toBe(true);
    expect(s.phase).toBe('reveal');
    expect(s.revealEndsAt).toBe(T0 + 2_000 + tv.REVEAL_MS);
  });

  it('away players do not hold the window open and score 0 for what they miss', () => {
    const { s, rng } = game();
    const c = s.current!;
    tv.answer(s, 'a', c.id, c.correct, T0 + 1_000);
    tv.answer(s, 'b', c.id, c.correct, T0 + 1_000);
    // c is away: not in activeIds.
    expect(tv.tick(s, T0 + 1_000, rng, ['a', 'b'])).toBe(true);
    expect(s.scores.c).toBe(0);
    expect(s.scores.a).toBeGreaterThan(100);
  });
});

describe('trivia: flow, end and restart', () => {
  it('reveal lasts 4 s, then the next question; after 10 it is over with winners', () => {
    const { s, rng } = game(['a', 'b']);
    let now = T0;
    for (let i = 0; i < 10; i += 1) {
      expect(s.phase).toBe('question');
      expect(s.index).toBe(i);
      const c = s.current!;
      tv.answer(s, 'a', c.id, c.correct, now + 500);
      tv.answer(s, 'b', c.id, wrongChoice(s), now + 500);
      tv.tick(s, now + 500, rng, ['a', 'b']);
      expect(s.phase).toBe('reveal');
      expect(tv.tick(s, now + 500 + tv.REVEAL_MS - 1, rng, ['a', 'b'])).toBe(false);
      now += 500 + tv.REVEAL_MS;
      tv.tick(s, now, rng, ['a', 'b']);
    }
    expect(s.phase).toBe('over');
    expect(tv.winners(s)).toEqual(['a']);
    expect(s.scores.b).toBe(0);
    expect(tv.nextWake(s)).toBeNull();
    // Restart: new game, new questions, scores wiped.
    const prev = new Set(s.questionIds);
    expect(tv.start(s, 'b', now + 10, rng, ['a', 'b'])).toEqual({ ok: true });
    expect(s.game).toBe(2);
    expect(s.scores).toEqual({ a: 0, b: 0 });
    expect(s.questionIds.some((id) => prev.has(id))).toBe(false);
  });

  it('late joiner spectates the question in flight and is dealt in at the next', () => {
    const { s, rng } = game(['a']);
    const c = s.current!;
    expect(tv.answer(s, 'late', c.id, 0, T0 + 100)).toMatchObject({ code: 'spectating' });
    tv.answer(s, 'a', c.id, c.correct, T0 + 200);
    tv.tick(s, T0 + 200, rng, ['a', 'late']);
    expect(s.phase).toBe('reveal');
    expect(s.scores.late).toBeUndefined();
    tv.tick(s, T0 + 200 + tv.REVEAL_MS, rng, ['a', 'late']);
    expect(s.phase).toBe('question');
    expect(s.scores.late).toBe(0);
    expect(tv.answer(s, 'late', s.current!.id, 0, T0 + 5_000)).toEqual({ ok: true });
  });

  it('a late alarm does not skip questions', () => {
    const { s, rng } = game(['a']);
    tv.tick(s, T0 + 60_000, rng, ['a']);
    expect(s.phase).toBe('reveal');
    expect(s.index).toBe(0);
    tv.tick(s, T0 + 120_000, rng, ['a']);
    expect(s.phase).toBe('question');
    expect(s.index).toBe(1);
    expect(s.current!.endsAt).toBe(T0 + 120_000 + tv.ANSWER_MS);
  });
});

describe('trivia through the room: the answer never leaks before the reveal', () => {
  it('views carry no correct index during the question, and do after', () => {
    const room = new Room(createRoomState('i-t'), makeRng(5));
    for (const id of ['a', 'b', 'c']) room.join({ id, name: id.toUpperCase(), avatar: null }, T0);
    expect(room.handle('a', { t: 'trivia.start' }, T0).ok).toBe(true);
    const v = room.viewFor('b', T0);
    expect(v.trivia.phase).toBe('question');
    expect(v.trivia.question!.choices).toHaveLength(4);
    expect(v.trivia.reveal).toBeNull();
    const json = JSON.stringify(v);
    expect(json).not.toContain('"correct"');
    expect(json).not.toContain('"answer"');
    const qid = v.trivia.question!.id;
    expect(room.handle('a', { t: 'trivia.answer', qid, choice: 0 }, T0 + 100).ok).toBe(true);
    // Another player's pick is not visible either, only the count.
    const vb = room.viewFor('b', T0 + 100).trivia;
    expect(vb.answeredCount).toBe(1);
    expect(vb.me.answered).toBeNull();
    expect(room.viewFor('a', T0 + 100).trivia.me.answered).toBe(0);
    room.handle('b', { t: 'trivia.answer', qid, choice: 1 }, T0 + 200);
    room.handle('c', { t: 'trivia.answer', qid, choice: 2 }, T0 + 300);
    const after = room.viewFor('b', T0 + 300).trivia;
    expect(after.phase).toBe('reveal');
    expect(typeof after.reveal!.correct).toBe('number');
    expect(room.nextWake()).toBe(T0 + 300 + tv.REVEAL_MS);
  });

  it('lobby count: playingCount follows the running game', () => {
    const room = new Room(createRoomState('i-t2'), makeRng(5));
    room.join({ id: 'a', name: 'A', avatar: null }, T0);
    room.join({ id: 'b', name: 'B', avatar: null }, T0);
    expect(room.viewFor('a', T0).trivia.playingCount).toBe(0);
    room.handle('a', { t: 'trivia.start' }, T0);
    expect(room.viewFor('a', T0).trivia.playingCount).toBe(2);
  });

  it('room leave drops a trivia player; sit out works', () => {
    const room = new Room(createRoomState('i-t3'), makeRng(5));
    for (const id of ['a', 'b', 'c']) room.join({ id, name: id, avatar: null }, T0);
    room.handle('a', { t: 'trivia.start' }, T0);
    expect(room.handle('b', { t: 'trivia.leave' }, T0 + 10).ok).toBe(true);
    expect(room.handle('b', { t: 'trivia.leave' }, T0 + 20)).toMatchObject({ code: 'not-playing' });
    expect(room.handle('c', { t: 'leave' }, T0 + 30).ok).toBe(true);
    expect(room.isMember('c')).toBe(false);
    expect(room.viewFor('a', T0 + 40).trivia.scores.map((x) => x.id)).toEqual(['a']);
  });
});

describe('trivia: the real bank stays on the server', () => {
  it('the guest-mode deck the browser build uses shares no question with the real bank', async () => {
    const guest = await import('../src/client/guestTriviaBank.js');
    const real = new Set(TRIVIA_BANK.map((q) => q.q.toLowerCase()));
    expect(guest.TRIVIA_BANK.length).toBeGreaterThanOrEqual(10);
    for (const q of guest.TRIVIA_BANK) expect(real.has(q.q.toLowerCase())).toBe(false);
  });
});
