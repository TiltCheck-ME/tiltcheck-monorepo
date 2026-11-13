// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// "Live tables" signal. Each room reports a tiny, anonymous summary to one registry Durable Object;
// GET /api/live reads counts back out. No user ids, names or avatars ever go in here.

import { MAX_PLAYERS } from './dad.js';
import { isRunning } from './trivia.js';
import { MAX_PLAYERS as BLUFF_MAX, isInGame as bluffInGame } from './bluff.js';
import type { RoomState } from './room.js';

export const LIVE_TTL_MS = 120_000;
/** Rooms re-report at least this often while anyone is in them, so the TTL never drops a live room. */
export const LIVE_HEARTBEAT_MS = 50_000;

export interface LiveGameReport {
  phase: string;
  /** Seated (DA&D, Bluff) or playing (trivia). */
  count: number;
  joinable: boolean;
  /** Trivia only: connected players on the Trivia screen with no game running (table alerts). */
  waiting?: number;
}

export interface LiveReport {
  instanceId: string;
  guildId: string | null;
  members: number;
  /** `bluff` is optional on the wire so a report from a pre-Bluff room still parses (counts as empty). */
  games: { dad: LiveGameReport; trivia: LiveGameReport; bluff: LiveGameReport };
}

export interface LiveEntry extends LiveReport {
  at: number;
}

export interface LiveSummary {
  ok: true;
  guild: string | null;
  ttlSeconds: number;
  updatedAt: number;
  /** Activity instances with at least one person in them. */
  rooms: number;
  /** Tables (a DA&D or Bluff table with someone seated, or a trivia game running) across all games. */
  tables: number;
  /** Tables a newcomer can join right now. */
  joinable: number;
  games: {
    dad: { tables: number; seated: number; joinable: number };
    trivia: { tables: number; playing: number; joinable: number };
    bluff: { tables: number; seated: number; joinable: number };
  };
}

function triviaWaiting(state: RoomState): number {
  if (isRunning(state.trivia)) return 0;
  return Object.values(state.members).filter((m) => m.awaySince === null && m.looking === 'trivia').length;
}

export function reportFor(state: RoomState, guildId: string | null): LiveReport {
  const members = Object.keys(state.members).length;
  const d = state.dad;
  const t = state.trivia;
  const seated = d.seats.length;
  const playing = isRunning(t) ? Object.keys(t.scores).length : 0;
  const b = state.bluff;
  const bluffSeated = b ? b.seats.length : 0;
  return {
    instanceId: state.instanceId,
    guildId,
    members,
    games: {
      dad: { phase: d.phase, count: seated, joinable: members > 0 && seated > 0 && seated + d.waiting.length < MAX_PLAYERS },
      // Late joiners spectate one question and are dealt in at the next, so a running game is joinable
      // until its last question opens.
      trivia: { phase: t.phase, count: playing, joinable: members > 0 && isRunning(t) && t.index + 1 < t.total, waiting: triviaWaiting(state) },
      // Bluff late joiners only spectate until the next game, so a table is joinable between games.
      bluff: {
        phase: b ? b.phase : 'seating',
        count: bluffSeated,
        joinable: Boolean(b) && members > 0 && bluffSeated > 0 && !bluffInGame(b) && bluffSeated + b.waiting.length < BLUFF_MAX,
      },
    },
  };
}

/** Change detection: the parts a reader would notice. */
export function reportKey(r: LiveReport): string {
  return JSON.stringify([r.guildId, r.members, r.games.dad, r.games.trivia, r.games.bluff]);
}

const SAFE_PHASE = /^[a-z]{1,16}$/;

/** Validate a report that came over the internal DO-to-DO fetch. */
export function parseLiveReport(raw: unknown): LiveReport | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const game = (g: unknown): LiveGameReport | null => {
    if (!g || typeof g !== 'object') return null;
    const x = g as Record<string, unknown>;
    if (typeof x.phase !== 'string' || !SAFE_PHASE.test(x.phase)) return null;
    if (!Number.isInteger(x.count) || (x.count as number) < 0 || (x.count as number) > 1000) return null;
    if (typeof x.joinable !== 'boolean') return null;
    const out: LiveGameReport = { phase: x.phase, count: x.count as number, joinable: x.joinable };
    if (x.waiting !== undefined) {
      if (!Number.isInteger(x.waiting) || (x.waiting as number) < 0 || (x.waiting as number) > 1000) return null;
      out.waiting = x.waiting as number;
    }
    return out;
  };
  if (typeof r.instanceId !== 'string' || !/^[A-Za-z0-9:._-]{1,128}$/.test(r.instanceId)) return null;
  const guildId = r.guildId === null || r.guildId === undefined ? null : typeof r.guildId === 'string' && /^\d{5,25}$/.test(r.guildId) ? r.guildId : undefined;
  if (guildId === undefined) return null;
  if (!Number.isInteger(r.members) || (r.members as number) < 0 || (r.members as number) > 1000) return null;
  const gs = r.games as Record<string, unknown> | undefined;
  const dad = game(gs?.dad);
  const trivia = game(gs?.trivia);
  const bluff = gs?.bluff === undefined ? { phase: 'seating', count: 0, joinable: false } : game(gs.bluff);
  if (!dad || !trivia || !bluff) return null;
  return { instanceId: r.instanceId, guildId, members: r.members as number, games: { dad, trivia, bluff } };
}

/** The registry's brain: entries keyed by instance id, dropped after the TTL. */
export class LiveBoard {
  entries = new Map<string, LiveEntry>();

  constructor(private readonly ttlMs = LIVE_TTL_MS) {}

  report(r: LiveReport, now: number): void {
    this.prune(now);
    if (r.members <= 0) this.entries.delete(r.instanceId);
    else this.entries.set(r.instanceId, { ...r, at: now });
  }

  prune(now: number): boolean {
    let changed = false;
    for (const [id, e] of this.entries) {
      if (now - e.at > this.ttlMs) {
        this.entries.delete(id);
        changed = true;
      }
    }
    return changed;
  }

  summary(guild: string | null, now: number): LiveSummary {
    this.prune(now);
    const out: LiveSummary = {
      ok: true,
      guild,
      ttlSeconds: Math.round(this.ttlMs / 1000),
      updatedAt: now,
      rooms: 0,
      tables: 0,
      joinable: 0,
      games: { dad: { tables: 0, seated: 0, joinable: 0 }, trivia: { tables: 0, playing: 0, joinable: 0 }, bluff: { tables: 0, seated: 0, joinable: 0 } },
    };
    for (const e of this.entries.values()) {
      if (guild !== null && e.guildId !== guild) continue;
      out.rooms += 1;
      const { dad, trivia } = e.games;
      const bluff = e.games.bluff;
      if (dad.count > 0) {
        out.games.dad.tables += 1;
        out.games.dad.seated += dad.count;
        if (dad.joinable) out.games.dad.joinable += 1;
      }
      if (trivia.count > 0) {
        out.games.trivia.tables += 1;
        out.games.trivia.playing += trivia.count;
        if (trivia.joinable) out.games.trivia.joinable += 1;
      }
      // Entries stored before Bluff existed have no bluff slot.
      if (bluff && bluff.count > 0) {
        out.games.bluff.tables += 1;
        out.games.bluff.seated += bluff.count;
        if (bluff.joinable) out.games.bluff.joinable += 1;
      }
    }
    out.tables = out.games.dad.tables + out.games.trivia.tables + out.games.bluff.tables;
    out.joinable = out.games.dad.joinable + out.games.trivia.joinable + out.games.bluff.joinable;
    return out;
  }

  toJSON(): LiveEntry[] {
    return [...this.entries.values()];
  }

  load(list: LiveEntry[] | undefined): void {
    this.entries = new Map((list ?? []).map((e) => [e.instanceId, e]));
  }
}
