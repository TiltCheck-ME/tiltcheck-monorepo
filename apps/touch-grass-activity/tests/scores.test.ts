// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// Trivia high scores: best-only, top-10 trimming, the Monday 00:00 America/Chicago week, guild
// isolation, and the TriviaScores Durable Object's routes.
import { describe, expect, it } from 'vitest';
import { BOARD_SIZE, ScoreBook, memoryBookStorage, placeRow, validFinished, weekStartFor, type BoardView, type ScoreRow } from '../src/shared/scores.js';
import { TriviaScores, scoresName } from '../worker/src/scores-do.js';

const p = (id: string, score: number) => ({ id, name: `P${id}`, avatar: null, score });

describe('Chicago week boundary', () => {
  it('Monday 00:00 CST (UTC-6) in November', () => {
    const mon = Date.parse('2026-11-16T06:00:00Z'); // Mon Nov 16 00:00 CST
    expect(weekStartFor(mon)).toBe(mon);
    expect(weekStartFor(mon - 1)).toBe(Date.parse('2026-11-09T06:00:00Z')); // Sun 23:59:59.999 CST
    expect(weekStartFor(Date.parse('2026-11-12T20:38:00Z'))).toBe(Date.parse('2026-11-09T06:00:00Z'));
    expect(weekStartFor(Date.parse('2026-11-22T23:00:00Z'))).toBe(mon); // Sun 17:00 CST
  });

  it('Monday 00:00 CDT (UTC-5) in July', () => {
    const mon = Date.parse('2026-07-13T05:00:00Z');
    expect(weekStartFor(mon)).toBe(mon);
    expect(weekStartFor(mon - 1000)).toBe(Date.parse('2026-07-06T05:00:00Z'));
  });

  it('weeks that cross a DST change', () => {
    // DST ended Sun Nov 1 2026: the week of Oct 26 starts in CDT, the week of Nov 2 in CST.
    expect(weekStartFor(Date.parse('2026-11-01T12:00:00Z'))).toBe(Date.parse('2026-10-26T05:00:00Z'));
    expect(weekStartFor(Date.parse('2026-11-02T06:00:00Z'))).toBe(Date.parse('2026-11-02T06:00:00Z'));
    expect(weekStartFor(Date.parse('2026-11-02T05:59:59Z'))).toBe(Date.parse('2026-10-26T05:00:00Z'));
    // DST started Sun Mar 8 2026.
    expect(weekStartFor(Date.parse('2026-03-08T12:00:00Z'))).toBe(Date.parse('2026-03-02T06:00:00Z'));
    expect(weekStartFor(Date.parse('2026-03-09T05:00:00Z'))).toBe(Date.parse('2026-03-09T05:00:00Z'));
  });
});

describe('board rows', () => {
  it('best only: one row per player, a lower score never replaces a higher one', () => {
    const rows: ScoreRow[] = [];
    placeRow(rows, { ...p('a', 500), at: 1 });
    placeRow(rows, { ...p('a', 300), at: 2 });
    expect(rows).toEqual([{ ...p('a', 500), at: 1 }]);
    placeRow(rows, { ...p('a', 809), at: 3 });
    expect(rows).toEqual([{ ...p('a', 809), at: 3 }]);
  });

  it('keeps the top 10, ties go to whoever got there first', () => {
    const rows: ScoreRow[] = [];
    for (let i = 0; i < 12; i += 1) placeRow(rows, { ...p(`u${i}`, 100 + i * 10), at: i });
    expect(rows).toHaveLength(BOARD_SIZE);
    expect(rows[0]!.id).toBe('u11');
    expect(rows.map((r) => r.id)).not.toContain('u0');
    expect(rows.map((r) => r.id)).not.toContain('u1');
    placeRow(rows, { ...p('late', 210), at: 99 }); // ties u11
    expect(rows.findIndex((r) => r.id === 'late')).toBe(1);
    expect(rows).toHaveLength(BOARD_SIZE);
  });

  it('rejects anything that does not look like a server-computed result', () => {
    expect(validFinished({ id: 'a', name: 'x', avatar: null, score: 1.5 })).toBeNull();
    expect(validFinished({ id: 'a', name: 'x', avatar: null, score: -1 })).toBeNull();
    expect(validFinished({ id: 'a', name: 'x', avatar: null, score: 999_999 })).toBeNull();
    expect(validFinished({ id: '../x', name: 'x', avatar: null, score: 1 })).toBeNull();
    expect(validFinished({ id: 'a', name: 'x', avatar: '<img>', score: 1 })).toBeNull();
    expect(validFinished({ id: 'a', name: 'x\u0000y', avatar: 'abc123', score: 1 })).toEqual({ id: 'a', name: 'xy', avatar: 'abc123', score: 1 });
  });
});

describe('ScoreBook', () => {
  const T0 = Date.parse('2026-11-12T20:00:00Z'); // Thu
  const NEXT_MON = Date.parse('2026-11-16T06:00:00Z');

  it('brags: new personal best and ranks; a worse game is not a personal best', async () => {
    const book = new ScoreBook(memoryBookStorage());
    const b1 = await book.record([p('a', 809), p('b', 400)], T0);
    expect(b1.a).toEqual({ personalBest: true, weekRank: 1, allTimeRank: 1 });
    expect(b1.b).toEqual({ personalBest: true, weekRank: 2, allTimeRank: 2 });
    const b2 = await book.record([p('a', 300), p('b', 900)], T0 + 60_000);
    expect(b2.a).toEqual({ personalBest: false, weekRank: null, allTimeRank: null });
    expect(b2.b).toEqual({ personalBest: true, weekRank: 1, allTimeRank: 1 });
    const v = await book.view('1', 'a', T0 + 120_000);
    expect(v.allTime.map((r) => [r.id, r.score])).toEqual([
      ['b', 900],
      ['a', 809],
    ]);
    expect(v.me.allTime).toEqual({ score: 809, rank: 2 });
  });

  it('ranks are computed after the whole game is placed (results order does not matter)', async () => {
    const book = new ScoreBook(memoryBookStorage());
    const b = await book.record([p('ana', 422), p('bo', 559), p('cy', 386)], T0);
    expect([b.ana!.weekRank, b.bo!.weekRank, b.cy!.weekRank]).toEqual([2, 1, 3]);
    expect([b.ana!.allTimeRank, b.bo!.allTimeRank, b.cy!.allTimeRank]).toEqual([2, 1, 3]);
  });

  it('zero scores are not recorded', async () => {
    const book = new ScoreBook(memoryBookStorage());
    expect(await book.record([p('a', 0)], T0)).toEqual({});
    expect((await book.view('1', 'a', T0)).allTime).toEqual([]);
  });

  it('weekly board resets at Monday 00:00 Chicago; all time and the all-time best stay', async () => {
    const book = new ScoreBook(memoryBookStorage());
    await book.record([p('a', 809)], T0);
    const sunNight = await book.view('1', 'a', NEXT_MON - 1);
    expect(sunNight.week).toHaveLength(1);
    expect(sunNight.me.week).toEqual({ score: 809, rank: 1 });
    const monday = await book.view('1', 'a', NEXT_MON);
    expect(monday.week).toEqual([]);
    expect(monday.weekStart).toBe(NEXT_MON);
    expect(monday.me.week).toBeNull();
    expect(monday.allTime.map((r) => r.score)).toEqual([809]);
    // A lower game on Monday tops the new week but is not an all-time personal best.
    const b = await book.record([p('a', 500)], NEXT_MON + 1000);
    expect(b.a).toEqual({ personalBest: false, weekRank: 1, allTimeRank: null });
  });

  it('a player off the top 10 still sees their personal best', async () => {
    const book = new ScoreBook(memoryBookStorage());
    await book.record(
      Array.from({ length: 10 }, (_, i) => p(`top${i}`, 1000 + i)),
      T0,
    );
    const b = await book.record([p('me', 200)], T0 + 1);
    expect(b.me).toEqual({ personalBest: true, weekRank: null, allTimeRank: null });
    const v = await book.view('1', 'me', T0 + 2);
    expect(v.allTime).toHaveLength(10);
    expect(v.allTime.map((r) => r.id)).not.toContain('me');
    expect(v.me).toEqual({ week: { score: 200, rank: null }, allTime: { score: 200, rank: null } });
  });

  it('rows carry only id, name, avatar, score and date', async () => {
    const book = new ScoreBook(memoryBookStorage());
    await book.record([{ id: '123456', name: 'Jme', avatar: 'abc', score: 809, extra: 'nope' } as never], T0);
    const v = await book.view('1', null, T0);
    expect(Object.keys(v.allTime[0]!).sort()).toEqual(['at', 'avatar', 'id', 'name', 'score']);
  });
});

// ---------- the Durable Object ----------

function fakeCtx() {
  const s = memoryBookStorage();
  return { storage: { get: s.get, put: s.put } } as unknown as DurableObjectState;
}

describe('TriviaScores Durable Object', () => {
  const G1 = '111111111111111111';
  const G2 = '222222222222222222';

  it('one object per guild: two guilds never share a board', async () => {
    const ns = new Map<string, TriviaScores>();
    const stub = (g: string) => {
      const k = scoresName(g);
      if (!ns.has(k)) ns.set(k, new TriviaScores(fakeCtx(), {}));
      return ns.get(k)!;
    };
    const rec = (g: string, results: unknown[]) => stub(g).fetch(new Request('https://x/record', { method: 'POST', body: JSON.stringify({ guild: g, results }) }));
    expect((await rec(G1, [p('100001', 809)])).status).toBe(200);
    await rec(G2, [p('100002', 300)]);
    const v1 = (await (await stub(G1).fetch(new Request(`https://x/board?guild=${G1}&me=100001`))).json()) as BoardView;
    const v2 = (await (await stub(G2).fetch(new Request(`https://x/board?guild=${G2}&me=100001`))).json()) as BoardView;
    expect(v1.allTime.map((r) => r.id)).toEqual(['100001']);
    expect(v2.allTime.map((r) => r.id)).toEqual(['100002']);
    expect(v2.me.allTime).toBeNull();
    expect(scoresName(G1)).not.toBe(scoresName(G2));
  });

  it('drops malformed results and bad guilds', async () => {
    const d = new TriviaScores(fakeCtx(), {});
    const r = await d.fetch(new Request('https://x/record', { method: 'POST', body: JSON.stringify({ guild: G1, results: [{ id: 'x', name: 'n', avatar: null, score: 'lots' }, p('ok', 10)] }) }));
    expect(((await r.json()) as { brags: object }).brags).toEqual({ ok: { personalBest: true, weekRank: 1, allTimeRank: 1 } });
    expect((await d.fetch(new Request('https://x/record', { method: 'POST', body: JSON.stringify({ guild: 'abc', results: [] }) }))).status).toBe(400);
    expect((await d.fetch(new Request('https://x/board?guild=abc'))).status).toBe(400);
    expect((await d.fetch(new Request('https://x/nope'))).status).toBe(404);
  });
});
