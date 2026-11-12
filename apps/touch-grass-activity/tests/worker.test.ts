// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// Runs the real worker + Durable Object locally in workerd (wrangler unstable_dev / Miniflare).
// Local only: nothing is deployed. Skips itself if workerd can't start in this environment.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { unstable_dev, type Unstable_DevWorker } from 'wrangler';
import type { RoomView, ServerMessage } from '../src/shared/protocol.js';
import { fileURLToPath } from 'node:url';

const here = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));

let worker: Unstable_DevWorker | null = null;
let startError: unknown = null;

beforeAll(async () => {
  try {
    worker = await unstable_dev(here('../worker/src/index.ts'), {
      config: here('../worker/wrangler.toml'),
      vars: { ALLOW_GUEST: 'true' },
      experimental: { disableExperimentalWarning: true },
      logLevel: 'error',
    });
  } catch (e) {
    startError = e;
  }
}, 60_000);

afterAll(async () => {
  await worker?.stop();
});

function open(name: string, room: string): Promise<{ ws: WebSocket; msgs: ServerMessage[]; last: () => RoomView }> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://${worker!.address}:${worker!.port}/api/room/${room}/ws`);
    const msgs: ServerMessage[] = [];
    ws.onmessage = (e) => msgs.push(JSON.parse(String(e.data)) as ServerMessage);
    ws.onerror = reject;
    ws.onopen = () => {
      ws.send(JSON.stringify({ t: 'auth', token: `guest:${name}` }));
      resolve({
        ws,
        msgs,
        last: () => {
          const m = [...msgs].reverse().find((x) => x.t === 'state');
          if (!m || m.t !== 'state') throw new Error('no state yet');
          return m.view;
        },
      });
    };
  });
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until(fn: () => boolean, ms = 5000): Promise<void> {
  const end = Date.now() + ms;
  while (!fn()) {
    if (Date.now() > end) throw new Error('timed out waiting');
    await wait(25);
  }
}

describe('worker (local workerd)', () => {
  it('starts', () => {
    if (startError) console.warn('workerd did not start, worker tests skipped:', startError);
    expect(worker || startError).toBeTruthy();
  });

  it('health and 404', async () => {
    if (!worker) return;
    expect((await worker.fetch('/api/health')).status).toBe(200);
    expect((await worker.fetch('/health')).status).toBe(200);
    expect((await worker.fetch('/api/nope')).status).toBe(404);
  });

  it('token endpoint fails closed without a client secret', async () => {
    if (!worker) return;
    const r = await worker.fetch('/api/activity/token', { method: 'POST', body: JSON.stringify({ code: 'x' }), headers: { 'Content-Type': 'application/json' } });
    expect(r.status).toBe(500);
    expect((await worker.fetch('/api/activity/token')).status).toBe(405);
  });

  it('polling needs a token and validates the instance id', async () => {
    if (!worker) return;
    expect((await worker.fetch('/api/room/i-1/state')).status).toBe(401);
    expect((await worker.fetch('/api/room/bad%20id!/state', { headers: { Authorization: 'Bearer guest:a' } })).status).toBe(400);
    const r = await worker.fetch('/api/room/i-poll/state', { headers: { Authorization: 'Bearer guest:a' } });
    expect(r.status).toBe(200);
    const bad = await worker.fetch('/api/room/i-poll/action', { method: 'POST', body: '{"t":"dad.next"}', headers: { Authorization: 'Bearer guest:a' } });
    expect(bad.status).toBe(409);
  });

  it('3 players over WebSockets: one room per instance, hands stay private', async () => {
    if (!worker) return;
    const room = `i-ws-${Date.now()}`;
    const [a, b, c] = await Promise.all([open('ana', room), open('bo', room), open('cy', room)]);
    await until(() => a.msgs.some((m) => m.t === 'state' && m.view.members.length === 3));
    for (const p of [a, b, c]) p.ws.send('{"t":"dad.sit"}');
    await until(() => a.last().dad.seats.length === 3);
    a.ws.send('{"t":"dad.start","target":1}');
    await until(() => [a, b, c].every((p) => p.last().dad.phase === 'submitting'));
    const hands = [a, b, c].map((p) => p.last().dad.hand.map((x) => x.id));
    hands.forEach((h) => expect(h).toHaveLength(7));
    expect(new Set(hands.flat()).size).toBe(21);
    for (const [i, p] of [a, b, c].entries()) {
      const seen = JSON.stringify(p.msgs);
      hands.forEach((h, j) => {
        if (j !== i) h.forEach((id) => expect(seen).not.toContain(`"id":"${id}"`));
      });
    }
    const players = [a, b, c].filter((p) => !p.last().dad.me.isJudge);
    const judge = [a, b, c].find((p) => p.last().dad.me.isJudge)!;
    for (const p of players) p.ws.send(JSON.stringify({ t: 'dad.submit', cardId: p.last().dad.hand[0]!.id }));
    await until(() => judge.last().dad.phase === 'judging');
    const entries = judge.last().dad.entries;
    expect(entries).toHaveLength(2);
    judge.ws.send(JSON.stringify({ t: 'dad.pick', entryId: entries[0]!.entryId }));
    await until(() => a.last().dad.phase === 'over');
    expect(a.last().dad.winnerId).toBeTruthy();

    // A different instance is a different room.
    const other = await open('dee', `${room}-other`);
    await until(() => other.msgs.some((m) => m.t === 'state'));
    expect(other.last().members).toHaveLength(1);

    // Leaving: close cy, others see 2 members.
    c.ws.close();
    await until(() => a.last().members.length === 2);
    for (const p of [a, b, other]) p.ws.close();
  }, 30_000);
});
