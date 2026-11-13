// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// Table alerts with a mocked fetch only. Nothing here talks to Discord.
import { describe, expect, it } from 'vitest';
import { ALERT_COPY, OPEN_RECHECK_MS, SETTLE_MS, THROTTLE_MS, alertsEnabled, emptyAlertState, evaluateAlerts, upgradeAlertState, type AlertConfig } from '../worker/src/alerts.js';
import { LiveRegistry } from '../worker/src/registry-do.js';
import type { LiveEntry, LiveReport } from '../src/shared/live.js';
import { reportFor } from '../src/shared/live.js';
import { Room, createRoomState } from '../src/shared/room.js';
import { makeRng } from '../src/shared/rng.js';

const GUILD = '1488253239643078787';
const OTHER = '222222222222222222';
const HOOK = 'https://discord.com/api/webhooks/1570538531544240999/abcdefghijklmnopqrstuvwxyz_ABCDEFG-123456';

interface Call {
  url: string;
  method: string;
  body: { content: string; allowed_mentions: { parse: string[] } };
}

function mockFetch() {
  const calls: Call[] = [];
  let n = 0;
  const f = async (url: string, init?: RequestInit) => {
    calls.push({ url, method: init?.method ?? 'GET', body: JSON.parse(String(init?.body)) });
    n += 1;
    return new Response(JSON.stringify({ id: `90000000000000000${n}` }), { status: 200 });
  };
  return { calls, f };
}

function entry(instanceId: string, guildId: string | null, dad: { phase: string; count: number }, trivia: { phase: string; count: number; waiting?: number } = { phase: 'idle', count: 0 }, members = 1): LiveEntry {
  return { instanceId, guildId, members, at: 0, games: { dad: { ...dad, joinable: true }, trivia: { ...trivia, joinable: false }, bluff: { phase: 'seating', count: 0, joinable: false } } };
}

const seated = (g: string | null = GUILD) => entry('i-1', g, { phase: 'seating', count: 1 });

describe('table alerts', () => {
  it('dormant without the webhook secret (or with junk in it): no fetch at all', async () => {
    const { calls, f } = mockFetch();
    for (const cfg of [{ guildId: GUILD }, { guildId: GUILD, webhookUrl: '' }, { guildId: GUILD, webhookUrl: 'https://evil.example/api/webhooks/1/x' }, { webhookUrl: HOOK }] as AlertConfig[]) {
      expect(alertsEnabled(cfg)).toBe(false);
      const s = emptyAlertState();
      const r = await evaluateAlerts([seated()], s, 0, { ...cfg, fetch: f });
      expect(r).toEqual({ changed: false, wakeAt: null });
      await evaluateAlerts([seated()], s, SETTLE_MS * 10, { ...cfg, fetch: f });
    }
    expect(calls).toHaveLength(0);
    expect(alertsEnabled({ guildId: GUILD, webhookUrl: HOOK })).toBe(true);
  });

  it('only rooms in the alert guild count', async () => {
    const { calls, f } = mockFetch();
    const s = emptyAlertState();
    const cfg = { guildId: GUILD, webhookUrl: HOOK, fetch: f };
    await evaluateAlerts([seated(OTHER), seated(null)], s, 0, cfg);
    await evaluateAlerts([seated(OTHER), seated(null)], s, SETTLE_MS, cfg);
    expect(calls).toHaveLength(0);
    await evaluateAlerts([seated(GUILD)], s, SETTLE_MS, cfg);
    const r = await evaluateAlerts([seated(GUILD)], s, SETTLE_MS * 2, cfg);
    expect(calls).toHaveLength(1);
    expect(r.wakeAt).toBe(SETTLE_MS * 2 + OPEN_RECHECK_MS);
  });

  it('a room that empties inside the settle window never alerts', async () => {
    const { calls, f } = mockFetch();
    const s = emptyAlertState();
    const cfg = { guildId: GUILD, webhookUrl: HOOK, fetch: f };
    const r1 = await evaluateAlerts([seated()], s, 1000, cfg);
    expect(r1.wakeAt).toBe(1000 + SETTLE_MS);
    await evaluateAlerts([], s, 1000 + SETTLE_MS - 1, cfg); // gone at 19.999 s
    await evaluateAlerts([], s, 1000 + SETTLE_MS, cfg);
    expect(calls).toHaveLength(0);
    expect(s.dad.since).toBeNull();
    // Coming back restarts the settle clock.
    await evaluateAlerts([seated()], s, 30_000, cfg);
    await evaluateAlerts([seated()], s, 30_000 + SETTLE_MS - 1, cfg);
    expect(calls).toHaveLength(0);
    await evaluateAlerts([seated()], s, 30_000 + SETTLE_MS, cfg);
    expect(calls).toHaveLength(1);
  });

  it('throttle: at most one post per game per 10 minutes; trivia is throttled on its own', async () => {
    const { calls, f } = mockFetch();
    const s = emptyAlertState();
    const cfg = { guildId: GUILD, webhookUrl: HOOK, fetch: f };
    let t = 0;
    const cycle = async () => {
      await evaluateAlerts([seated()], s, t, cfg);
      t += SETTLE_MS;
      await evaluateAlerts([seated()], s, t, cfg);
      t += 1000;
      await evaluateAlerts([], s, t, cfg); // table empties: alert edited to closed
      t += 1000;
    };
    await cycle();
    await cycle();
    await cycle();
    const posts = calls.filter((c) => c.method === 'POST');
    expect(posts).toHaveLength(1);
    // Still waiting at the throttle edge: the next post goes out right when the 10 minutes are up.
    await evaluateAlerts([seated()], s, t, cfg);
    t += SETTLE_MS;
    const r = await evaluateAlerts([seated()], s, t, cfg);
    expect(r.wakeAt).toBe(SETTLE_MS + THROTTLE_MS);
    await evaluateAlerts([seated()], s, SETTLE_MS + THROTTLE_MS, cfg);
    expect(calls.filter((c) => c.method === 'POST')).toHaveLength(2);
    // Trivia has its own throttle.
    const triv = entry('i-2', GUILD, { phase: 'seating', count: 0 }, { phase: 'idle', count: 0, waiting: 1 });
    const t2 = SETTLE_MS + THROTTLE_MS + 1;
    await evaluateAlerts([seated(), triv], s, t2, cfg);
    await evaluateAlerts([seated(), triv], s, t2 + SETTLE_MS, cfg);
    const p = calls.filter((c) => c.method === 'POST');
    expect(p).toHaveLength(3);
    expect(p[2]!.body.content).toBe(ALERT_COPY.trivia.open);
  });

  it('game start edits the alert to game on; an empty table edits it to closed', async () => {
    const { calls, f } = mockFetch();
    const s = emptyAlertState();
    const cfg = { guildId: GUILD, webhookUrl: HOOK, fetch: f };
    await evaluateAlerts([seated()], s, 0, cfg);
    await evaluateAlerts([seated()], s, SETTLE_MS, cfg);
    expect(calls[0]).toMatchObject({ url: `${HOOK}?wait=true`, method: 'POST' });
    const id = s.dad.messageId;
    expect(id).toBe('900000000000000001');
    await evaluateAlerts([entry('i-1', GUILD, { phase: 'submitting', count: 3 })], s, SETTLE_MS + 5000, cfg);
    expect(calls[1]).toMatchObject({ url: `${HOOK}/messages/${id}`, method: 'PATCH' });
    expect(calls[1]!.body.content).toBe(ALERT_COPY.dad.on);
    expect(s.dad.status).toBe('on');

    const s2 = emptyAlertState();
    const triv = entry('i-2', GUILD, { phase: 'seating', count: 0 }, { phase: 'over', count: 0, waiting: 2 });
    await evaluateAlerts([triv], s2, 0, cfg);
    await evaluateAlerts([triv], s2, SETTLE_MS, cfg);
    await evaluateAlerts([], s2, SETTLE_MS + 1, cfg);
    expect(calls.at(-1)!.method).toBe('PATCH');
    expect(calls.at(-1)!.body.content).toBe(ALERT_COPY.trivia.closed);
  });

  it('no mentions: allowed_mentions.parse is empty and the copy has no @ or money words', async () => {
    const { calls, f } = mockFetch();
    const s = emptyAlertState();
    const cfg = { guildId: GUILD, webhookUrl: HOOK, fetch: f };
    await evaluateAlerts([seated()], s, 0, cfg);
    await evaluateAlerts([seated()], s, SETTLE_MS, cfg);
    await evaluateAlerts([], s, SETTLE_MS + 1, cfg);
    expect(calls.length).toBeGreaterThan(1);
    for (const c of calls) {
      expect(c.body.allowed_mentions).toEqual({ parse: [] });
      expect(Object.keys(c.body).sort()).toEqual(['allowed_mentions', 'content']);
    }
    const all = Object.values(ALERT_COPY).flatMap((x) => Object.values(x));
    for (const text of all) {
      expect(text).not.toMatch(/@|<#|<@/);
      expect(text).not.toMatch(/jackpot|\bSOL\b|\btips?\b|wallet|casino|purchase|\bprizes?\b|\bbuy\b|\$\d|payout|reward|\bcash\b|\bwin money/i);
      expect(text.length).toBeLessThan(200);
    }
  });

  it('a Discord error still counts against the throttle (a bad hook cannot hammer it)', async () => {
    const calls: string[] = [];
    const f = async (url: string) => {
      calls.push(url);
      return new Response('{}', { status: 404 });
    };
    const s = emptyAlertState();
    const cfg = { guildId: GUILD, webhookUrl: HOOK, fetch: f };
    for (let t = 0; t < THROTTLE_MS; t += SETTLE_MS) await evaluateAlerts([seated()], s, t, cfg);
    expect(calls).toHaveLength(1);
  });

  it('the room reports someone waiting at Trivia only while they look at it and no game runs', () => {
    const room = new Room(createRoomState('i-x'), makeRng(1));
    room.join({ id: '1000001', name: 'A', avatar: null }, 0);
    expect(reportFor(room.state, GUILD).games.trivia.waiting).toBe(0);
    expect(room.handle('1000001', { t: 'look', at: 'trivia' }, 1).ok).toBe(true);
    expect(reportFor(room.state, GUILD).games.trivia.waiting).toBe(1);
    room.handle('1000001', { t: 'trivia.start' }, 2);
    expect(reportFor(room.state, GUILD).games.trivia.waiting).toBe(0);
    const r2 = new Room(createRoomState('i-y'), makeRng(1));
    r2.join({ id: '1000002', name: 'B', avatar: null }, 0);
    r2.handle('1000002', { t: 'look', at: 'trivia' }, 1);
    r2.markAway('1000002', 2);
    expect(reportFor(r2.state, GUILD).games.trivia.waiting).toBe(0);
  });
});

// ---------- inside the LiveRegistry DO (fake ctx, mocked fetch) ----------

function fakeCtx() {
  const data = new Map<string, unknown>();
  let alarm: number | null = null;
  const storage = {
    get: async (k: string) => structuredClone(data.get(k)),
    put: async (k: string, v: unknown) => void data.set(k, structuredClone(v)),
    getAlarm: async () => alarm,
    setAlarm: async (t: number) => {
      alarm = t;
    },
  };
  return { ctx: { storage } as unknown as DurableObjectState, alarmAt: () => alarm };
}

const report = (r: LiveReport) => new Request('https://live.internal/report', { method: 'POST', body: JSON.stringify(r) });

describe('LiveRegistry alerts', () => {
  const r: LiveReport = { instanceId: 'i-1', guildId: GUILD, members: 1, games: { dad: { phase: 'seating', count: 1, joinable: true }, trivia: { phase: 'idle', count: 0, joinable: false, waiting: 0 }, bluff: { phase: 'seating', count: 0, joinable: false } } };

  it('secret unset: reports never arm an alarm and never fetch', async () => {
    const { calls, f } = mockFetch();
    const { ctx, alarmAt } = fakeCtx();
    const reg = new LiveRegistry(ctx, { ALERT_GUILD_ID: GUILD }, f);
    expect((await reg.fetch(report(r))).status).toBe(204);
    expect(alarmAt()).toBeNull();
    await reg.alarm();
    expect(calls).toHaveLength(0);
  });

  it('secret set: a report from the alert guild arms the alarm; the alarm posts once settled', async () => {
    const { calls, f } = mockFetch();
    const { ctx, alarmAt } = fakeCtx();
    const reg = new LiveRegistry(ctx, { ALERT_GUILD_ID: GUILD, ALERT_WEBHOOK_URL: HOOK }, f);
    await reg.fetch(report({ ...r, guildId: OTHER }));
    expect(alarmAt()).toBeNull();
    await reg.fetch(report(r));
    expect(alarmAt()).not.toBeNull();
    await reg.alarm(); // starts the settle clock, sleeps ~20 s
    expect(calls).toHaveLength(0);
    expect(alarmAt()! - Date.now()).toBeGreaterThan(SETTLE_MS - 2000);
  });

});

describe('table alerts: Bluff', () => {
  const bluffEntry = (phase: string, count: number, g: string | null = GUILD): LiveEntry => ({ ...entry('i-b', g, { phase: 'seating', count: 0 }), games: { ...entry('i-b', g, { phase: 'seating', count: 0 }).games, bluff: { phase, count, joinable: true } } });

  it('someone seated at Bluff with no game posts once settled, throttled on its own; game start edits to game on', async () => {
    const { calls, f } = mockFetch();
    const cfg: AlertConfig = { webhookUrl: HOOK, guildId: GUILD, fetch: f };
    const st = emptyAlertState();
    await evaluateAlerts([bluffEntry('seating', 1)], st, 0, cfg);
    expect(calls).toHaveLength(0);
    await evaluateAlerts([bluffEntry('seating', 1)], st, SETTLE_MS, cfg);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.body.content).toBe(ALERT_COPY.bluff.open);
    expect(calls[0]!.body.allowed_mentions.parse).toEqual([]);
    expect(st.dad.status).toBe('none');
    await evaluateAlerts([bluffEntry('writing', 3)], st, SETTLE_MS + 1, cfg);
    expect(calls).toHaveLength(2);
    expect(calls[1]).toMatchObject({ method: 'PATCH', body: { content: ALERT_COPY.bluff.on } });
    // Back to waiting inside the throttle: no new post.
    await evaluateAlerts([bluffEntry('over', 3)], st, SETTLE_MS + 2, cfg);
    await evaluateAlerts([bluffEntry('over', 3)], st, 2 * SETTLE_MS + 3, cfg);
    expect(calls).toHaveLength(2);
    await evaluateAlerts([bluffEntry('over', 3)], st, SETTLE_MS + THROTTLE_MS, cfg);
    expect(calls).toHaveLength(3);
    expect(ALERT_COPY.bluff.open).not.toMatch(/@|\$|\btips?\b|prize|wallet|casino/i);
  });

  it('other guilds and stored pre-Bluff alert state are handled', async () => {
    const { calls, f } = mockFetch();
    const cfg: AlertConfig = { webhookUrl: HOOK, guildId: GUILD, fetch: f };
    const legacy = upgradeAlertState({ dad: emptyAlertState().dad, trivia: emptyAlertState().trivia });
    expect(legacy.bluff).toEqual({ since: null, lastPostAt: null, messageId: null, status: 'none' });
    await evaluateAlerts([bluffEntry('seating', 2, OTHER)], legacy, 0, cfg);
    await evaluateAlerts([bluffEntry('seating', 2, OTHER)], legacy, SETTLE_MS, cfg);
    expect(calls).toHaveLength(0);
  });
});
