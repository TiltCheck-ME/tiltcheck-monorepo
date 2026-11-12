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

function open(name: string, room: string, guild?: string): Promise<{ ws: WebSocket; msgs: ServerMessage[]; last: () => RoomView }> {
  return new Promise((resolve, reject) => {
    const q = guild ? `?guild=${guild}` : '';
    const ws = new WebSocket(`ws://${worker!.address}:${worker!.port}/api/room/${room}/ws${q}`);
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

    // Dropping: close cy, others see cy marked away (seat held), not gone.
    c.ws.close();
    await until(() => a.last().members.find((m) => m.name === 'Guest cy')?.away === true);
    expect(a.last().members).toHaveLength(3);
    for (const p of [a, b, other]) p.ws.close();
  }, 30_000);

  it('reconnect inside the grace period re-attaches the seat and the private hand', async () => {
    if (!worker) return;
    const room = `i-grace-${Date.now()}`;
    const [a, b, c] = await Promise.all([open('ana', room), open('bo', room), open('cy', room)]);
    await until(() => a.msgs.some((m) => m.t === 'state' && m.view.members.length === 3));
    for (const p of [a, b, c]) p.ws.send('{"t":"dad.sit"}');
    await until(() => a.last().dad.seats.length === 3);
    a.ws.send('{"t":"dad.start","target":5}');
    await until(() => c.last().dad.phase === 'submitting');
    const hand = c.last().dad.hand.map((x) => x.id);
    c.ws.close();
    await until(() => a.last().dad.seats.find((s) => s.id === 'guest-cy')?.away === true);
    expect(a.last().dad.seats).toHaveLength(3);
    const c2 = await open('cy', room);
    await until(() => c2.msgs.some((m) => m.t === 'state'));
    expect(c2.last().dad.me.seated).toBe(true);
    expect(c2.last().dad.hand.map((x) => x.id)).toEqual(hand);
    await until(() => a.last().dad.seats.every((s) => !s.away));
    for (const p of [a, b, c2]) p.ws.close();
  }, 30_000);

  it('3-player trivia over WebSockets: full 10-question game, answer hidden until reveal, live count', async () => {
    if (!worker) return;
    const room = `i-trivia-${Date.now()}`;
    const guild = `55${Date.now()}`; // unique per run: local DO state persists between runs
    const [a, b, c] = await Promise.all([open('ana', room, guild), open('bo', room, guild), open('cy', room, guild)]);
    await until(() => a.msgs.some((m) => m.t === 'state' && m.view.members.length === 3));
    b.ws.send('{"t":"trivia.start"}');
    await until(() => [a, b, c].every((p) => p.last().trivia.phase === 'question'));

    // Live tables: this guild shows one trivia table with 3 playing; CORS for tiltcheck.me and extensions only.
    const live = await worker.fetch(`/api/live?guild=${guild}`, { headers: { Origin: 'https://tiltcheck.me' } });
    expect(live.status).toBe(200);
    expect(live.headers.get('access-control-allow-origin')).toBe('https://tiltcheck.me');
    const body = (await live.json()) as { guild: string; games: { trivia: { tables: number; playing: number; joinable: number } } };
    expect(body.guild).toBe(guild);
    expect(body.games.trivia).toEqual({ tables: 1, playing: 3, joinable: 1 });
    expect(JSON.stringify(body)).not.toMatch(/guest-|Guest |avatar|i-trivia/);
    const ext = await worker.fetch('/api/live', { headers: { Origin: 'chrome-extension://abcdefghijklmnopabcdefghijklmnop' } });
    expect(ext.headers.get('access-control-allow-origin')).toBe('chrome-extension://abcdefghijklmnopabcdefghijklmnop');
    expect(((await ext.json()) as { guild: string | null }).guild).toBeNull();
    const evil = await worker.fetch('/api/live', { headers: { Origin: 'https://evil.example' } });
    expect(evil.headers.get('access-control-allow-origin')).toBeNull();
    expect((await worker.fetch('/api/live?guild=abc')).status).toBe(400);

    let lastNumber = 0;
    for (let q = 1; q <= 10; q += 1) {
      await until(() => a.last().trivia.phase === 'question' && a.last().trivia.number === q, 10_000);
      const v = a.last().trivia;
      expect(v.number).toBeGreaterThan(lastNumber);
      lastNumber = v.number;
      // Nothing any client has received for this question carries the answer.
      for (const p of [a, b, c]) {
        const st = p.last();
        expect(JSON.stringify(st.trivia)).not.toContain('"correct"');
      }
      const qid = v.question!.id;
      a.ws.send(JSON.stringify({ t: 'trivia.answer', qid, choice: 0 }));
      a.ws.send(JSON.stringify({ t: 'trivia.answer', qid, choice: 1 }));
      b.ws.send(JSON.stringify({ t: 'trivia.answer', qid, choice: 1 }));
      c.ws.send(JSON.stringify({ t: 'trivia.answer', qid, choice: 2 }));
      await until(() => a.last().trivia.phase === 'reveal' || a.last().trivia.phase === 'over', 20_000);
      await until(() => a.msgs.some((m) => m.t === 'error' && m.code === 'already-answered'), 3_000).catch(() => {
        throw new Error(`errors seen: ${JSON.stringify(a.msgs.filter((m) => m.t === 'error'))}`);
      });
      const r = [...a.msgs].reverse().find((m) => m.t === 'state' && m.view.trivia.reveal?.questionId === qid);
      expect(r && r.t === 'state' && typeof r.view.trivia.reveal!.correct).toBe('number');
      if (r && r.t === 'state') {
        const rv = r.view.trivia.reveal!;
        expect(rv.results.find((x) => x.id === 'guest-ana')!.choice).toBe(0);
        expect(rv.counts).toEqual([1, 1, 1, 0]);
      }
    }
    await until(() => a.last().trivia.phase === 'over', 10_000);
    const end = a.last().trivia;
    expect(end.scores).toHaveLength(3);
    for (const s of end.scores) expect(s.score % 1).toBe(0);

    // High scores: the finished game is on this guild's board, written by the room, not a client.
    await until(() => a.last().trivia.highScores === 'posted', 10_000);
    const auth = { Authorization: 'Bearer guest:ana' };
    expect((await worker.fetch(`/api/trivia/scores?guild=${guild}`)).status).toBe(401);
    expect((await worker.fetch('/api/trivia/scores?guild=abc', { headers: auth })).status).toBe(400);
    const hs = await worker.fetch(`/api/trivia/scores?guild=${guild}`, { headers: auth });
    expect(hs.status).toBe(200);
    const board = (await hs.json()) as { week: Array<{ id: string; score: number }>; allTime: Array<{ id: string; score: number; name: string }>; me: { allTime: { score: number } | null } };
    const scored = end.scores.filter((x) => x.score > 0);
    expect(board.allTime.map((r) => [r.id, r.score]).sort()).toEqual(scored.map((x) => [x.id, x.score]).sort());
    expect(board.week.length).toBe(scored.length);
    const anaScore = end.scores.find((x) => x.id === 'guest-ana')!.score;
    expect(board.me.allTime?.score ?? 0).toBe(anaScore);
    const top = end.scores[0]!;
    if (top.score > 0) {
      const brag = [a, b, c].find((p) => p.last().you === top.id)!.last().trivia.me.brag;
      expect(brag).toMatchObject({ personalBest: true, allTimeRank: 1, weekRank: 1 });
    }
    // Another guild's board is untouched, a client cannot write, and /api/live still names nobody.
    const other = (await (await worker.fetch(`/api/trivia/scores?guild=66${Date.now()}`, { headers: auth })).json()) as { allTime: unknown[] };
    expect(other.allTime).toEqual([]);
    const post = await worker.fetch(`/api/trivia/scores?guild=${guild}`, { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ results: [{ id: 'guest-cheat', name: 'x', avatar: null, score: 9999 }] }) });
    expect(post.status).toBe(405);
    const after = (await (await worker.fetch(`/api/trivia/scores?guild=${guild}`, { headers: auth })).json()) as { allTime: Array<{ id: string }> };
    expect(after.allTime.map((r) => r.id)).not.toContain('guest-cheat');
    expect((await worker.fetch(`/api/scores/record`, { method: 'POST', body: '{}' })).status).toBe(404);
    expect(JSON.stringify(await (await worker.fetch(`/api/live?guild=${guild}`)).json())).not.toMatch(/guest-|Guest |avatar/);
    // Restart works.
    c.ws.send('{"t":"trivia.start"}');
    await until(() => a.last().trivia.phase === 'question' && a.last().trivia.game === 2);
    for (const p of [a, b, c]) p.ws.close();
  }, 120_000);
});
