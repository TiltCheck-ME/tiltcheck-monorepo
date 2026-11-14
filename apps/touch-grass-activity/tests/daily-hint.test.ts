// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-14
// Daily Grass hint: unlocks after the 3rd guess, one per player per Chicago day, reveals the leftmost
// spot not already green (never a green one), the rest of the answer never reaches the client, hinted
// solves still count but carry a bulb on Today's solvers and in the share text, and friends never see
// the letter.
import { describe, expect, it } from 'vitest';
import { DailyBook, DailySolvers, HINT_AFTER, HINT_MARK, answerFor, hintPosition, shareText, validSolver, type DailyRules } from '../src/shared/daily.js';
import { DAILY_ANSWERS, isValidGuess } from '../src/shared/dailyWords.js';
import { dayNumberFor, memoryBookStorage } from '../src/shared/scores.js';
import { memorySoloService } from '../src/shared/solo.js';
import { runDaily } from '../src/shared/soloHost.js';
import { Room, createRoomState } from '../src/shared/room.js';
import { makeRng } from '../src/shared/rng.js';
import { parseClientMessage, type RoomUser, type ServerMessage } from '../src/shared/protocol.js';
import { RoomHost, type HostSocket } from '../worker/src/host.js';

// 2026-11-12 12:00 CST
const NOON = Date.UTC(2026, 10, 12, 18, 0, 0);
const DAY = 86_400_000;
/** One known answer and any five letters as a guess, so the greens are easy to reason about. */
const fixed: DailyRules = { salt: 's', answers: ['crane'], isValid: (w) => /^[a-z]{5}$/.test(w) };
const real: DailyRules = { salt: 'test-salt', answers: DAILY_ANSWERS, isValid: isValidGuess };
const GUILD = '123456789';
const ana: RoomUser = { id: '100000001', name: 'Ana', avatar: null };
const bo: RoomUser = { id: '100000002', name: 'Bo', avatar: null };

function guildRoom(): Room {
  const room = new Room(createRoomState(`i-1-gc-${GUILD}-987654321`), makeRng(1));
  room.state.guildId = GUILD;
  room.join(ana, NOON);
  room.join(bo, NOON);
  return room;
}

describe('Daily Grass hint: unlock and limits', () => {
  it('locked until the 3rd guess, then one letter in its spot', async () => {
    const book = new DailyBook(memoryBookStorage(), fixed);
    expect(HINT_AFTER).toBe(3);
    expect(await book.hint('u1', NOON)).toMatchObject({ ok: false, code: 'hint-locked' });
    await book.guess('u1', 'zzzzz', NOON);
    await book.guess('u1', 'yyyyy', NOON);
    expect(await book.hint('u1', NOON)).toMatchObject({ ok: false, code: 'hint-locked', message: 'Hint unlocks after 3 guesses.' });
    await book.guess('u1', 'xxxxx', NOON);
    const r = await book.hint('u1', NOON);
    expect(r).toMatchObject({ ok: true, justFinished: false, record: { status: 'playing', answer: null, hint: { pos: 0, letter: 'c' } } });
  });

  it('one per day: a second ask is refused, the hint sticks to the board, and a new Chicago day starts clean', async () => {
    const book = new DailyBook(memoryBookStorage(), fixed);
    for (const w of ['zzzzz', 'yyyyy', 'xxxxx']) await book.guess('u1', w, NOON);
    expect((await book.hint('u1', NOON)).ok).toBe(true);
    expect(await book.hint('u1', NOON + 1000)).toMatchObject({ ok: false, code: 'hint-used' });
    // Persisted: a reopen and the next guess still carry it.
    expect(await book.open('u1', NOON + 2000)).toMatchObject({ ok: true, record: { hint: { pos: 0, letter: 'c' } } });
    expect(await book.guess('u1', 'wwwww', NOON + 3000)).toMatchObject({ ok: true, record: { hint: { pos: 0, letter: 'c' } } });
    // Next Chicago day: fresh board, no hint, locked again until 3 guesses.
    const tomorrow = NOON + DAY;
    expect(await book.open('u1', tomorrow)).toMatchObject({ ok: true, record: { hint: null, rows: [] } });
    expect(await book.hint('u1', tomorrow)).toMatchObject({ ok: false, code: 'hint-locked' });
  });

  it('no hint once the game is over', async () => {
    const book = new DailyBook(memoryBookStorage(), fixed);
    for (const w of ['zzzzz', 'yyyyy', 'crane']) await book.guess('u1', w, NOON);
    expect(await book.hint('u1', NOON)).toMatchObject({ ok: false, code: 'daily-done' });
  });

  it('never reveals a spot that is already green in any row; leftmost open spot wins', async () => {
    expect(hintPosition([['g', 'b', 'b', 'b', 'b']])).toBe(1);
    expect(hintPosition([['g', 'b', 'b', 'b', 'b'], ['b', 'g', 'y', 'b', 'b']])).toBe(2);
    expect(hintPosition([['g', 'g', 'b', 'b', 'b'], ['b', 'b', 'g', 'g', 'g']])).toBe(-1);

    const book = new DailyBook(memoryBookStorage(), fixed);
    // Greens spread over rows: C (row 1), R (row 2), A (row 3). Spot 4 (N) is the first one left.
    for (const w of ['czzzz', 'zrzzz', 'zzazz']) await book.guess('u1', w, NOON);
    const r = await book.hint('u1', NOON);
    if (!r.ok || !r.record.hint) throw new Error('no hint');
    expect(r.record.hint).toEqual({ pos: 3, letter: 'n' });
    for (const row of r.record.rows) expect(row.colors[r.record.hint.pos]).not.toBe('g');

    // Every spot already green somewhere: nothing to show, and the day's hint isn't spent.
    const all = new DailyBook(memoryBookStorage(), fixed);
    for (const w of ['crzzz', 'zzane', 'qqqqq']) await all.guess('u2', w, NOON);
    expect(await all.hint('u2', NOON)).toMatchObject({ ok: false, code: 'hint-nothing' });
    expect(await all.open('u2', NOON)).toMatchObject({ ok: true, record: { hint: null } });
  });

  it('on the real list the revealed letter matches the answer in that spot and that spot was not green', async () => {
    const book = new DailyBook(memoryBookStorage(), real);
    const answer = answerFor(dayNumberFor(NOON), real.salt, DAILY_ANSWERS);
    for (const w of DAILY_ANSWERS.filter((x) => x !== answer).slice(0, 3)) await book.guess('u1', w, NOON);
    const r = await book.hint('u1', NOON);
    if (!r.ok || !r.record.hint) throw new Error('no hint');
    const { pos, letter } = r.record.hint;
    expect(letter).toBe(answer[pos]);
    expect(r.record.rows.some((row) => row.colors[pos] === 'g')).toBe(false);
    expect(pos).toBe(hintPosition(r.record.rows.map((row) => row.colors)));
  });
});

describe('Daily Grass hint: the answer stays on the server', () => {
  it('the hint response and the room views never carry the answer; friends never see the letter or a hint flag', async () => {
    const solo = memorySoloService(real);
    const room = guildRoom();
    const answer = answerFor(dayNumberFor(NOON), real.salt, DAILY_ANSWERS);
    const wrong = DAILY_ANSWERS.filter((w) => w !== answer).slice(0, 3);
    for (const w of wrong) await runDaily(room, solo, ana, { t: 'daily.guess', word: w }, GUILD, NOON);
    const direct = await solo.dailyHint(ana, NOON + 1);
    // The service answered with the board; the room only learns it through runDaily.
    expect(direct.ok).toBe(true);
    expect(JSON.stringify(direct)).not.toContain(answer);
    expect(await runDaily(room, solo, ana, { t: 'daily.hint' }, GUILD, NOON)).toMatchObject({ ok: false, code: 'hint-used' });

    // Fresh player, through the room.
    const room2 = guildRoom();
    const solo2 = memorySoloService(real);
    for (const w of wrong) await runDaily(room2, solo2, ana, { t: 'daily.guess', word: w }, GUILD, NOON);
    expect(await runDaily(room2, solo2, ana, { t: 'daily.hint' }, GUILD, NOON)).toEqual({ ok: true });
    const mine = room2.viewFor(ana.id, NOON);
    expect(mine.daily.me?.answer).toBeNull();
    expect(mine.daily.me?.hint?.letter).toBe(answer[mine.daily.me!.hint!.pos]);
    expect(JSON.stringify(mine)).not.toContain(answer);
    const theirs = room2.viewFor(bo.id, NOON);
    expect(theirs.daily.friends).toEqual([{ id: ana.id, rows: 3, status: 'playing', away: false }]);
    expect(theirs.daily.me).toBeNull();
    expect(JSON.stringify(theirs)).not.toMatch(/"hint"|"letter"/);
  });

  it('daily.hint parses off the wire, and through the host no state message carries the answer', async () => {
    expect(parseClientMessage('{"t":"daily.hint"}')).toEqual({ t: 'daily.hint' });
    expect(parseClientMessage('{"t":"daily.hint","pos":2}')).toEqual({ t: 'daily.hint' });

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
    const sockets: Sock[] = [];
    const host = new RoomHost({ storage: new Store(), sockets: () => sockets, verify: async () => ana, now: () => NOON, rng: makeRng(3), solo: memorySoloService(real) });
    const s = new Sock();
    sockets.push(s);
    const roomId = `i-1-gc-${GUILD}-987654321`;
    await host.setGuild(roomId, GUILD);
    await host.onMessage(roomId, s, JSON.stringify({ t: 'auth', token: 'x' }));
    await host.onMessage(roomId, s, JSON.stringify({ t: 'daily.open' }));
    await host.onMessage(roomId, s, JSON.stringify({ t: 'daily.hint' }));
    expect(s.inbox.at(-1)).toMatchObject({ t: 'error', code: 'hint-locked' });
    const answer = answerFor(dayNumberFor(NOON), real.salt, DAILY_ANSWERS);
    for (const w of DAILY_ANSWERS.filter((x) => x !== answer).slice(0, 3)) await host.onMessage(roomId, s, JSON.stringify({ t: 'daily.guess', word: w }));
    await host.onMessage(roomId, s, JSON.stringify({ t: 'daily.hint' }));
    const states = s.inbox.filter((m) => m.t === 'state');
    const last = states.at(-1);
    if (!last || last.t !== 'state') throw new Error('no state');
    expect(last.view.daily.me?.hint).toMatchObject({ letter: answer[last.view.daily.me!.hint!.pos] });
    for (const m of s.inbox) expect(JSON.stringify(m)).not.toContain(`"${answer}"`);
  });
});

describe('Daily Grass hint: solvers, stats and the share text', () => {
  it('a hinted solve still counts (stats, streak, rank) and gets the flag on Today\'s solvers; a clean solve does not', async () => {
    const solo = memorySoloService(real);
    const room = guildRoom();
    const answer = answerFor(dayNumberFor(NOON), real.salt, DAILY_ANSWERS);
    const wrong = DAILY_ANSWERS.filter((w) => w !== answer).slice(0, 3);
    await runDaily(room, solo, bo, { t: 'daily.guess', word: answer }, GUILD, NOON + 10_000);
    for (const w of wrong) await runDaily(room, solo, ana, { t: 'daily.guess', word: w }, GUILD, NOON);
    await runDaily(room, solo, ana, { t: 'daily.hint' }, GUILD, NOON);
    await runDaily(room, solo, ana, { t: 'daily.guess', word: answer }, GUILD, NOON + 20_000);
    const v = room.viewFor(ana.id, NOON).daily;
    expect(v.me).toMatchObject({ status: 'won', stats: { wins: 1, played: 1, current: 1, best: 1, dist: [0, 0, 0, 1, 0, 0] } });
    expect(v.myRank).toBe(2);
    if (v.solvers.kind !== 'board') throw new Error('no board');
    expect(v.solvers.rows.map((r) => [r.id, r.hint === true])).toEqual([
      [bo.id, false],
      [ana.id, true],
    ]);
    expect(JSON.stringify(v.solvers)).not.toMatch(/"letter"|"pos"/);
  });

  it('validSolver keeps a boolean flag only; anything else is refused or dropped', () => {
    const base = { id: 'a1', name: 'A', avatar: null, guesses: 3, ms: 1000, at: NOON };
    expect(validSolver({ ...base, hint: true })).toEqual({ ...base, hint: true });
    expect(validSolver({ ...base, hint: false })).toEqual(base);
    expect(validSolver(base)).toEqual(base);
    expect(validSolver({ ...base, hint: 'n' })).toBeNull();
    expect(validSolver({ ...base, hint: true, letter: 'n', pos: 3 })).toEqual({ ...base, hint: true });
  });

  it('old solver rows without the flag still load and sort', async () => {
    const board = new DailySolvers(memoryBookStorage());
    await board.record({ id: 'a1', name: 'A', avatar: null, guesses: 4, ms: 5, at: NOON }, NOON);
    await board.record({ id: 'b1', name: 'B', avatar: null, guesses: 3, ms: 5, at: NOON, hint: true }, NOON);
    expect((await board.view(NOON)).rows.map((r) => [r.id, r.hint ?? false])).toEqual([
      ['b1', true],
      ['a1', false],
    ]);
  });

  it('Copy result adds the bulb when a hint was used, never the letter', () => {
    const rows = [
      { word: 'crane', colors: ['b', 'y', 'b', 'b', 'g'] as const },
      { word: 'tribe', colors: ['g', 'g', 'g', 'g', 'g'] as const },
    ].map((r) => ({ word: r.word, colors: [...r.colors] }));
    const plain = shareText('Daily Grass', { dayNumber: dayNumberFor(NOON), status: 'won', rows, hint: null });
    const hinted = shareText('Daily Grass', { dayNumber: dayNumberFor(NOON), status: 'won', rows, hint: { pos: 2, letter: 'i' } });
    expect(plain).not.toContain(HINT_MARK);
    expect(hinted.split('\n')[0]).toBe(`Daily Grass #1 2/6 ${HINT_MARK}`);
    expect(hinted.split('\n').slice(1)).toEqual(plain.split('\n').slice(1));
    expect(hinted).not.toMatch(/[a-z]{5}|\bI\b/);
    expect(hinted.replace('Daily Grass', '')).not.toMatch(/i/i);
  });
});
