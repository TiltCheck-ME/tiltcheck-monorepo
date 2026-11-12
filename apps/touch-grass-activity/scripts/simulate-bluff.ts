// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// Local 3-player Bluff game (two truths and a lie) against the real room logic (RoomHost + Room +
// bluff.ts), driven by a fake clock and the alarm path. One guesser drops mid-game (misses a round)
// and comes back inside the away grace. Every move goes through the same message path a WebSocket
// client uses. Run: pnpm --filter @tiltcheck/touch-grass-activity simulate:bluff  [-- --n 7]

import { RoomHost, type HostSocket } from '../worker/src/host.js';
import { makeRng } from '../src/shared/rng.js';
import { GUESS_MS, REVEAL_MS } from '../src/shared/bluff.js';
import type { RoomUser, RoomView, ServerMessage } from '../src/shared/protocol.js';
import type { LiveReport } from '../src/shared/live.js';

const args = process.argv.slice(2);
const i = args.indexOf('--n');
const N = i >= 0 ? Number(args[i + 1]) : 7;

const users: Record<string, RoomUser> = {
  'tok-1': { id: '400000001', name: 'Ana', avatar: null },
  'tok-2': { id: '400000002', name: 'Bo', avatar: null },
  'tok-3': { id: '400000003', name: 'Cy', avatar: null },
};

const LINES: Record<string, [string, string, string]> = {
  '400000001': ['I have a scar from a goose.', 'I can name every state capital.', 'I have never had a cavity.'],
  '400000002': ['I was a mall Santa once.', 'I hate cheese.', 'I have run a marathon.'],
  '400000003': ['I grew up on a boat.', 'I am allergic to cats.', 'I once won a pie contest.'],
};

class SimSocket implements HostSocket {
  user: RoomUser | null = null;
  view: RoomView | null = null;
  errors: string[] = [];
  leaked = false;
  send(raw: string): void {
    const m = JSON.parse(raw) as ServerMessage;
    if (m.t === 'state') {
      this.view = m.view;
      // A guesser's view while guessing must never carry the lie.
      if (m.view.bluff.phase === 'guessing' && !m.view.bluff.me.isTeller && raw.includes('"lie"')) this.leaked = true;
    }
    if (m.t === 'error') this.errors.push(m.code);
  }
  close(): void {}
  setUser(u: RoomUser): void {
    this.user = u;
  }
}

let sockets: SimSocket[] = [];
const storage = new Map<string, unknown>();
const reports: LiveReport[] = [];
let clock = Date.now();
const host = new RoomHost({
  storage: { get: async (k) => storage.get(k) as never, put: async (k, v) => void storage.set(k, structuredClone(v)) },
  sockets: () => sockets,
  verify: async (t) => users[t] ?? null,
  now: () => clock,
  rng: makeRng(N),
  report: async (r) => void reports.push(r),
});
const rng = makeRng(N + 1);
const say = (s: SimSocket, msg: object) => host.onMessage('i-sim', s, JSON.stringify(msg));
const name = (id: string) => Object.values(users).find((u) => u.id === id)?.name ?? '?';
const connect = async (token: string) => {
  const s = new SimSocket();
  sockets.push(s);
  await say(s, { t: 'auth', token });
  return s;
};

async function main(): Promise<void> {
  const ana = await connect('tok-1');
  const bo = await connect('tok-2');
  let cy = await connect('tok-3');
  await host.setGuild('i-sim', '123456789012345678');
  for (const s of [ana, bo, cy]) await say(s, { t: 'bluff.sit' });
  await say(bo, { t: 'bluff.start' });
  let dropped = false;

  for (let round = 1; round <= 3; round += 1) {
    const v = ana.view!.bluff;
    if (v.phase !== 'writing' || v.round !== round) throw new Error(`expected writing round ${round}, got ${v.phase} ${v.round}`);
    const tellerId = v.tellerId!;
    console.log(`\nTeller ${round}/3: ${name(tellerId)}. Prompt: ${v.prompt}`);
    const teller = sockets.find((s) => s.user!.id === tellerId)!;
    clock += 20_000 + Math.floor(rng() * 40_000);
    const lieAt = Math.floor(rng() * 3);
    await say(teller, { t: 'bluff.tell', statements: LINES[tellerId], lie: lieAt });

    // Cy (when guessing) switches apps during one round and comes back on the next (inside the grace).
    const guessers = sockets.filter((s) => s !== teller);
    if (!dropped && tellerId !== users['tok-3']!.id) {
      sockets = sockets.filter((s) => s !== cy);
      await host.onClose('i-sim', cy);
      dropped = true;
      console.log('  Cy dropped (app switch). Marked away, seat held; misses this guess.');
    }
    for (const g of guessers) {
      if (!sockets.includes(g)) continue;
      clock += Math.floor(rng() * 8_000);
      await say(g, { t: 'bluff.guess', rid: g.view!.bluff.rid, pick: Math.floor(rng() * 3) });
    }
    if (ana.view!.bluff.phase === 'guessing') {
      clock = ana.view!.bluff.guessEndsAt! + 1;
      await host.onAlarm('i-sim');
    }
    const r = ana.view!.bluff.lastRound!;
    console.log(`  Statements: ${r.statements!.map((t, k) => `${k === r.lie ? '[LIE] ' : ''}${t}`).join(' / ')}`);
    for (const p of r.picks) console.log(`  ${name(p.id)}: ${p.pick === null ? 'no guess' : `picked "${r.statements![p.pick]}"`} ${p.correct ? '+10' : '+0'}`);
    console.log(`  ${name(r.tellerId)} fooled the table for +${r.tellerPoints}`);
    if (dropped && !sockets.includes(cy)) {
      cy = await connect('tok-3');
      console.log(`  Cy back. Still seated: ${cy.view!.bluff.me.seated}`);
    }
    clock += REVEAL_MS;
    await host.onAlarm('i-sim');
  }

  const end = ana.view!.bluff;
  const unexpected = [ana, bo, cy].flatMap((s) => s.errors);
  const leaked = [ana, bo, cy].some((s) => s.leaked);
  console.log(`\nFINAL (${end.phase}): ${end.scores.map((x) => `${name(x.id)} ${x.score}`).join(' | ')}`);
  console.log(`Winner(s): ${end.winnerIds.map(name).join(', ') || 'nobody scored'}`);
  console.log(`Lie leaked to a guesser before a reveal: ${leaked ? 'YES' : 'no'}`);
  console.log(`Unexpected server errors: ${unexpected.join(', ') || 'none'}`);
  console.log(`Last live-tables report: ${JSON.stringify(reports.at(-1)!.games.bluff)}`);
  console.log(`Guess window ${GUESS_MS / 1000}s, reveal ${REVEAL_MS / 1000}s. One tell per player.`);
  if (end.phase !== 'over' || leaked || unexpected.length || end.scores.length !== 3) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
