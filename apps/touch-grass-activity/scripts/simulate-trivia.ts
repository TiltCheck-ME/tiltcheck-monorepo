// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// Local 3-player trivia game against the real room logic (RoomHost + Room + trivia.ts), driven by a
// fake clock and the alarm path, including one player dropping mid-game and coming back inside the
// away grace period. Every move goes through the same message path a WebSocket client uses.
// Run: pnpm --filter @tiltcheck/touch-grass-activity simulate:trivia  [-- --n 7]

import { RoomHost, type HostSocket } from '../worker/src/host.js';
import { makeRng } from '../src/shared/rng.js';
import { ANSWER_MS, REVEAL_MS } from '../src/shared/trivia.js';
import type { RoomUser, RoomView, ServerMessage } from '../src/shared/protocol.js';
import type { LiveReport } from '../src/shared/live.js';

const args = process.argv.slice(2);
const i = args.indexOf('--n');
const N = i >= 0 ? Number(args[i + 1]) : 7;

const users: Record<string, RoomUser> = {
  'tok-1': { id: '300000001', name: 'Ana', avatar: null },
  'tok-2': { id: '300000002', name: 'Bo', avatar: null },
  'tok-3': { id: '300000003', name: 'Cy', avatar: null },
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
      if (m.view.trivia.phase === 'question' && raw.includes('"correct"')) this.leaked = true;
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
  const [ana, bo] = [await connect('tok-1'), await connect('tok-2')];
  let cy = await connect('tok-3');
  await host.setGuild('i-sim', '123456789012345678');
  await say(bo, { t: 'trivia.start' });
  let unexpected = 0;

  for (let q = 1; q <= 10; q += 1) {
    const v = ana.view!.trivia;
    if (v.phase !== 'question' || v.number !== q) throw new Error(`expected Q${q}, got ${v.phase} ${v.number}`);
    console.log(`\nQ${q}/10: ${v.question!.text}`);
    // Cy switches apps during Q4 and comes back for Q6 (inside the 3-minute grace).
    if (q === 4) {
      sockets = sockets.filter((s) => s !== cy);
      await host.onClose('i-sim', cy);
      console.log('  Cy dropped (app switch). Marked away, still on the board.');
    }
    if (q === 6) {
      cy = await connect('tok-3');
      console.log(`  Cy back. Still playing: ${cy.view!.trivia.me.playing}`);
    }
    for (const s of sockets) {
      if (!s.view!.trivia.me.playing) continue;
      clock += Math.floor(rng() * 4_000);
      await say(s, { t: 'trivia.answer', qid: v.question!.id, choice: Math.floor(rng() * 4) });
    }
    if (ana.view!.trivia.phase === 'question') {
      clock = ana.view!.trivia.endsAt! + 1;
      await host.onAlarm('i-sim');
    }
    const r = ana.view!.trivia.reveal!;
    console.log(`  Answer: ${r.choices[r.correct]}`);
    for (const x of r.results) console.log(`  ${name(x.id)}: ${x.choice === null ? 'no answer' : r.choices[x.choice]} ${x.correct ? `+${x.points}` : '+0'}`);
    clock += REVEAL_MS;
    await host.onAlarm('i-sim');
  }

  const end = ana.view!.trivia;
  for (const s of [ana, bo, cy]) unexpected += s.errors.filter((e) => e !== 'already-answered').length;
  const leaked = [ana, bo, cy].some((s) => s.leaked);
  console.log(`\nFINAL (${end.phase}): ${end.scores.map((x) => `${name(x.id)} ${x.score}`).join(' | ')}`);
  console.log(`Winner(s): ${end.winnerIds.map(name).join(', ') || 'nobody scored'}`);
  console.log(`Answer leaked before a reveal: ${leaked ? 'YES' : 'no'}`);
  console.log(`Unexpected server errors: ${unexpected || 'none'}`);
  const lr = reports.at(-1)!;
  console.log(`Last live-tables report: ${JSON.stringify(lr)}`);
  console.log(`Answer window ${ANSWER_MS / 1000}s, reveal ${REVEAL_MS / 1000}s.`);
  if (end.phase !== 'over' || leaked || unexpected || end.scores.length !== 3) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
