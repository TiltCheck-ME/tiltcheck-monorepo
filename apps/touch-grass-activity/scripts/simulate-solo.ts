// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// Solo games against the real room logic and the in-memory solo service: two players solve Daily
// Grass in a server room (one wins, one runs out), a DM player solves off the record, and three
// Myth or Math runs go on the week board (one with a mid-card drop and rejoin).
// Run: pnpm --filter @tiltcheck/touch-grass-activity simulate:solo

import { Room, createRoomState } from '../src/shared/room.js';
import { makeRng } from '../src/shared/rng.js';
import { memorySoloService } from '../src/shared/solo.js';
import { postMyth, runDaily } from '../src/shared/soloHost.js';
import { DAILY_ANSWERS, isValidGuess } from '../src/shared/dailyWords.js';
import { answerFor, MAX_GUESSES } from '../src/shared/daily.js';
import { dayNumberFor } from '../src/shared/scores.js';
import { mythById } from '../src/shared/mythBank.js';
import { CARDS_PER_RUN } from '../src/shared/myth.js';

const GUILD = '123456789012345678';
const solo = memorySoloService({ salt: 'simulate', answers: DAILY_ANSWERS, isValid: isValidGuess });
const rng = makeRng(2026);
let now = Date.now();
const room = new Room(createRoomState(`i-1-gc-${GUILD}-1`), rng);
room.state.guildId = GUILD;
room.limiter.take = () => true;
const players = [
  { id: '100000001', name: 'Ana', avatar: null },
  { id: '100000002', name: 'Bo', avatar: null },
  { id: '100000003', name: 'Cy', avatar: null },
];
for (const p of players) room.join(p, now);
function fail(msg: string): never {
  throw new Error(`FAIL: ${msg}`);
}

async function main(): Promise<void> {
  const answer = answerFor(dayNumberFor(now), 'simulate', DAILY_ANSWERS);
  const decoys = DAILY_ANSWERS.filter((w) => w !== answer);
  // Ana: three misses then the word.
  for (const w of [...decoys.slice(0, 3), answer]) {
    now += 7_000;
    const r = await runDaily(room, solo, players[0]!, { t: 'daily.guess', word: w }, GUILD, now);
    if (!r.ok) fail(`Ana guess ${w}: ${r.code}`);
  }
  // Bo: six misses.
  for (const w of decoys.slice(10, 10 + MAX_GUESSES)) {
    now += 5_000;
    await runDaily(room, solo, players[1]!, { t: 'daily.guess', word: w }, GUILD, now);
  }
  const va = room.viewFor(players[0]!.id, now).daily;
  const vb = room.viewFor(players[1]!.id, now).daily;
  const vc = room.viewFor(players[2]!.id, now).daily;
  if (va.me?.status !== 'won' || va.myRank !== 1) fail('Ana should have won and be #1');
  if (vb.me?.status !== 'lost' || vb.me.answer !== answer) fail('Bo should be out with the answer shown');
  if (JSON.stringify(vc).includes(`"${answer}"`)) fail('Cy (not playing) must not see the answer');
  if (vc.friends.length !== 2) fail('Cy should see two friends');
  console.log(`Daily Grass: Ana won in ${va.me!.rows.length} (#${va.myRank} today), Bo out after ${vb.me!.rows.length}; Cy sees ${vc.friends.map((f) => `${f.rows} rows/${f.status}`).join(', ')}`);

  const dm = new Room(createRoomState('i-1-pc-5'), rng);
  dm.join(players[2]!, now);
  await runDaily(dm, solo, players[2]!, { t: 'daily.guess', word: answer }, null, now);
  const solvers = (await solo.dailySolvers(GUILD, now)).rows.map((r) => r.name);
  if (solvers.join() !== 'Ana') fail(`DM solve must stay off the board, got ${solvers.join()}`);
  console.log(`Daily Grass: Cy solved in a DM, off the record; server board: ${solvers.join(', ')}`);

  for (const [i, p] of players.entries()) {
    room.handle(p.id, { t: 'myth.start' }, now);
    const run = room.state.myth!.runs[p.id]!;
    for (let c = 0; c < CARDS_PER_RUN; c += 1) {
      if (i === 2 && c === 4) {
        room.markAway(p.id, now + 2_000);
        room.join(p, now + 60_000);
        now += 60_000;
      }
      const card = mythById(run.ids[c]!)!;
      const right = (c + i) % 3 !== 0;
      const r = room.handle(p.id, { t: 'myth.answer', rid: run.runId, cid: card.id, pick: right ? card.truth : !card.truth }, now + 1_500);
      if (!r.ok) fail(`${p.name} card ${c}: ${r.code}`);
      room.handle(p.id, { t: 'myth.next' }, now + 2_000);
      now += 2_500;
    }
    if (run.phase !== 'over') fail(`${p.name} run should be over`);
  }
  await postMyth(room, solo, GUILD, now);
  const week = (await solo.mythBoard(GUILD, null, now)).week.map((r) => `${r.name} ${r.score}`);
  if (week.length !== 3) fail('three runs should be on the week board');
  console.log(`Myth or Math week board: ${week.join(', ')}`);
  console.log('OK');
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
