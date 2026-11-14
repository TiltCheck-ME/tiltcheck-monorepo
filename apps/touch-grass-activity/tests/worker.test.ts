// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-14
// Runs the real worker + Durable Object locally in workerd (wrangler unstable_dev / Miniflare).
// Local only: nothing is deployed. Skips itself if workerd can't start in this environment.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { unstable_dev, type Unstable_DevWorker } from 'wrangler';
import { roomKeyFor, type RoomView, type ServerMessage } from '../src/shared/protocol.js';
import { fileURLToPath } from 'node:url';

const here = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));

let worker: Unstable_DevWorker | null = null;
let startError: unknown = null;

beforeAll(async () => {
  try {
    worker = await unstable_dev(here('../worker/src/index.ts'), {
      config: here('../worker/wrangler.toml'),
      vars: { ALLOW_GUEST: 'true', DAILY_SALT: 'workerd-test-salt' },
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

function open(name: string, room: string, guild?: string, query?: string): Promise<{ ws: WebSocket; msgs: ServerMessage[]; last: () => RoomView }> {
  return new Promise((resolve, reject) => {
    const q = query !== undefined ? `?${query}` : guild ? `?guild=${guild}` : '';
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

  it('channel rooms: two Discord instances in one server channel share one table; other channel, DM and wrong guild do not', async () => {
    if (!worker) return;
    const stamp = String(Date.now()).slice(-9);
    const G = `7${stamp}12345`;
    const OTHER_G = `8${stamp}12345`;
    const CH = `5${stamp}11111`;
    const CH2 = `5${stamp}22222`;
    const instA = `i-1${stamp}1-gc-${G}-${CH}`;
    const instB = `i-2${stamp}2-gc-${G}-${CH}`;
    const key = roomKeyFor(instA, CH);
    expect(key).toBe(`g-${G}-c-${CH}`);
    expect(roomKeyFor(instB, CH)).toBe(key);

    // Two separate launches (different instance ids), same guild + channel: one room.
    const a = await open('ana', key, undefined, `instance=${instA}&guild=${G}`);
    const b = await open('bo', key, undefined, `instance=${instB}`);
    await until(() => a.msgs.some((m) => m.t === 'state' && m.view.members.length === 2));
    a.ws.send('{"t":"dad.sit"}');
    b.ws.send('{"t":"dad.sit"}');
    await until(() => a.last().dad.seats.length === 2 && b.last().dad.seats.length === 2);
    expect(a.last().instanceId).toBe(key);

    // Live registry: one table with both seated, under the guild from the instance id.
    type Live = { games: { dad: { tables: number; seated: number } } };
    let live: Live | null = null;
    for (let i = 0; i < 40; i++) {
      live = (await (await worker.fetch(`/api/live?guild=${G}`)).json()) as Live;
      if (live.games.dad.seated === 2) break;
      await wait(50);
    }
    expect(live?.games.dad).toMatchObject({ tables: 1, seated: 2 });

    // Polling with the channel key and a third instance id lands in the same room too.
    const instC = `i-3${stamp}3-gc-${G}-${CH}`;
    const poll = await worker.fetch(`/api/room/${key}/state?instance=${instC}`, { headers: { Authorization: 'Bearer guest:cy' } });
    expect(poll.status).toBe(200);
    const pv = (await poll.json()) as ServerMessage;
    expect(pv.t === 'state' && pv.view.members.length).toBe(3);

    // A different channel in the same guild is a different room.
    const key2 = roomKeyFor(`i-4${stamp}4-gc-${G}-${CH2}`, CH2);
    expect(key2).not.toBe(key);
    const d = await open('dee', key2, undefined, `instance=i-4${stamp}4-gc-${G}-${CH2}`);
    await until(() => d.msgs.some((m) => m.t === 'state'));
    expect(d.last().members).toHaveLength(1);

    // A key naming another guild than the presented instance id: refused, before any room is touched.
    const otherGuildKey = `g-${OTHER_G}-c-${CH}`;
    const bad = await worker.fetch(`/api/room/${otherGuildKey}/state?instance=${instA}&guild=${OTHER_G}`, { headers: { Authorization: 'Bearer guest:eve' } });
    expect(bad.status).toBe(403);
    expect(await bad.json()).toEqual({ error: 'room-guild-mismatch' });
    // The ws route checks the key before anything else (403, not 426 for the missing upgrade).
    expect((await worker.fetch(`/api/room/${otherGuildKey}/ws?instance=${instA}`)).status).toBe(403);
    const refused = await new Promise<boolean>((resolve) => {
      const ws = new WebSocket(`ws://${worker!.address}:${worker!.port}/api/room/${otherGuildKey}/ws?instance=${instA}`);
      ws.onopen = () => {
        ws.close();
        resolve(false);
      };
      ws.onerror = () => resolve(true);
    });
    expect(refused).toBe(true);
    // No instance at all, a DM instance, or a junk g- key: refused too.
    expect((await worker.fetch(`/api/room/${key}/state`, { headers: { Authorization: 'Bearer guest:eve' } })).status).toBe(400);
    expect((await worker.fetch(`/api/room/${key}/state?instance=i-9-pc-${CH}`, { headers: { Authorization: 'Bearer guest:eve' } })).status).toBe(403);
    expect((await worker.fetch(`/api/room/g-${G}-c-nope/state?instance=${instA}`, { headers: { Authorization: 'Bearer guest:eve' } })).status).toBe(400);

    // DM / group DM: the instance id stays the room, as before.
    const dm = `i-5${stamp}5-pc-${CH}`;
    expect(roomKeyFor(dm, CH)).toBe(dm);
    const e = await open('eve', dm);
    await until(() => e.msgs.some((m) => m.t === 'state'));
    expect(e.last().instanceId).toBe(dm);
    expect(e.last().members).toHaveLength(1);

    for (const p of [a, b, d, e]) p.ws.close();
  }, 30_000);

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
    // The judge's view carries no hand; the two players hold 7 each.
    [a, b, c].forEach((p, i) => expect(hands[i]).toHaveLength(p.last().dad.me.isJudge ? 0 : 7));
    expect(new Set(hands.flat()).size).toBe(14);
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
      const errsBefore = a.msgs.filter((m) => m.t === 'error' && m.code === 'already-answered').length;
      a.ws.send(JSON.stringify({ t: 'trivia.answer', qid, choice: 0 }));
      a.ws.send(JSON.stringify({ t: 'trivia.answer', qid, choice: 1 }));
      // Wait for Ana's duplicate to be refused before the others answer: messages on different
      // sockets are not ordered, and the last answer in closes the window early.
      await until(() => a.msgs.filter((m) => m.t === 'error' && m.code === 'already-answered').length > errsBefore, 3_000).catch(() => {
        throw new Error(`errors seen: ${JSON.stringify(a.msgs.filter((m) => m.t === 'error'))}`);
      });
      b.ws.send(JSON.stringify({ t: 'trivia.answer', qid, choice: 1 }));
      c.ws.send(JSON.stringify({ t: 'trivia.answer', qid, choice: 2 }));
      await until(() => a.last().trivia.phase === 'reveal' || a.last().trivia.phase === 'over', 20_000);
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

  it('3-player Bluff over WebSockets: everyone tells once, lie hidden until the reveal, scores, /api/live bluff', async () => {
    if (!worker) return;
    const room = `i-bluff-${Date.now()}`;
    const guild = `77${Date.now()}`;
    const ps = await Promise.all([open('ana', room, guild), open('bo', room, guild), open('cy', room, guild)]);
    const [a] = ps as [Awaited<ReturnType<typeof open>>, ...Awaited<ReturnType<typeof open>>[]];
    await until(() => a.msgs.some((m) => m.t === 'state' && m.view.members.length === 3));
    for (const p of ps) p.ws.send('{"t":"bluff.sit"}');
    await until(() => a.last().bluff.seats.length === 3);
    const seatedLive = (await (await worker.fetch(`/api/live?guild=${guild}`)).json()) as { games: { bluff: { tables: number; seated: number; joinable: number } }; tables: number };
    expect(seatedLive.games.bluff).toEqual({ tables: 1, seated: 3, joinable: 1 });
    ps[1]!.ws.send('{"t":"bluff.start"}');
    await until(() => ps.every((p) => p.last().bluff.phase === 'writing'));
    const live = (await (await worker.fetch(`/api/live?guild=${guild}`)).json()) as { games: { bluff: { tables: number; seated: number; joinable: number } } };
    expect(live.games.bluff).toEqual({ tables: 1, seated: 3, joinable: 0 });
    expect(JSON.stringify(live)).not.toMatch(/guest-|Guest |i-bluff/);

    const statements = ['I have a twin.', 'I once ate a cricket.', 'I have never seen snow.'];
    const tellers: string[] = [];
    for (let round = 1; round <= 3; round += 1) {
      await until(() => a.last().bluff.phase === 'writing' && a.last().bluff.round === round, 10_000);
      const tellerId = a.last().bluff.tellerId!;
      tellers.push(tellerId);
      const teller = ps.find((p) => p.last().you === tellerId)!;
      const guessers = ps.filter((p) => p !== teller);
      if (round === 1) {
        teller.ws.send(JSON.stringify({ t: 'bluff.tell', statements: ['y'.repeat(121), 'b', 'c'], lie: 0 }));
        await until(() => teller.msgs.some((m) => m.t === 'error' && m.code === 'too-long'));
        guessers[0]!.ws.send(JSON.stringify({ t: 'bluff.tell', statements, lie: 0 }));
        await until(() => guessers[0]!.msgs.some((m) => m.t === 'error' && m.code === 'not-teller'));
      }
      teller.ws.send(JSON.stringify({ t: 'bluff.tell', statements, lie: 1 }));
      await until(() => ps.every((p) => p.last().bluff.phase === 'guessing'));
      // Nothing a guesser has received for this round carries the lie; the teller's own view does.
      for (const g of guessers) {
        const st = g.last().bluff;
        expect(st.me.mine).toBeNull();
        expect(JSON.stringify(st)).not.toContain('"lie"');
      }
      const mine = teller.last().bluff.me.mine!;
      expect(mine.statements[mine.lie]).toBe(statements[1]);
      const lie = mine.lie;
      const rid = guessers[0]!.last().bluff.rid!;
      teller.ws.send(JSON.stringify({ t: 'bluff.guess', rid, pick: lie }));
      await until(() => teller.msgs.some((m) => m.t === 'error' && m.code === 'teller-cannot-guess'));
      // First guesser is right (twice: second is refused), second guesser is fooled.
      guessers[0]!.ws.send(JSON.stringify({ t: 'bluff.guess', rid, pick: lie }));
      guessers[0]!.ws.send(JSON.stringify({ t: 'bluff.guess', rid, pick: (lie + 1) % 3 }));
      await until(() => guessers[0]!.msgs.some((m) => m.t === 'error' && m.code === 'already-guessed'));
      guessers[1]!.ws.send(JSON.stringify({ t: 'bluff.guess', rid, pick: (lie + 1) % 3 }));
      await until(() => a.last().bluff.phase === 'reveal' || a.last().bluff.phase === 'over', 10_000);
      const r = a.last().bluff.lastRound!;
      expect(r.lie).toBe(lie);
      expect(r.tellerPoints).toBe(5);
      expect(r.picks.find((x) => x.id === guessers[0]!.last().you)).toMatchObject({ pick: lie, correct: true, points: 10 });
      expect(r.picks.find((x) => x.id === guessers[1]!.last().you)).toMatchObject({ correct: false, points: 0 });
      if (a.last().bluff.phase === 'reveal') guessers[0]!.ws.send('{"t":"bluff.next"}');
    }
    await until(() => a.last().bluff.phase === 'over', 10_000);
    expect(new Set(tellers).size).toBe(3);
    const end = a.last().bluff;
    expect(end.scores).toHaveLength(3);
    expect(end.scores.reduce((n, x) => n + x.score, 0)).toBe(3 * 15);
    expect(end.winnerIds.length).toBeGreaterThan(0);
    // No high-score board for Bluff.
    expect((await worker.fetch(`/api/bluff/scores?guild=${guild}`)).status).toBe(404);
    for (const p of ps) p.ws.close();
  }, 120_000);

  it('solo games over WebSockets: Daily Grass colors from the server, no answer on the wire, Myth or Math run, /api/live keys', async () => {
    if (!worker) return;
    const guild = `7777${Date.now()}`; // fresh server each run: local registry state persists between runs
    const room = `i-${Date.now()}-gc-${guild}-888888888888888881`;
    // Fresh players every run: Daily Grass boards persist per player in local workerd state.
    const tag = Date.now().toString(36);
    const a = await open(`ana${tag}`, room);
    const b = await open(`bo${tag}`, room);
    await until(() => a.msgs.some((m) => m.t === 'state' && m.view.members.length === 2));
    a.ws.send('{"t":"look","at":"daily"}');
    a.ws.send('{"t":"daily.open"}');
    await until(() => a.last().daily.me !== null);
    expect(a.last().daily.me).toMatchObject({ status: 'playing', rows: [], answer: null });
    a.ws.send('{"t":"daily.guess","word":"crane"}');
    await until(() => (a.last().daily.me?.rows.length ?? 0) === 1);
    const row = a.last().daily.me!.rows[0]!;
    expect(row.word).toBe('crane');
    expect(row.colors).toHaveLength(5);
    a.ws.send('{"t":"daily.guess","word":"qzxjv"}');
    await until(() => a.msgs.some((m) => m.t === 'error' && m.code === 'not-a-word'));
    // The hint route reaches the per-player SCORES instance: locked after one guess.
    a.ws.send('{"t":"daily.hint"}');
    await until(() => a.msgs.some((m) => m.t === 'error' && m.code === 'hint-locked'));
    expect(a.last().daily.me?.hint ?? null).toBeNull();
    // Bo sees Ana's progress but never her letters.
    await until(() => b.last().daily.friends.length === 1);
    expect(b.last().daily.friends[0]).toMatchObject({ rows: 1, status: 'playing' });
    expect(JSON.stringify(b.msgs)).not.toContain('crane');
    // No answer anywhere on Ana's wire while she is still playing.
    for (const m of a.msgs) if (m.t === 'state') expect(m.view.daily.me?.answer ?? null).toBeNull();
    // Myth or Math: a run of her own.
    b.ws.send('{"t":"myth.start"}');
    await until(() => b.last().myth.run?.phase === 'card');
    const run = b.last().myth.run!;
    expect(JSON.stringify(run)).not.toContain('"truth"');
    b.ws.send(JSON.stringify({ t: 'myth.answer', rid: run.runId, cid: run.card!.id, pick: true }));
    await until(() => b.last().myth.run?.phase === 'reveal');
    expect(typeof b.last().myth.run!.reveal!.truth).toBe('boolean');
    // /api/live: daily (Ana on the screen) and myth (Bo mid-run) playing counts.
    type SoloLive = { games: { daily: { playing: number }; myth: { playing: number } } };
    let live: SoloLive = { games: { daily: { playing: -1 }, myth: { playing: -1 } } };
    for (let i = 0; i < 30; i += 1) {
      const res = await worker.fetch(`/api/live?guild=${guild}`);
      // The public live read is rate limited per IP and earlier tests used the burst: wait it out.
      if (res.ok) {
        live = (await res.json()) as SoloLive;
        if (live.games.daily.playing === 1 && live.games.myth.playing === 1) break;
      }
      await wait(500);
    }
    expect(live.games.daily).toEqual({ playing: 1 });
    expect(live.games.myth).toEqual({ playing: 1 });
    a.ws.close();
    b.ws.close();
  }, 60_000);

  it("chess over WebSockets: two claim sides, a third watches, fool's mate, state survives a reconnect", async () => {
    if (!worker) return;
    const room = `i-chess-${Date.now()}`;
    const guild = `78${Date.now()}`;
    const ps = await Promise.all([open('wes', room, guild), open('bea', room, guild), open('sam', room, guild)]);
    const [w, b, s] = ps as [Awaited<ReturnType<typeof open>>, Awaited<ReturnType<typeof open>>, Awaited<ReturnType<typeof open>>];
    await until(() => w.msgs.some((m) => m.t === 'state' && m.view.members.length === 3));
    w.ws.send('{"t":"chess.claim","color":"w"}');
    b.ws.send('{"t":"chess.claim","color":"b"}');
    await until(() => Boolean(s.last().chess.white && s.last().chess.black));
    b.ws.send('{"t":"chess.start"}');
    await until(() => ps.every((p) => p.last().chess.phase === 'playing'));
    // Only White is told its legal moves; the spectator gets none and its move is refused.
    expect(Object.keys(w.last().chess.me.legal)).toHaveLength(10);
    expect(b.last().chess.me.legal).toEqual({});
    s.ws.send('{"t":"chess.move","ply":0,"from":12,"to":28}');
    await until(() => s.msgs.some((m) => m.t === 'error' && m.code === 'not-seated'));
    const moves: Array<[typeof w, number, number]> = [[w, 13, 21], [b, 52, 36], [w, 14, 30], [b, 59, 31]];
    for (const [i, [p, from, to]] of moves.entries()) {
      p.ws.send(JSON.stringify({ t: 'chess.move', ply: i, from, to }));
      await until(() => s.last().chess.ply === i + 1);
    }
    await until(() => s.last().chess.phase === 'over');
    expect(s.last().chess.result).toEqual({ winner: 'b', reason: 'checkmate' });
    expect(s.last().chess.moves).toEqual(['f3', 'e5', 'g4', 'Qh4#']);
    // Reconnect: the finished board comes back from the Durable Object.
    s.ws.close();
    const again = await open('sam', room, guild);
    await until(() => again.msgs.some((m) => m.t === 'state'));
    expect(again.last().chess.moves).toHaveLength(4);
    for (const p of [w, b, again]) p.ws.close();
  }, 60_000);
});
