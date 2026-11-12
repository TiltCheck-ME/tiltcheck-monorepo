// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// Live-tables registry: reports, per-guild and global counts, TTL, and no personal data.
import { describe, expect, it } from 'vitest';
import { LIVE_TTL_MS, LiveBoard, parseLiveReport, reportFor, type LiveReport } from '../src/shared/live.js';
import { Room, createRoomState } from '../src/shared/room.js';
import { makeRng } from '../src/shared/rng.js';

const G1 = '111111111111111111';
const G2 = '222222222222222222';

function rep(instanceId: string, guildId: string | null, dad: number, trivia: number, extra: Partial<LiveReport> = {}): LiveReport {
  return {
    instanceId,
    guildId,
    members: Math.max(dad, trivia, 1),
    games: {
      dad: { phase: dad ? 'submitting' : 'seating', count: dad, joinable: dad > 0 && dad < 8 },
      trivia: { phase: trivia ? 'question' : 'idle', count: trivia, joinable: trivia > 0 },
      bluff: { phase: 'seating', count: 0, joinable: false },
    },
    ...extra,
  };
}

describe('LiveBoard', () => {
  it('counts per guild and globally', () => {
    const b = new LiveBoard();
    b.report(rep('i-1', G1, 4, 0), 0);
    b.report(rep('i-2', G1, 0, 3), 0);
    b.report(rep('i-3', G2, 8, 2), 0);
    b.report(rep('i-4', null, 0, 0), 0);
    const g1 = b.summary(G1, 1);
    expect(g1).toMatchObject({ guild: G1, rooms: 2, tables: 2, joinable: 2, games: { dad: { tables: 1, seated: 4, joinable: 1 }, trivia: { tables: 1, playing: 3, joinable: 1 } } });
    const all = b.summary(null, 1);
    expect(all).toMatchObject({ guild: null, rooms: 4, tables: 4, joinable: 3, games: { dad: { tables: 2, seated: 12, joinable: 1 }, trivia: { tables: 2, playing: 5, joinable: 2 } } });
  });

  it('stale rooms drop off after the TTL; a heartbeat keeps them', () => {
    const b = new LiveBoard();
    b.report(rep('i-old', G1, 3, 0), 0);
    b.report(rep('i-live', G1, 3, 0), 0);
    b.report(rep('i-live', G1, 3, 0), LIVE_TTL_MS - 1000);
    expect(b.summary(G1, LIVE_TTL_MS).rooms).toBe(2);
    expect(b.summary(G1, LIVE_TTL_MS + 1).rooms).toBe(1);
    expect([...b.entries.keys()]).toEqual(['i-live']);
    expect(b.summary(G1, 2 * LIVE_TTL_MS).rooms).toBe(0);
  });

  it('a report with nobody in the room removes it right away', () => {
    const b = new LiveBoard();
    b.report(rep('i-1', G1, 3, 0), 0);
    b.report({ ...rep('i-1', G1, 0, 0), members: 0 }, 10);
    expect(b.summary(null, 11).rooms).toBe(0);
  });

  it('the summary carries no user ids, names, avatars or instance ids', () => {
    const b = new LiveBoard();
    b.report(rep('i-secret-instance', G1, 4, 2), 0);
    const json = JSON.stringify(b.summary(G1, 1));
    expect(json).not.toMatch(/i-secret-instance|avatar|name|"id"|members/);
    expect(Object.keys(b.summary(null, 1)).sort()).toEqual(['games', 'guild', 'joinable', 'ok', 'rooms', 'tables', 'ttlSeconds', 'updatedAt']);
  });

  it('parseLiveReport rejects junk', () => {
    expect(parseLiveReport(rep('i-1', G1, 3, 0))).not.toBeNull();
    expect(parseLiveReport(rep('i-1', 'not-a-guild', 3, 0))).toBeNull();
    expect(parseLiveReport({ ...rep('i-1', G1, 3, 0), instanceId: 'bad id!' })).toBeNull();
    expect(parseLiveReport({ ...rep('i-1', G1, 3, 0), games: { dad: { phase: 'x', count: -1, joinable: true } } })).toBeNull();
    expect(parseLiveReport('nope')).toBeNull();
    // Extra fields (say a name) are dropped, not stored.
    const parsed = parseLiveReport({ ...rep('i-1', G1, 3, 0), userName: 'Ana' }) as unknown as Record<string, unknown>;
    expect(parsed.userName).toBeUndefined();
  });

  it('reportFor reads a real room: seated, playing, joinable', () => {
    const room = new Room(createRoomState('i-r'), makeRng(1));
    for (const id of ['a', 'b', 'c']) room.join({ id, name: id, avatar: null }, 0);
    for (const id of ['a', 'b', 'c']) room.handle(id, { t: 'dad.sit' }, 0);
    room.handle('a', { t: 'trivia.start' }, 0);
    const r = reportFor(room.state, G1);
    expect(r).toMatchObject({ instanceId: 'i-r', guildId: G1, members: 3, games: { dad: { phase: 'seating', count: 3, joinable: true }, trivia: { phase: 'question', count: 3, joinable: true } } });
    expect(JSON.stringify(r)).not.toMatch(/"a"|"b"|"c"/);
  });

  it('bluff: seated tables counted under games.bluff and in the totals; joinable only between games; old reports still parse', () => {
    const b = new LiveBoard();
    b.report({ ...rep('i-b1', G1, 0, 0), games: { ...rep('i-b1', G1, 0, 0).games, bluff: { phase: 'seating', count: 3, joinable: true } } }, 0);
    b.report({ ...rep('i-b2', G1, 0, 0), games: { ...rep('i-b2', G1, 0, 0).games, bluff: { phase: 'guessing', count: 5, joinable: false } } }, 0);
    const s = b.summary(G1, 1);
    expect(s.games.bluff).toEqual({ tables: 2, seated: 8, joinable: 1 });
    expect(s).toMatchObject({ tables: 2, joinable: 1 });
    const old = { instanceId: 'i-old', guildId: G1, members: 1, games: { dad: { phase: 'seating', count: 1, joinable: true }, trivia: { phase: 'idle', count: 0, joinable: false } } };
    expect(parseLiveReport(old)!.games.bluff).toEqual({ phase: 'seating', count: 0, joinable: false });
    expect(parseLiveReport({ ...old, games: { ...old.games, bluff: { phase: 'BAD!', count: 1, joinable: true } } })).toBeNull();
    // An entry stored before Bluff existed (no bluff slot) still sums.
    b.entries.set('i-legacy', { ...(old as unknown as LiveReport), at: 1 } as never);
    expect(b.summary(G1, 2).rooms).toBe(3);
    const room = new Room(createRoomState('i-r'), makeRng(1));
    for (const id of ['a', 'b', 'c']) {
      room.join({ id, name: id, avatar: null }, 0);
      room.handle(id, { t: 'bluff.sit' }, 0);
    }
    expect(reportFor(room.state, G1).games.bluff).toEqual({ phase: 'seating', count: 3, joinable: true });
    room.handle('a', { t: 'bluff.start' }, 0);
    expect(reportFor(room.state, G1).games.bluff).toEqual({ phase: 'writing', count: 3, joinable: false });
  });
});
