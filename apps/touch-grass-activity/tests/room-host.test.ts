// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// Durable Object logic with fake storage, fake sockets and a fake token check.
import { describe, expect, it } from 'vitest';
import { RoomHost, type HostSocket } from '../worker/src/host.js';
import type { RoomUser, ServerMessage } from '../src/shared/protocol.js';
import { AWAY_GRACE_MS, type RoomState } from '../src/shared/room.js';
import { makeRng } from '../src/shared/rng.js';
import { ANSWER_MS, REVEAL_MS } from '../src/shared/trivia.js';
import type { LiveReport } from '../src/shared/live.js';

class FakeStorage {
  data = new Map<string, unknown>();
  puts = 0;
  async get<T>(k: string): Promise<T | undefined> {
    const v = this.data.get(k);
    return v === undefined ? undefined : (structuredClone(v) as T);
  }
  async put<T>(k: string, v: T): Promise<void> {
    this.puts += 1;
    this.data.set(k, structuredClone(v));
  }
}

class FakeSocket implements HostSocket {
  user: RoomUser | null = null;
  inbox: ServerMessage[] = [];
  closed: number | null = null;
  send(msg: string): void {
    this.inbox.push(JSON.parse(msg) as ServerMessage);
  }
  close(code?: number): void {
    this.closed = code ?? 1000;
  }
  setUser(u: RoomUser): void {
    this.user = u;
  }
  lastState() {
    const s = [...this.inbox].reverse().find((m) => m.t === 'state');
    if (!s || s.t !== 'state') throw new Error('no state');
    return s.view;
  }
  lastError() {
    return [...this.inbox].reverse().find((m) => m.t === 'error');
  }
}

const USERS: Record<string, RoomUser> = {
  'tok-a': { id: '100000001', name: 'Ana', avatar: null },
  'tok-b': { id: '100000002', name: 'Bo', avatar: null },
  'tok-c': { id: '100000003', name: 'Cy', avatar: null },
  'tok-d': { id: '100000004', name: 'Di', avatar: null },
};

function setup() {
  const storage = new FakeStorage();
  const sockets: FakeSocket[] = [];
  let now = 1_000;
  const wakes: Array<number | null> = [];
  const reports: LiveReport[] = [];
  const host = new RoomHost({
    report: async (r) => {
      reports.push(r);
    },
    storage,
    sockets: () => sockets,
    verify: async (t) => USERS[t] ?? null,
    now: () => now,
    rng: makeRng(42),
    setWake: async (at) => {
      wakes.push(at);
    },
  });
  const connect = async (token: string) => {
    const s = new FakeSocket();
    sockets.push(s);
    await host.onMessage('i-test', s, JSON.stringify({ t: 'auth', token }));
    return s;
  };
  const act = (s: FakeSocket, a: object) => host.onMessage('i-test', s, JSON.stringify(a));
  /** Simulate the socket dropping (iOS app switch): gone from the live list, then onClose. */
  const drop = async (s: FakeSocket) => {
    sockets.splice(sockets.indexOf(s), 1);
    await host.onClose('i-test', s);
  };
  return { host, storage, sockets, connect, act, drop, wakes, reports, advance: (ms: number) => (now += ms), nowFn: () => now };
}

describe('RoomHost (Durable Object logic)', () => {
  it('rejects bad tokens and closes the socket', async () => {
    const { connect } = setup();
    const s = await connect('nope');
    expect(s.lastError()).toMatchObject({ code: 'unauthorized' });
    expect(s.closed).toBe(4001);
    expect(s.user).toBeNull();
  });

  it('refuses actions before auth', async () => {
    const { act } = setup();
    const s = new FakeSocket();
    await act(s, { t: 'dad.sit' });
    expect(s.lastError()).toMatchObject({ code: 'unauthorized' });
  });

  it('auth joins the room and broadcasts presence to everyone', async () => {
    const { connect, storage } = setup();
    const a = await connect('tok-a');
    const b = await connect('tok-b');
    expect(a.lastState().members.map((m) => m.name)).toEqual(['Ana', 'Bo']);
    expect(b.lastState().you).toBe('100000002');
    const saved = (await storage.get<RoomState>('room'))!;
    expect(Object.keys(saved.members)).toHaveLength(2);
  });

  it('rejects junk and oversized messages', async () => {
    const { connect, host } = setup();
    const a = await connect('tok-a');
    await host.onMessage('i-test', a, '{not json');
    expect(a.lastError()).toMatchObject({ code: 'bad-message' });
    await host.onMessage('i-test', a, JSON.stringify({ t: 'dad.submit', cardId: '../../etc' }));
    expect(a.lastError()).toMatchObject({ code: 'bad-message' });
    await host.onMessage('i-test', a, 'x'.repeat(5000));
    expect(a.lastError()).toMatchObject({ code: 'too-big' });
  });

  it('plays a round over sockets without leaking hands', async () => {
    const { connect, act, storage } = setup();
    const socks = [await connect('tok-a'), await connect('tok-b'), await connect('tok-c')];
    for (const s of socks) await act(s, { t: 'dad.sit' });
    await act(socks[0]!, { t: 'dad.start', target: 3 });
    const saved = (await storage.get<RoomState>('room'))!;
    for (const s of socks) {
      const v = s.lastState();
      expect(v.dad.phase).toBe('submitting');
      expect(v.dad.hand).toHaveLength(7);
      for (const [owner, hand] of Object.entries(saved.dad.hands)) {
        if (owner === s.user!.id) continue;
        const json = JSON.stringify(s.inbox);
        for (const c of hand) expect(json).not.toContain(`"id":"${c.id}"`);
      }
    }
    const judgeId = saved.dad.judgeId!;
    const players = socks.filter((s) => s.user!.id !== judgeId);
    const judge = socks.find((s) => s.user!.id === judgeId)!;
    // Wrong card id is refused
    await act(players[0]!, { t: 'dad.submit', cardId: 'w999' });
    expect(players[0]!.lastError()).toMatchObject({ code: 'card-not-in-hand' });
    for (const p of players) await act(p, { t: 'dad.submit', cardId: p.lastState().dad.hand[0]!.id });
    const jv = judge.lastState().dad;
    expect(jv.phase).toBe('judging');
    expect(jv.entries).toHaveLength(2);
    // Non-judge cannot pick
    await act(players[0]!, { t: 'dad.pick', entryId: jv.entries[0]!.entryId });
    expect(players[0]!.lastError()).toMatchObject({ code: 'not-judge' });
    await act(judge, { t: 'dad.pick', entryId: jv.entries[0]!.entryId });
    const after = players[0]!.lastState().dad;
    expect(after.phase).toBe('reveal');
    expect(after.seats.reduce((n, s) => n + s.score, 0)).toBe(1);
  });

  it('rate limits a button masher', async () => {
    const { connect, act } = setup();
    const a = await connect('tok-a');
    for (let i = 0; i < 15; i += 1) await act(a, { t: i % 2 ? 'dad.stand' : 'dad.sit' });
    expect(a.inbox.some((m) => m.t === 'error' && m.code === 'rate-limited')).toBe(true);
  });

  it('a dropped socket marks the user away (not gone); a second tab keeps them fully here', async () => {
    const { connect, drop } = setup();
    const a1 = await connect('tok-a');
    const a2 = await connect('tok-a');
    const b = await connect('tok-b');
    await drop(a1);
    expect(b.lastState().members.map((m) => [m.name, m.away])).toEqual([
      ['Ana', false],
      ['Bo', false],
    ]);
    await drop(a2);
    expect(b.lastState().members.map((m) => [m.name, m.away])).toEqual([
      ['Ana', true],
      ['Bo', false],
    ]);
  });

  it('away grace: disconnect then reconnect inside 3 minutes keeps the seat, hand and score', async () => {
    const { connect, act, drop, advance, host, wakes } = setup();
    const socks = [await connect('tok-a'), await connect('tok-b'), await connect('tok-c')];
    for (const s of socks) await act(s, { t: 'dad.sit' });
    await act(socks[0]!, { t: 'dad.start', target: 5 });
    const a = socks[0]!;
    const handBefore = a.lastState().dad.hand.map((c) => c.id);
    expect(handBefore).toHaveLength(7);
    await drop(a);
    const seen = socks[1]!.lastState().dad;
    expect(seen.seats).toHaveLength(3);
    expect(seen.seats.find((x) => x.id === '100000001')?.away).toBe(true);
    expect(wakes.at(-1)).toBe(1_000 + AWAY_GRACE_MS);
    advance(AWAY_GRACE_MS - 10_000);
    await host.onAlarm('i-test');
    expect(socks[1]!.lastState().dad.seats).toHaveLength(3);
    const back = await connect('tok-a');
    const v = back.lastState().dad;
    expect(v.me.seated).toBe(true);
    expect(v.hand.map((c) => c.id)).toEqual(handBefore);
    expect(v.seats.find((x) => x.id === '100000001')?.away).toBe(false);
    expect(socks[1]!.lastState().members.every((m) => !m.away)).toBe(true);
  });

  it('away grace: after 3 minutes the seat is released and the player removed', async () => {
    const { connect, act, drop, advance, host } = setup();
    const socks = [await connect('tok-a'), await connect('tok-b'), await connect('tok-c'), await connect('tok-d')];
    for (const s of socks) await act(s, { t: 'dad.sit' });
    await act(socks[0]!, { t: 'dad.start', target: 5 });
    const d = socks[3]!;
    await drop(d);
    advance(AWAY_GRACE_MS);
    await host.onAlarm('i-test');
    const v = socks[0]!.lastState();
    expect(v.members.map((m) => m.name)).toEqual(['Ana', 'Bo', 'Cy']);
    expect(v.dad.seats.map((x) => x.id)).not.toContain('100000004');
    // Coming back after expiry is a fresh join: not seated, no hand.
    const back = await connect('tok-d');
    expect(back.lastState().dad.me.seated).toBe(false);
    expect(back.lastState().dad.hand).toHaveLength(0);
  });

  it('explicit leave and stand remove right away, no grace', async () => {
    const { connect, act } = setup();
    const a = await connect('tok-a');
    const b = await connect('tok-b');
    await act(a, { t: 'dad.sit' });
    await act(a, { t: 'dad.stand' });
    expect(b.lastState().dad.seats).toHaveLength(0);
    await act(a, { t: 'leave' });
    expect(b.lastState().members.map((m) => m.name)).toEqual(['Bo']);
    expect(a.closed).toBe(1000);
  });

  it('judge away: the round waits out the grace period, then skips', async () => {
    const { connect, act, drop, advance, host, storage } = setup();
    const socks = [await connect('tok-a'), await connect('tok-b'), await connect('tok-c'), await connect('tok-d')];
    for (const s of socks) await act(s, { t: 'dad.sit' });
    await act(socks[0]!, { t: 'dad.start' });
    const judgeId = (await storage.get<RoomState>('room'))!.dad.judgeId!;
    const judge = socks.find((s) => s.user!.id === judgeId)!;
    const others = socks.filter((s) => s !== judge);
    for (const p of others) await act(p, { t: 'dad.submit', cardId: p.lastState().dad.hand[0]!.id });
    expect(others[0]!.lastState().dad.phase).toBe('judging');
    await drop(judge);
    advance(AWAY_GRACE_MS - 1);
    await host.onAlarm('i-test');
    expect(others[0]!.lastState().dad.phase).toBe('judging');
    advance(1);
    await host.onAlarm('i-test');
    const v = others[0]!.lastState().dad;
    expect(v.lastRound?.skipped).toBe('judge-left');
    expect(v.seats).toHaveLength(3);
  });

  it('judge disconnect skips the round for everyone once the grace period ends', async () => {
    const { connect, act, host, sockets, storage, advance } = setup();
    const socks = [await connect('tok-a'), await connect('tok-b'), await connect('tok-c'), await connect('tok-d')];
    for (const s of socks) await act(s, { t: 'dad.sit' });
    await act(socks[0]!, { t: 'dad.start' });
    const judgeId = (await storage.get<RoomState>('room'))!.dad.judgeId!;
    const judge = socks.find((s) => s.user!.id === judgeId)!;
    sockets.splice(sockets.indexOf(judge), 1);
    await host.onClose('i-test', judge);
    expect(socks.find((s) => s !== judge)!.lastState().dad.lastRound).toBeNull();
    advance(AWAY_GRACE_MS);
    await host.onAlarm('i-test');
    const v = socks.find((s) => s !== judge)!.lastState().dad;
    expect(v.lastRound?.skipped).toBe('judge-left');
    expect(v.phase).toBe('submitting');
    expect(v.seats).toHaveLength(3);
  });

  it('trivia: 3 players over the host, alarms drive the round, answer hidden until reveal', async () => {
    const { connect, act, host, wakes, advance, nowFn, storage } = setup();
    const socks = [await connect('tok-a'), await connect('tok-b'), await connect('tok-c')];
    await act(socks[1]!, { t: 'trivia.start' });
    for (let q = 1; q <= 10; q += 1) {
      const v = socks[0]!.lastState().trivia;
      expect(v.phase).toBe('question');
      expect(v.number).toBe(q);
      for (const s of socks) expect(JSON.stringify(s.inbox.at(-1))).not.toContain('"correct"');
      expect(wakes.at(-1)).toBe(v.endsAt);
      const saved = (await storage.get<RoomState>('room'))!;
      const correct = saved.trivia.current!.correct;
      const qid = v.question!.id;
      advance(1_000);
      await act(socks[0]!, { t: 'trivia.answer', qid, choice: correct });
      await act(socks[0]!, { t: 'trivia.answer', qid, choice: correct });
      expect(socks[0]!.lastError()).toMatchObject({ code: 'already-answered' });
      await act(socks[1]!, { t: 'trivia.answer', qid, choice: (correct + 1) % 4 });
      // Cy sleeps: the window runs out on the alarm.
      advance(ANSWER_MS);
      await host.onAlarm('i-test');
      const r = socks[2]!.lastState().trivia;
      expect(r.phase).toBe('reveal');
      expect(r.reveal!.correct).toBe(correct);
      // Late answer after the window is refused.
      await act(socks[2]!, { t: 'trivia.answer', qid, choice: correct });
      expect(socks[2]!.lastError()?.code).toMatch(/not-open|too-late/);
      advance(REVEAL_MS);
      await host.onAlarm('i-test');
    }
    const end = socks[0]!.lastState().trivia;
    expect(end.phase).toBe('over');
    expect(end.winnerIds).toEqual(['100000001']);
    expect(end.scores.find((x) => x.id === '100000001')!.score).toBe(10 * (100 + Math.round((50 * (ANSWER_MS - 1000)) / ANSWER_MS)));
    expect(end.scores.find((x) => x.id === '100000003')!.score).toBe(0);
    expect(nowFn()).toBeGreaterThan(0);
  });

  it('trivia: an away player stays on the board and scores 0 while away; back in time keeps the score', async () => {
    const { connect, act, drop, host, advance, storage } = setup();
    const socks = [await connect('tok-a'), await connect('tok-b'), await connect('tok-c')];
    await act(socks[0]!, { t: 'trivia.start' });
    let saved = (await storage.get<RoomState>('room'))!;
    let qid = saved.trivia.current!.id;
    for (const s of socks) await act(s, { t: 'trivia.answer', qid, choice: saved.trivia.current!.correct });
    const afterQ1 = socks[0]!.lastState().trivia.scores.find((x) => x.id === '100000003')!.score;
    expect(afterQ1).toBeGreaterThan(100);
    advance(REVEAL_MS);
    await host.onAlarm('i-test');
    await drop(socks[2]!);
    saved = (await storage.get<RoomState>('room'))!;
    qid = saved.trivia.current!.id;
    // Only the two connected players need to answer for the window to close.
    await act(socks[0]!, { t: 'trivia.answer', qid, choice: saved.trivia.current!.correct });
    await act(socks[1]!, { t: 'trivia.answer', qid, choice: saved.trivia.current!.correct });
    const v = socks[0]!.lastState().trivia;
    expect(v.phase).toBe('reveal');
    const cy = v.scores.find((x) => x.id === '100000003')!;
    expect(cy).toMatchObject({ away: true, score: afterQ1 });
    const back = await connect('tok-c');
    expect(back.lastState().trivia.me.playing).toBe(true);
    expect(back.lastState().trivia.scores.find((x) => x.id === '100000003')!.score).toBe(afterQ1);
  });

  it('live registry: reports on change, with guild, and a zero-member report when the room empties', async () => {
    const { connect, act, host, reports, drop, advance } = setup();
    await host.setGuild('i-test', '123456789012345678');
    const a = await connect('tok-a');
    await act(a, { t: 'dad.sit' });
    const last = reports.at(-1)!;
    expect(last).toMatchObject({ instanceId: 'i-test', guildId: '123456789012345678', members: 1, games: { dad: { count: 1 } } });
    const n = reports.length;
    await act(a, { t: 'ping' });
    expect(reports.length).toBe(n);
    advance(60_000);
    await act(a, { t: 'ping' });
    expect(reports.length).toBe(n + 1);
    await host.setGuild('i-test', '999999999999999999');
    expect(reports.at(-1)!.guildId).toBe('123456789012345678');
    await drop(a);
    advance(AWAY_GRACE_MS);
    await host.onAlarm('i-test');
    expect(reports.at(-1)!.members).toBe(0);
    expect(JSON.stringify(reports)).not.toMatch(/Ana|100000001/);
  });

  it('polling fallback: state joins, action validates, quiet pollers go away, then get swept', async () => {
    const { host, connect, advance } = setup();
    const ws = await connect('tok-a');
    const user = USERS['tok-b']!;
    const r1 = await host.pollState('i-test', user);
    expect(r1.status).toBe(200);
    expect(ws.lastState().members).toHaveLength(2);
    const bad = await host.pollAction('i-test', user, JSON.stringify({ t: 'auth', token: 'x' }));
    expect(bad.status).toBe(400);
    const wrong = await host.pollAction('i-test', user, JSON.stringify({ t: 'dad.next' }));
    expect(wrong.status).toBe(409);
    const good = await host.pollAction('i-test', user, JSON.stringify({ t: 'dad.sit' }));
    expect(good.status).toBe(200);
    advance(60_000);
    await host.onAlarm('i-test');
    expect(ws.lastState().members.map((m) => [m.name, m.away])).toEqual([
      ['Ana', false],
      ['Bo', true],
    ]);
    advance(AWAY_GRACE_MS);
    await host.onAlarm('i-test');
    expect(ws.lastState().members.map((m) => m.name)).toEqual(['Ana']);
  });

  it('state survives a restart (eviction) via storage', async () => {
    const t = setup();
    const a = await t.connect('tok-a');
    await t.act(a, { t: 'dad.sit' });
    const host2 = new RoomHost({ storage: t.storage, sockets: () => t.sockets, verify: async (x) => USERS[x] ?? null, now: t.nowFn });
    const r = await host2.pollState('i-test', USERS['tok-a']!);
    expect(r.body.t === 'state' && r.body.view.dad.seats.map((s) => s.id)).toEqual(['100000001']);
  });
});
