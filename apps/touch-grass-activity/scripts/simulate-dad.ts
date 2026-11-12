// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// Local 3-player DA&D simulation against the real room logic (RoomHost + Room + dad.ts).
// Every move goes through the same message path a WebSocket client uses. No network.
// Run: pnpm --filter @tiltcheck/touch-grass-activity simulate  [-- --target 5 --n 7]

import { RoomHost, type HostSocket } from '../worker/src/host.js';
import { makeRng } from '../src/shared/rng.js';
import type { RoomUser, RoomView, ServerMessage } from '../src/shared/protocol.js';

const args = process.argv.slice(2);
const argNum = (k: string, d: number) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? Number(args[i + 1]) : d;
};
const TARGET = argNum('target', 5);
const N = argNum('n', 7);

const users: Record<string, RoomUser> = {
  'tok-1': { id: '200000001', name: 'Ana', avatar: null },
  'tok-2': { id: '200000002', name: 'Bo', avatar: null },
  'tok-3': { id: '200000003', name: 'Cy', avatar: null },
};

class SimSocket implements HostSocket {
  user: RoomUser | null = null;
  view: RoomView | null = null;
  errors: string[] = [];
  send(raw: string): void {
    const m = JSON.parse(raw) as ServerMessage;
    if (m.t === 'state') this.view = m.view;
    if (m.t === 'error') this.errors.push(m.code);
  }
  close(): void {}
  setUser(u: RoomUser): void {
    this.user = u;
  }
}

const sockets: SimSocket[] = [];
const storage = new Map<string, unknown>();
let clock = Date.now();
const host = new RoomHost({
  storage: { get: async (k) => storage.get(k) as never, put: async (k, v) => void storage.set(k, structuredClone(v)) },
  sockets: () => sockets,
  verify: async (t) => users[t] ?? null,
  now: () => (clock += 400),
  rng: makeRng(N),
});
const rng = makeRng(N + 1);
const say = (s: SimSocket, msg: object) => host.onMessage('i-sim', s, JSON.stringify(msg));
const name = (id: string | null | undefined) => Object.values(users).find((u) => u.id === id)?.name ?? '?';

async function main(): Promise<void> {
  for (const token of Object.keys(users)) {
    const s = new SimSocket();
    sockets.push(s);
    await say(s, { t: 'auth', token });
  }
  for (const s of sockets) await say(s, { t: 'dad.sit' });
  await say(sockets[0]!, { t: 'dad.start', target: TARGET });

  let guard = 0;
  while (sockets[0]!.view?.dad.phase !== 'over' && guard++ < 200) {
    const d = sockets[0]!.view!.dad;
    if (d.phase === 'submitting') {
      console.log(`\nRound ${d.round}. Judge: ${name(d.judgeId)}. Prompt: ${d.prompt}`);
      for (const s of sockets) {
        const v = s.view!.dad;
        if (v.me.isJudge || v.mySubmission) continue;
        // Hidden-hand check: this socket never saw another player's card ids.
        const card = v.hand[Math.floor(rng() * v.hand.length)]!;
        await say(s, { t: 'dad.submit', cardId: card.id });
      }
    } else if (d.phase === 'judging') {
      const judge = sockets.find((s) => s.view!.dad.me.isJudge)!;
      const entries = judge.view!.dad.entries;
      console.log(`  ${entries.length} anonymous answers on the table`);
      const pickIt = entries[Math.floor(rng() * entries.length)]!;
      await say(judge, { t: 'dad.pick', entryId: pickIt.entryId });
      const r = sockets[0]!.view!.dad.lastRound!;
      console.log(`  ${name(judge.user!.id)} picks: "${r.winningText}" -> ${name(r.winnerId)} +1`);
    } else if (d.phase === 'reveal') {
      const sc = d.seats.map((s) => `${name(s.id)} ${s.score}`).join(' | ');
      console.log(`  Score: ${sc}`);
      await say(sockets[1]!, { t: 'dad.next' });
    } else {
      throw new Error(`unexpected phase ${d.phase}`);
    }
  }

  const final = sockets[0]!.view!.dad;
  const errors = sockets.flatMap((s) => s.errors);
  console.log(`\nWINNER: ${name(final.winnerId)} with ${final.seats.find((s) => s.id === final.winnerId)?.score} points after ${final.round} rounds (target ${TARGET}).`);
  console.log(`Final: ${final.seats.map((s) => `${name(s.id)} ${s.score}`).join(' | ')}`);
  console.log(`Server errors during the game: ${errors.length ? errors.join(', ') : 'none'}`);
  if (final.phase !== 'over' || !final.winnerId || errors.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
