// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// Durable Object logic with fake storage, fake sockets and a fake token check.
import { describe, expect, it } from 'vitest';
import { RoomHost, type HostSocket } from '../worker/src/host.js';
import type { RoomUser, ServerMessage } from '../src/shared/protocol.js';
import type { RoomState } from '../src/shared/room.js';
import { makeRng } from '../src/shared/rng.js';

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
  const host = new RoomHost({
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
  return { host, storage, sockets, connect, act, wakes, advance: (ms: number) => (now += ms), nowFn: () => now };
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

  it('closing the last socket for a user leaves the room; a second tab keeps them in', async () => {
    const { connect, host, sockets } = setup();
    const a1 = await connect('tok-a');
    const a2 = await connect('tok-a');
    const b = await connect('tok-b');
    sockets.splice(sockets.indexOf(a1), 1);
    await host.onClose('i-test', a1);
    expect(b.lastState().members).toHaveLength(2);
    sockets.splice(sockets.indexOf(a2), 1);
    await host.onClose('i-test', a2);
    expect(b.lastState().members.map((m) => m.name)).toEqual(['Bo']);
  });

  it('judge disconnect skips the round for everyone', async () => {
    const { connect, act, host, sockets, storage } = setup();
    const socks = [await connect('tok-a'), await connect('tok-b'), await connect('tok-c'), await connect('tok-d')];
    for (const s of socks) await act(s, { t: 'dad.sit' });
    await act(socks[0]!, { t: 'dad.start' });
    const judgeId = (await storage.get<RoomState>('room'))!.dad.judgeId!;
    const judge = socks.find((s) => s.user!.id === judgeId)!;
    sockets.splice(sockets.indexOf(judge), 1);
    await host.onClose('i-test', judge);
    const v = socks.find((s) => s !== judge)!.lastState().dad;
    expect(v.lastRound?.skipped).toBe('judge-left');
    expect(v.phase).toBe('submitting');
    expect(v.seats).toHaveLength(3);
  });

  it('break: alarm is scheduled at the end and the alarm finishes it', async () => {
    const { connect, act, host, wakes, advance } = setup();
    const a = await connect('tok-a');
    const b = await connect('tok-b');
    await act(a, { t: 'break.start', minutes: 5 });
    const endsAt = a.lastState().brk.endsAt!;
    expect(wakes.at(-1)).toBe(endsAt);
    expect(b.lastState().brk.phase).toBe('running');
    await act(b, { t: 'break.bail' });
    expect(a.lastState().brk.crew.find((c) => c.id === '100000002')?.bailedAt).not.toBeNull();
    advance(5 * 60_000);
    await host.onAlarm('i-test');
    expect(a.lastState().brk.phase).toBe('done');
    expect(wakes.at(-1)).toBeNull();
  });

  it('polling fallback: state joins, action validates, quiet pollers get swept', async () => {
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
