// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// Daily Grass: tile colors, the daily pick, the answer staying on the server, streaks at Chicago
// midnight, Today's solvers (and the DM skip), and the word lists.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DailyBook,
  DailySolvers,
  MAX_GUESSES,
  answerFor,
  applyFinish,
  colorize,
  effectiveStreak,
  emptyStats,
  puzzleNumber,
  sha256Hex,
  shareText,
  type DailyBoard,
} from '../src/shared/daily.js';
import { DAILY_ANSWERS, isValidGuess } from '../src/shared/dailyWords.js';
import { dayKeyFor, dayNumberFor, memoryBookStorage } from '../src/shared/scores.js';
import { memorySoloService } from '../src/shared/solo.js';
import { runDaily } from '../src/shared/soloHost.js';
import { Room, createRoomState } from '../src/shared/room.js';
import { makeRng } from '../src/shared/rng.js';
import { RoomHost, type HostSocket } from '../worker/src/host.js';
import type { RoomUser, ServerMessage } from '../src/shared/protocol.js';

const root = new URL('..', import.meta.url).pathname;
const SALT = 'test-salt';
const rules = { salt: SALT, answers: DAILY_ANSWERS, isValid: isValidGuess };
// 2026-11-12 12:00 CST
const NOON = Date.UTC(2026, 10, 12, 18, 0, 0);

describe('Daily Grass: tile colors', () => {
  it('greens, yellows and grays on a plain guess', () => {
    expect(colorize('crane', 'react')).toEqual(['y', 'y', 'g', 'b', 'y']);
    expect(colorize('react', 'react')).toEqual(['g', 'g', 'g', 'g', 'g']);
    expect(colorize('fudgy', 'react')).toEqual(['b', 'b', 'b', 'b', 'b']);
  });

  it('repeated letters: only as many yellows as the answer has unmatched copies', () => {
    // One E in the answer, already matched green: the other two Es are gray.
    expect(colorize('eerie', 'crane')).toEqual(['b', 'b', 'y', 'b', 'g']);
    // Two Ls in the answer, none in place: both guessed Ls are yellow; the second E is gray.
    expect(colorize('level', 'hello')).toEqual(['y', 'g', 'b', 'b', 'y']);
    // Guess has two Bs, answer has two: one green, one yellow.
    expect(colorize('babes', 'abbey')).toEqual(['y', 'y', 'g', 'g', 'b']);
    // Guess has three Os, answer has one (in place): the others are gray.
    expect(colorize('ooooo', 'robot').filter((c) => c !== 'b')).toHaveLength(2);
    expect(colorize('ooooo', 'robot')).toEqual(['b', 'g', 'b', 'g', 'b']);
    // A green later in the word claims its copy first, so an earlier extra copy goes gray.
    expect(colorize('sassy', 'class')).toEqual(['y', 'y', 'b', 'g', 'b']);
  });
});

describe('Daily Grass: the daily pick', () => {
  it('sha256 matches node:crypto', () => {
    for (const t of ['', 'abc', 'daily-grass:x', 'a'.repeat(200), 'accented é ü ß']) expect(sha256Hex(t)).toBe(createHash('sha256').update(t).digest('hex'));
  });

  it('same day + same salt = same word; the list is walked without repeats', () => {
    const d = dayNumberFor(NOON);
    expect(answerFor(d, SALT, DAILY_ANSWERS)).toBe(answerFor(d, SALT, DAILY_ANSWERS));
    const run = Array.from({ length: DAILY_ANSWERS.length }, (_, i) => answerFor(d + i, SALT, DAILY_ANSWERS));
    expect(new Set(run).size).toBe(DAILY_ANSWERS.length);
    for (const w of run) expect(DAILY_ANSWERS).toContain(w);
  });

  it('the salt decides the order, so the client cannot work tomorrow out from the list alone', () => {
    const d = dayNumberFor(NOON);
    const a = Array.from({ length: 30 }, (_, i) => answerFor(d + i, 'salt-one', DAILY_ANSWERS));
    const b = Array.from({ length: 30 }, (_, i) => answerFor(d + i, 'salt-two', DAILY_ANSWERS));
    expect(a).not.toEqual(b);
  });

  it('two players on the same day face the same word (same guess, same colors)', async () => {
    const book = new DailyBook(memoryBookStorage(), rules);
    const r1 = await book.guess('100000001', 'crane', NOON);
    const r2 = await book.guess('100000002', 'crane', NOON + 3_600_000);
    if (!r1.ok || !r2.ok) throw new Error('guess failed');
    expect(r1.record.rows[0]!.colors).toEqual(r2.record.rows[0]!.colors);
    expect(r1.record.rows[0]!.colors).toEqual(colorize('crane', answerFor(dayNumberFor(NOON), SALT, DAILY_ANSWERS)));
  });

  it('guess validation: five letters, a real word, nothing after the game is over', async () => {
    const book = new DailyBook(memoryBookStorage(), rules);
    expect(await book.guess('u1', 'abc', NOON)).toMatchObject({ ok: false, code: 'bad-guess' });
    expect(await book.guess('u1', 'qzxjv', NOON)).toMatchObject({ ok: false, code: 'not-a-word' });
    const answer = answerFor(dayNumberFor(NOON), SALT, DAILY_ANSWERS);
    const r = await book.guess('u1', answer, NOON);
    expect(r).toMatchObject({ ok: true, justFinished: true });
    expect(await book.guess('u1', 'crane', NOON)).toMatchObject({ ok: false, code: 'daily-done' });
  });
});

describe('Daily Grass: the answer stays on the server', () => {
  it('no answer in the player payload until their game is over; friends never see letters', async () => {
    const solo = memorySoloService(rules);
    const room = new Room(createRoomState('i-1-gc-123456789-987654321'), makeRng(1));
    room.state.guildId = '123456789';
    const ana: RoomUser = { id: '100000001', name: 'Ana', avatar: null };
    const bo: RoomUser = { id: '100000002', name: 'Bo', avatar: null };
    room.join(ana, NOON);
    room.join(bo, NOON);
    const answer = answerFor(dayNumberFor(NOON), SALT, DAILY_ANSWERS);
    const wrong = DAILY_ANSWERS.filter((w) => w !== answer).slice(0, MAX_GUESSES);
    expect((await runDaily(room, solo, ana, { t: 'daily.open' }, '123456789', NOON)).ok).toBe(true);
    for (const w of wrong.slice(0, 5)) expect((await runDaily(room, solo, ana, { t: 'daily.guess', word: w }, '123456789', NOON)).ok).toBe(true);
    const mine = JSON.stringify(room.viewFor(ana.id, NOON));
    expect(mine).not.toContain(`"${answer}"`);
    expect(room.viewFor(ana.id, NOON).daily.me?.answer).toBeNull();
    const theirs = room.viewFor(bo.id, NOON);
    expect(theirs.daily.friends).toEqual([{ id: ana.id, rows: 5, status: 'playing', away: false }]);
    for (const w of wrong.slice(0, 5)) expect(JSON.stringify(theirs)).not.toContain(w);
    // Sixth wrong guess ends it: now (and only now) the answer is in Ana's own view.
    await runDaily(room, solo, ana, { t: 'daily.guess', word: wrong[5]! }, '123456789', NOON);
    expect(room.viewFor(ana.id, NOON).daily.me).toMatchObject({ status: 'lost', answer });
    expect(JSON.stringify(room.viewFor(bo.id, NOON))).not.toContain(`"${answer}"`);
  });

  it('the browser build swaps out the word lists and the Myth or Math bank (vite aliases cover every client import)', () => {
    const vite = readFileSync(join(root, 'vite.config.ts'), 'utf8');
    const aliases = [...vite.matchAll(/find: \/(.+?)\/, replacement/g)].map((m) => new RegExp(m[1]!));
    const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? files(join(dir, f)) : [join(dir, f)]));
    const clientAndShared = [...files(join(root, 'src/client')), ...files(join(root, 'src/shared'))].filter((f) => f.endsWith('.ts'));
    let checked = 0;
    for (const f of clientAndShared) {
      for (const m of readFileSync(f, 'utf8').matchAll(/from '([^']*(?:triviaBank|dailyWords|mythBank)\.js)'/g)) {
        if (f.includes('/src/client/guest')) continue; // the guest files import types only
        checked += 1;
        expect({ f, spec: m[1], aliased: aliases.some((re) => re.test(m[1]!)) }).toEqual({ f, spec: m[1], aliased: true });
      }
    }
    expect(checked).toBeGreaterThanOrEqual(3);
    // The dictionary is only ever reached through dailyWords.
    for (const f of clientAndShared) if (!f.endsWith('dailyWords.ts')) expect(readFileSync(f, 'utf8')).not.toMatch(/from '[^']*dailyDictionary\.js'/);
  });
});

describe('Daily Grass: streaks roll over at midnight Central', () => {
  const board = (ms: number, status: DailyBoard['status'], n = 3): DailyBoard => ({
    day: dayKeyFor(ms),
    dayNumber: dayNumberFor(ms),
    guesses: Array.from({ length: n }, () => 'crane'),
    colors: [],
    status,
    startedAt: ms,
    finishedAt: ms,
  });

  it('the day turns at 00:00 America/Chicago, not UTC', () => {
    // 23:59 CST on Nov 12 is 05:59 UTC on Nov 13.
    expect(dayKeyFor(Date.UTC(2026, 10, 13, 5, 59))).toBe('2026-11-12');
    expect(dayKeyFor(Date.UTC(2026, 10, 13, 6, 0))).toBe('2026-11-13');
    // Summer (CDT, UTC-5): midnight is 05:00 UTC.
    expect(dayKeyFor(Date.UTC(2026, 6, 4, 4, 59))).toBe('2026-07-03');
    expect(dayKeyFor(Date.UTC(2026, 6, 4, 5, 0))).toBe('2026-07-04');
    // Across the spring-forward night the day numbers still step by one.
    expect(dayNumberFor(Date.UTC(2026, 2, 9, 12)) - dayNumberFor(Date.UTC(2026, 2, 8, 12))).toBe(1);
    expect(puzzleNumber(dayNumberFor(NOON))).toBe(1);
  });

  it('a win at 23:59 and another at 00:01 Central make a 2-day streak; a skipped day resets it', () => {
    const s = emptyStats();
    applyFinish(s, board(Date.UTC(2026, 10, 13, 5, 59), 'won', 3));
    applyFinish(s, board(Date.UTC(2026, 10, 13, 6, 1), 'won', 4));
    expect(s).toMatchObject({ played: 2, wins: 2, current: 2, best: 2, dist: [0, 0, 1, 1, 0, 0] });
    // Nov 15 Central: Nov 14 was skipped, so the streak shows 0 and the next win starts at 1.
    const nov15 = Date.UTC(2026, 10, 15, 18);
    expect(effectiveStreak(s, dayNumberFor(nov15))).toBe(0);
    applyFinish(s, board(nov15, 'won', 2));
    expect(s).toMatchObject({ current: 1, best: 2 });
    applyFinish(s, board(Date.UTC(2026, 10, 16, 18), 'lost', 6));
    expect(s).toMatchObject({ played: 4, wins: 3, current: 0, best: 2 });
  });

  it('a new Chicago day gives a fresh board and keeps the stats', async () => {
    const book = new DailyBook(memoryBookStorage(), rules);
    const late = Date.UTC(2026, 10, 13, 5, 58); // 23:58 CST Nov 12
    const ans1 = answerFor(dayNumberFor(late), SALT, DAILY_ANSWERS);
    expect(await book.guess('u1', ans1, late)).toMatchObject({ ok: true, record: { status: 'won', day: '2026-11-12' } });
    const early = Date.UTC(2026, 10, 13, 6, 2); // 00:02 CST Nov 13
    const opened = await book.open('u1', early);
    if (!opened.ok) throw new Error('open failed');
    expect(opened.record).toMatchObject({ day: '2026-11-13', status: 'playing', rows: [], answer: null });
    const ans2 = answerFor(dayNumberFor(early), SALT, DAILY_ANSWERS);
    const r = await book.guess('u1', ans2, early);
    expect(r).toMatchObject({ ok: true, record: { stats: { current: 2, wins: 2 } } });
  });
});

describe("Daily Grass: Today's solvers", () => {
  it('fewest guesses first, then fastest; one row per player', async () => {
    const board = new DailySolvers(memoryBookStorage());
    await board.record({ id: 'a1', name: 'A', avatar: null, guesses: 4, ms: 50_000, at: NOON }, NOON);
    await board.record({ id: 'b1', name: 'B', avatar: null, guesses: 3, ms: 90_000, at: NOON }, NOON);
    await board.record({ id: 'c1', name: 'C', avatar: null, guesses: 3, ms: 40_000, at: NOON }, NOON);
    expect(await board.record({ id: 'a1', name: 'A', avatar: null, guesses: 1, ms: 1, at: NOON }, NOON)).toBe(3);
    expect((await board.view(NOON)).rows.map((r) => r.id)).toEqual(['c1', 'b1', 'a1']);
    // Next Chicago day: empty board.
    expect((await board.view(NOON + 86_400_000)).rows).toEqual([]);
  });

  it('a solve in a server goes on its board; a solve in a DM skips the board ("No server, no board")', async () => {
    const solo = memorySoloService(rules);
    const answer = answerFor(dayNumberFor(NOON), SALT, DAILY_ANSWERS);
    const guildRoom = new Room(createRoomState('i-1-gc-123456789-987654321'), makeRng(1));
    guildRoom.state.guildId = '123456789';
    const ana: RoomUser = { id: '100000001', name: 'Ana', avatar: null };
    guildRoom.join(ana, NOON);
    await runDaily(guildRoom, solo, ana, { t: 'daily.open' }, '123456789', NOON);
    await runDaily(guildRoom, solo, ana, { t: 'daily.guess', word: answer }, '123456789', NOON + 65_000);
    const gv = guildRoom.viewFor(ana.id, NOON).daily;
    expect(gv.myRank).toBe(1);
    expect(gv.solvers).toMatchObject({ kind: 'board', rows: [{ id: ana.id, guesses: 1, ms: 65_000 }] });

    const dm = new Room(createRoomState('i-1-pc-555555555'), makeRng(2));
    const bo: RoomUser = { id: '100000002', name: 'Bo', avatar: null };
    dm.join(bo, NOON);
    await runDaily(dm, solo, bo, { t: 'daily.guess', word: answer }, null, NOON);
    const dv = dm.viewFor(bo.id, NOON).daily;
    expect(dv.me?.status).toBe('won');
    expect(dv.solvers).toEqual({ kind: 'no-server' });
    expect(dv.myRank).toBeNull();
    // Stats still count (they're per player, not per server).
    expect(dv.me?.stats.wins).toBe(1);
    // And nothing from the DM landed on any server's board.
    expect((await solo.dailySolvers('123456789', NOON)).rows.map((r) => r.id)).toEqual([ana.id]);
    expect([...solo.guilds.keys()]).toEqual(['123456789']);
  });
});

describe('Daily Grass: share text', () => {
  it('emoji grid only: no letters, no answer', () => {
    const text = shareText('Daily Grass', {
      dayNumber: dayNumberFor(NOON),
      status: 'won',
      rows: [
        { word: 'crane', colors: ['b', 'y', 'b', 'b', 'g'] },
        { word: 'tribe', colors: ['g', 'g', 'g', 'g', 'g'] },
      ],
    });
    expect(text.split('\n')[0]).toBe('Daily Grass #1 2/6');
    expect(text).not.toMatch(/crane|tribe/i);
    expect(text.split('\n')).toHaveLength(3);
  });
});

describe('Daily Grass: word lists', () => {
  const MONEY = /\b(bonus|lucky|penny|purse|vault|money|cash|bets?|poker|dice|chips?|coins?|prize|wager|odds|slots?|spins?|loans?|debts?|price|worth|token|trade|value|stake|kitty|bank)\b/;
  it('365+ unique answers, all five lowercase letters, all valid guesses, no money or gambling words', () => {
    expect(DAILY_ANSWERS.length).toBeGreaterThanOrEqual(365);
    expect(new Set(DAILY_ANSWERS).size).toBe(DAILY_ANSWERS.length);
    for (const w of DAILY_ANSWERS) {
      expect(w).toMatch(/^[a-z]{5}$/);
      expect(isValidGuess(w)).toBe(true);
      expect({ w, hit: MONEY.test(w) }).toEqual({ w, hit: false });
    }
  });

  it('the dictionary is the bigger list and accepts real words only', () => {
    expect(isValidGuess('zebra')).toBe(true);
    expect(isValidGuess('qzxjv')).toBe(false);
    expect(isValidGuess('ZEBRA')).toBe(false); // the room lowercases before it gets here
  });
});

describe('Daily Grass through the room host', () => {
  class Store {
    data = new Map<string, unknown>();
    async get<T>(k: string) {
      const v = this.data.get(k);
      return v === undefined ? undefined : (structuredClone(v) as T);
    }
    async put<T>(k: string, v: T) {
      this.data.set(k, structuredClone(v));
    }
  }
  class Sock implements HostSocket {
    user: RoomUser | null = null;
    inbox: ServerMessage[] = [];
    send(m: string) {
      this.inbox.push(JSON.parse(m) as ServerMessage);
    }
    close() {}
    setUser(u: RoomUser) {
      this.user = u;
    }
  }

  it('guesses go through the host, colors come back, the answer never rides a state message', async () => {
    const sockets: Sock[] = [];
    const solo = memorySoloService(rules);
    const host = new RoomHost({ storage: new Store(), sockets: () => sockets, verify: async () => ({ id: '100000001', name: 'Ana', avatar: null }), now: () => NOON, rng: makeRng(3), solo });
    const s = new Sock();
    sockets.push(s);
    const key = 'i-1-gc-123456789-987654321';
    await host.setGuild(key, '123456789');
    await host.onMessage(key, s, JSON.stringify({ t: 'auth', token: 'x' }));
    await host.onMessage(key, s, JSON.stringify({ t: 'daily.open' }));
    await host.onMessage(key, s, JSON.stringify({ t: 'daily.guess', word: 'CRANE' }));
    const answer = answerFor(dayNumberFor(NOON), SALT, DAILY_ANSWERS);
    const states = s.inbox.filter((m) => m.t === 'state');
    const last = states.at(-1);
    if (!last || last.t !== 'state') throw new Error('no state');
    expect(last.view.daily.me?.rows).toEqual([{ word: 'crane', colors: colorize('crane', answer) }]);
    if (answer !== 'crane') for (const m of states) expect(JSON.stringify(m)).not.toContain(`"${answer}"`);
    // Junk is refused on the wire.
    await host.onMessage(key, s, JSON.stringify({ t: 'daily.guess', word: 'cr4ne' }));
    expect(s.inbox.at(-1)).toMatchObject({ t: 'error', code: 'bad-message' });
  });

  it('without a solo service the game says it is not set up (no crash, no board)', async () => {
    const sockets: Sock[] = [];
    const host = new RoomHost({ storage: new Store(), sockets: () => sockets, verify: async () => ({ id: '100000001', name: 'Ana', avatar: null }), now: () => NOON, rng: makeRng(3) });
    const s = new Sock();
    sockets.push(s);
    await host.onMessage('i-x', s, JSON.stringify({ t: 'auth', token: 'x' }));
    await host.onMessage('i-x', s, JSON.stringify({ t: 'daily.open' }));
    expect(s.inbox.at(-1)).toMatchObject({ t: 'error', code: 'not-configured' });
  });
});
