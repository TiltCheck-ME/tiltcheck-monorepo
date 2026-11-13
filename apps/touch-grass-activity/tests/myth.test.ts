// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// Myth or Math: scoring, the clock, the answer staying hidden until called, pause on drop, the week
// board (and the DM skip), and the bank itself.
import { describe, expect, it } from 'vitest';
import * as myth from '../src/shared/myth.js';
import { MYTH_BANK, mythById } from '../src/shared/mythBank.js';
import { Room, createRoomState } from '../src/shared/room.js';
import { makeRng } from '../src/shared/rng.js';
import { memorySoloService } from '../src/shared/solo.js';
import { postMyth } from '../src/shared/soloHost.js';
import { DAILY_ANSWERS, isValidGuess } from '../src/shared/dailyWords.js';
import { reportFor } from '../src/shared/live.js';

const T0 = Date.UTC(2026, 10, 12, 18, 0, 0);
const ANA = { id: '100000001', name: 'Ana', avatar: null };
const BO = { id: '100000002', name: 'Bo', avatar: null };

function room(guild: string | null = '123456789') {
  const r = new Room(createRoomState(guild ? `i-1-gc-${guild}-987654321` : 'i-1-pc-555555555'), makeRng(9));
  r.state.guildId = guild;
  r.join(ANA, T0);
  r.join(BO, T0);
  return r;
}

const truthOf = (r: Room, id: string) => mythById(r.state.myth!.runs[id]!.ids[r.state.myth!.runs[id]!.index]!)!.truth;

describe('Myth or Math: scoring and the clock', () => {
  it('100 for a right call plus up to 50 for speed; wrong scores 0', () => {
    const r = room();
    expect(r.handle(ANA.id, { t: 'myth.start' }, T0)).toEqual({ ok: true });
    const run = r.state.myth!.runs[ANA.id]!;
    const truth = truthOf(r, ANA.id);
    // Instant right answer: full 150.
    expect(r.handle(ANA.id, { t: 'myth.answer', rid: run.runId, cid: run.ids[0]!, pick: truth }, T0)).toEqual({ ok: true });
    expect(run.score).toBe(150);
    expect(r.handle(ANA.id, { t: 'myth.next' }, T0 + 1_000)).toEqual({ ok: true });
    // Right with half the clock gone: 100 + 25.
    const t2 = truthOf(r, ANA.id);
    r.handle(ANA.id, { t: 'myth.answer', rid: run.runId, cid: run.ids[1]!, pick: t2 }, T0 + 1_000 + myth.CARD_MS / 2);
    expect(run.score).toBe(275);
    r.handle(ANA.id, { t: 'myth.next' }, T0 + 10_000);
    // Wrong: 0.
    const t3 = truthOf(r, ANA.id);
    r.handle(ANA.id, { t: 'myth.answer', rid: run.runId, cid: run.ids[2]!, pick: !t3 }, T0 + 10_100);
    expect(run.score).toBe(275);
    expect(run.answers.map((a) => a.points)).toEqual([150, 125, 0]);
  });

  it('8 seconds per card: the clock running out closes the card as a miss', () => {
    const r = room();
    r.handle(ANA.id, { t: 'myth.start' }, T0);
    const run = r.state.myth!.runs[ANA.id]!;
    expect(r.nextWake()).toBe(T0 + myth.CARD_MS);
    expect(r.tick(T0 + myth.CARD_MS)).toBe(true);
    expect(run.phase).toBe('reveal');
    expect(run.answers[0]).toMatchObject({ pick: null, correct: false, points: 0 });
    expect(r.handle(ANA.id, { t: 'myth.answer', rid: run.runId, cid: run.ids[0]!, pick: true }, T0 + myth.CARD_MS + 1)).toMatchObject({ ok: false, code: 'not-open' });
  });

  it('10 cards a run, no repeats, then the run is over; stale or foreign answers are refused', () => {
    const r = room();
    r.handle(ANA.id, { t: 'myth.start' }, T0);
    const run = r.state.myth!.runs[ANA.id]!;
    expect(new Set(run.ids).size).toBe(myth.CARDS_PER_RUN);
    expect(r.handle(ANA.id, { t: 'myth.answer', rid: 'rnope', cid: run.ids[0]!, pick: true }, T0)).toMatchObject({ code: 'no-run' });
    expect(r.handle(ANA.id, { t: 'myth.answer', rid: run.runId, cid: run.ids[1]!, pick: true }, T0)).toMatchObject({ code: 'stale-card' });
    expect(r.handle(ANA.id, { t: 'myth.start' }, T0)).toMatchObject({ code: 'already-running' });
    let now = T0;
    for (let i = 0; i < myth.CARDS_PER_RUN; i += 1) {
      expect(r.handle(ANA.id, { t: 'myth.answer', rid: run.runId, cid: run.ids[i]!, pick: true }, now)).toEqual({ ok: true });
      expect(r.handle(ANA.id, { t: 'myth.next' }, now)).toEqual({ ok: true });
      now += 1_000;
    }
    expect(run.phase).toBe('over');
    expect(run.answers).toHaveLength(10);
    const right = run.ids.filter((id) => mythById(id)!.truth).length;
    expect(run.answers.filter((a) => a.correct)).toHaveLength(right);
    // A second run deals fresh cards.
    r.handle(ANA.id, { t: 'myth.start' }, now);
    const again = r.state.myth!.runs[ANA.id]!;
    for (const id of again.ids) expect(run.ids).not.toContain(id);
  });

  it('solo: each player runs their own deck in a shared room', () => {
    const r = room();
    r.handle(ANA.id, { t: 'myth.start' }, T0);
    expect(r.viewFor(BO.id, T0).myth.run).toBeNull();
    r.handle(BO.id, { t: 'myth.start' }, T0 + 500);
    expect(r.state.myth!.runs[ANA.id]!.runId).not.toBe(r.state.myth!.runs[BO.id]!.runId);
    expect(r.viewFor(ANA.id, T0).myth.playingCount).toBe(2);
  });
});

describe('Myth or Math: the answer stays hidden until called', () => {
  it('an open card carries no truth and no why; the reveal does', () => {
    const r = room();
    r.handle(ANA.id, { t: 'myth.start' }, T0);
    const run = r.state.myth!.runs[ANA.id]!;
    const card = mythById(run.ids[0]!)!;
    const v = r.viewFor(ANA.id, T0).myth.run!;
    expect(v.card).toEqual({ id: card.id, text: card.text });
    expect(v.reveal).toBeNull();
    const json = JSON.stringify(r.viewFor(ANA.id, T0));
    expect(json).not.toContain(card.why);
    expect(json).not.toContain('"truth"');
    // Other players never see your card at all.
    expect(JSON.stringify(r.viewFor(BO.id, T0))).not.toContain(card.text);
    r.handle(ANA.id, { t: 'myth.answer', rid: run.runId, cid: card.id, pick: true }, T0 + 100);
    const after = r.viewFor(ANA.id, T0 + 100).myth.run!;
    expect(after.card).toBeNull();
    expect(after.reveal).toMatchObject({ id: card.id, truth: card.truth, why: card.why, pick: true });
  });
});

describe('Myth or Math: dropping out and coming back', () => {
  it('a drop freezes the card with the time left; rejoining picks it up there (no away grace needed)', () => {
    const r = room();
    r.handle(ANA.id, { t: 'myth.start' }, T0);
    r.markAway(ANA.id, T0 + 3_000);
    const run = r.state.myth!.runs[ANA.id]!;
    expect(run.phase).toBe('paused');
    expect(run.pausedLeft).toBe(5_000);
    // The clock does not run while away.
    r.tick(T0 + 60_000);
    expect(run.phase).toBe('paused');
    expect(r.nextWake()).not.toBe(run.cardEndsAt);
    r.join(ANA, T0 + 90_000);
    expect(run.phase).toBe('card');
    expect(run.cardEndsAt).toBe(T0 + 95_000);
    // Even after the away grace removes them, the run is kept for when they're back.
    r.markAway(ANA.id, T0 + 91_000);
    r.leave(ANA.id, T0 + 300_000);
    expect(r.state.myth!.runs[ANA.id]?.phase).toBe('paused');
    r.join(ANA, T0 + 310_000);
    expect(r.state.myth!.runs[ANA.id]?.phase).toBe('card');
  });
});

describe('Myth or Math: the week board', () => {
  const solo = () => memorySoloService({ salt: 's', answers: DAILY_ANSWERS, isValid: isValidGuess });
  function finish(r: Room, id: string, start: number): number {
    r.limiter.take = () => true;
    r.handle(id, { t: 'myth.start' }, start);
    const run = r.state.myth!.runs[id]!;
    for (let i = 0; i < myth.CARDS_PER_RUN; i += 1) {
      r.handle(id, { t: 'myth.answer', rid: run.runId, cid: run.ids[i]!, pick: mythById(run.ids[i]!)!.truth }, start);
      r.handle(id, { t: 'myth.next' }, start);
    }
    return run.score;
  }

  it("a finished run goes on that server's week board once, with the server's own score", async () => {
    const r = room('123456789');
    const s = solo();
    const score = finish(r, ANA.id, T0);
    expect(score).toBe(1500);
    expect(r.pendingMyth()).toEqual([{ userId: ANA.id, runId: r.state.myth!.runs[ANA.id]!.runId, result: { id: ANA.id, name: 'Ana', avatar: null, score: 1500 } }]);
    await postMyth(r, s, '123456789', T0);
    expect(r.pendingMyth()).toEqual([]);
    const v = r.viewFor(ANA.id, T0).myth;
    expect(v.run).toMatchObject({ board: 'posted', brag: { personalBest: true, weekRank: 1 } });
    expect(v.board).toMatchObject({ kind: 'board', rows: [{ id: ANA.id, score: 1500 }] });
    // Posting again does nothing.
    await postMyth(r, s, '123456789', T0);
    expect((await s.mythBoard('123456789', null, T0)).week).toHaveLength(1);
    // Its own board: trivia's book in the same server is untouched.
    expect(await s.guilds.get('123456789')!.get('book')).toBeUndefined();
  });

  it('a run in a DM is off the record ("No server, no board")', async () => {
    const r = room(null);
    const s = solo();
    finish(r, ANA.id, T0);
    await postMyth(r, s, null, T0);
    expect(r.viewFor(ANA.id, T0).myth).toMatchObject({ run: { board: 'off-record', brag: null }, board: { kind: 'no-server' } });
    expect(s.guilds.size).toBe(0);
  });

  it('live report: myth counts players mid-run, daily counts players on its screen; no tables, nothing joinable', () => {
    const r = room();
    r.handle(ANA.id, { t: 'myth.start' }, T0);
    r.handle(BO.id, { t: 'look', at: 'daily' }, T0);
    const rep = reportFor(r.state, '123456789');
    expect(rep.games.myth).toEqual({ phase: 'solo', count: 1, joinable: false });
    expect(rep.games.daily).toEqual({ phase: 'solo', count: 1, joinable: false });
  });
});

describe('Myth or Math: the bank', () => {
  it('60+ cards, unique ids and statements, a why of 140 characters or less, both answers well represented', () => {
    expect(MYTH_BANK.length).toBeGreaterThanOrEqual(60);
    expect(new Set(MYTH_BANK.map((c) => c.id)).size).toBe(MYTH_BANK.length);
    expect(new Set(MYTH_BANK.map((c) => c.text.toLowerCase())).size).toBe(MYTH_BANK.length);
    for (const c of MYTH_BANK) {
      expect(c.why.length).toBeLessThanOrEqual(140);
      expect(c.why.length).toBeGreaterThan(10);
      expect(typeof c.truth).toBe('boolean');
    }
    const trues = MYTH_BANK.filter((c) => c.truth).length;
    expect(trues).toBeGreaterThanOrEqual(20);
    expect(MYTH_BANK.length - trues).toBeGreaterThanOrEqual(20);
  });

  it('no venue or brand names, no "how to win" copy, no protect/shield framing', () => {
    const BAD = /\b(how to win|guaranteed win|sure thing|tip:|protect|shield|stake\.com|draftkings|fanduel|mgm|caesars|bet365|powerball|mega millions|vegas|las vegas)\b/i;
    for (const c of MYTH_BANK) for (const t of [c.text, c.why]) expect({ id: c.id, t, hit: BAD.test(t) }).toEqual({ id: c.id, t, hit: false });
  });
});
