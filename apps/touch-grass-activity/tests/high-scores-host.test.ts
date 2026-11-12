// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// The room only puts a game on the board when it ran that game to the end, with its own scores.
import { describe, expect, it } from 'vitest';
import { RoomHost, SCORE_MAX_TRIES, SCORE_RETRY_MS, type HostSocket } from '../worker/src/host.js';
import type { RoomUser, ServerMessage } from '../src/shared/protocol.js';
import { guildForInstance, parseClientMessage } from '../src/shared/protocol.js';
import type { RoomState } from '../src/shared/room.js';
import { makeRng } from '../src/shared/rng.js';
import { ANSWER_MS, REVEAL_MS } from '../src/shared/trivia.js';
import { ScoreBook, memoryBookStorage, type FinishedScore } from '../src/shared/scores.js';

const GUILD = '123456789012345678';

class FakeSocket implements HostSocket {
  user: RoomUser | null = null;
  inbox: ServerMessage[] = [];
  send(m: string): void {
    this.inbox.push(JSON.parse(m) as ServerMessage);
  }
  close(): void {}
  setUser(u: RoomUser): void {
    this.user = u;
  }
  view() {
    const s = [...this.inbox].reverse().find((m) => m.t === 'state');
    if (!s || s.t !== 'state') throw new Error('no state');
    return s.view;
  }
}

const USERS: Record<string, RoomUser> = {
  'tok-a': { id: '100000001', name: 'Ana', avatar: 'aaa111' },
  'tok-b': { id: '100000002', name: 'Bo', avatar: null },
};

function setup(opts: { guild?: string | null; fail?: number } = {}) {
  const data = new Map<string, unknown>();
  const sockets: FakeSocket[] = [];
  let now = Date.parse('2026-11-12T20:00:00Z');
  const posts: Array<{ guild: string; results: FinishedScore[] }> = [];
  const book = new ScoreBook(memoryBookStorage());
  let failures = opts.fail ?? 0;
  const wakes: Array<number | null> = [];
  const host = new RoomHost({
    storage: { get: async (k) => structuredClone(data.get(k)) as never, put: async (k, v) => void data.set(k, structuredClone(v)) },
    sockets: () => sockets,
    verify: async (t) => USERS[t] ?? null,
    now: () => now,
    rng: makeRng(7),
    setWake: async (at) => void wakes.push(at),
    postScores: async (guild, results) => {
      if (failures > 0) {
        failures -= 1;
        throw new Error('down');
      }
      posts.push({ guild, results: structuredClone(results) });
      return book.record(results, now);
    },
  });
  const connect = async (tok: string) => {
    const s = new FakeSocket();
    sockets.push(s);
    await host.onMessage('i-hs', s, JSON.stringify({ t: 'auth', token: tok }));
    return s;
  };
  const act = (s: FakeSocket, a: object) => host.onMessage('i-hs', s, JSON.stringify(a));
  const room = () => data.get('room') as RoomState;
  /** Play a whole game: Ana always right and fast, Bo always wrong. */
  const playGame = async (a: FakeSocket, b: FakeSocket, questions = 10) => {
    await act(a, { t: 'trivia.start' });
    for (let q = 0; q < questions; q += 1) {
      const cur = room().trivia.current!;
      now += 1000;
      await act(a, { t: 'trivia.answer', qid: cur.id, choice: cur.correct });
      await act(b, { t: 'trivia.answer', qid: cur.id, choice: (cur.correct + 1) % 4 });
      now += REVEAL_MS;
      await host.onAlarm('i-hs');
    }
  };
  return { host, connect, act, posts, book, room, playGame, wakes, advance: (ms: number) => (now += ms), setGuild: () => host.setGuild('i-hs', opts.guild === undefined ? GUILD : opts.guild) };
}

describe('high scores from the room', () => {
  it('a finished game posts each player once, with the server scores, and the end screen brags', async () => {
    const t = setup();
    await t.setGuild();
    const a = await t.connect('tok-a');
    const b = await t.connect('tok-b');
    await t.playGame(a, b);
    expect(t.room().trivia.phase).toBe('over');
    expect(t.posts).toHaveLength(1);
    expect(t.posts[0]!.guild).toBe(GUILD);
    const scores = t.room().trivia.scores;
    expect(t.posts[0]!.results).toEqual([
      { id: '100000001', name: 'Ana', avatar: 'aaa111', score: scores['100000001'] },
      { id: '100000002', name: 'Bo', avatar: null, score: 0 },
    ]);
    const av = a.view().trivia;
    expect(av.highScores).toBe('posted');
    expect(av.me.brag).toEqual({ personalBest: true, weekRank: 1, allTimeRank: 1 });
    // Bo scored 0: nothing to brag about, and nobody else's brag leaks to him.
    expect(b.view().trivia.me.brag).toBeNull();
    // More saves after the game do not post again.
    await t.act(a, { t: 'dad.sit' });
    await t.host.onAlarm('i-hs');
    expect(t.posts).toHaveLength(1);
  });

  it('a game that is restarted or abandoned mid-way never reaches the board', async () => {
    const t = setup();
    await t.setGuild();
    const a = await t.connect('tok-a');
    const b = await t.connect('tok-b');
    await t.act(a, { t: 'trivia.start' });
    const cur = t.room().trivia.current!;
    await t.act(a, { t: 'trivia.answer', qid: cur.id, choice: cur.correct });
    await t.act(a, { t: 'trivia.leave' });
    await t.act(b, { t: 'trivia.leave' });
    t.advance(ANSWER_MS + REVEAL_MS);
    await t.host.onAlarm('i-hs');
    expect(t.posts).toHaveLength(0);
    expect(t.room().trivia.phase).not.toBe('over');
  });

  it('no client message can hand in a score', async () => {
    for (const raw of [{ t: 'trivia.score', score: 9999 }, { t: 'trivia.finish', scores: { x: 1 } }, { t: 'trivia.answer', qid: 'q1', choice: 0, points: 9999 }]) {
      const m = parseClientMessage(JSON.stringify(raw));
      if (m) expect(Object.keys(m).sort()).toEqual(['choice', 'qid', 't']);
    }
    const t = setup();
    await t.setGuild();
    const a = await t.connect('tok-a');
    await t.act(a, { t: 'trivia.score', score: 9999 });
    expect(a.inbox.at(-1)).toMatchObject({ t: 'error', code: 'bad-message' });
    expect(t.posts).toHaveLength(0);
  });

  it('no server (DM / group DM): off the record, nothing posted', async () => {
    const t = setup({ guild: null });
    const a = await t.connect('tok-a');
    const b = await t.connect('tok-b');
    await t.playGame(a, b);
    expect(t.posts).toHaveLength(0);
    expect(a.view().trivia.highScores).toBe('off-record');
    expect(a.view().trivia.me.brag).toBeNull();
  });

  it('a failed board write retries on the alarm; best-only makes the retry harmless', async () => {
    const t = setup({ fail: 1 });
    await t.setGuild();
    const a = await t.connect('tok-a');
    const b = await t.connect('tok-b');
    await t.playGame(a, b);
    expect(t.posts).toHaveLength(0);
    expect(a.view().trivia.highScores).toBe('pending');
    expect(t.wakes.at(-1)).not.toBeNull();
    t.advance(SCORE_RETRY_MS);
    await t.host.onAlarm('i-hs');
    expect(t.posts).toHaveLength(1);
    expect(a.view().trivia.highScores).toBe('posted');
    expect(SCORE_MAX_TRIES).toBeGreaterThan(1);
  });

  it('guild comes from the instance id when Discord put it there', () => {
    expect(guildForInstance('i-1276580072400224306-gc-912952092627435520-912954213460484116', '999999999999')).toBe('912952092627435520');
    expect(guildForInstance('i-1276580072400224306-pc-912954213460484116', '999999999999')).toBeNull();
    expect(guildForInstance('i-local-test', '999999999999')).toBe('999999999999');
    expect(guildForInstance('i-local-test', 'nope')).toBeNull();
  });
});
