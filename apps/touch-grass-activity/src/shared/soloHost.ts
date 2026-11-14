// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-14
// The async half of the solo games, shared by the worker's RoomHost and the guest-mode transport.
// Daily Grass guesses go to storage (the answer never sits in the room); finished Myth or Math runs
// go on the server's week board. Boards are server-run only: a game with no server (DM, group DM)
// is off the record, same as trivia high scores.

import type { Room, ActionResult } from './room.js';
import type { RoomUser } from './protocol.js';
import type { SoloService } from './solo.js';
import { weekStartFor } from './scores.js';

export type SoloAction = { t: 'daily.open' } | { t: 'daily.guess'; word: string } | { t: 'daily.hint' };

const unavailable: ActionResult = { ok: false, code: 'solo-unavailable', message: "Couldn't reach the puzzle. Try again." };

/** Refresh this server's Today's solvers into the room (no-op without a server). */
export async function refreshSolvers(room: Room, solo: SoloService, guild: string | null, now: number): Promise<void> {
  if (!guild) return;
  try {
    room.setSolvers(await solo.dailySolvers(guild, now));
  } catch {
    /* the board is best effort */
  }
}

export async function refreshMythWeek(room: Room, solo: SoloService, guild: string | null, now: number): Promise<void> {
  if (!guild) return;
  try {
    const b = await solo.mythBoard(guild, null, now);
    room.setMythWeek(b.weekStart ?? weekStartFor(now), b.week);
  } catch {
    /* best effort */
  }
}

/** Run a Daily Grass action for a verified user. The room has already gated (member, rate limit). */
export async function runDaily(room: Room, solo: SoloService | undefined, user: RoomUser, action: SoloAction, guild: string | null, now: number): Promise<ActionResult> {
  if (!solo) return { ok: false, code: 'not-configured', message: 'Daily Grass is not set up here.' };
  let r;
  try {
    r = action.t === 'daily.open' ? await solo.dailyOpen(user, now) : action.t === 'daily.hint' ? await solo.dailyHint(user, now) : await solo.dailyGuess(user, action.word, now);
  } catch {
    return unavailable;
  }
  if (!r.ok) return r;
  room.setDaily(user.id, r.record);
  if (r.justFinished && r.record.status === 'won' && guild) {
    try {
      const member = room.state.members[user.id];
      const rank = await solo.dailySolved(
        guild,
        {
          id: user.id,
          name: member?.name ?? user.name,
          avatar: member?.avatar ?? user.avatar,
          guesses: r.record.rows.length,
          ms: Math.max(0, (r.record.finishedAt ?? now) - r.record.startedAt),
          at: now,
          ...(r.record.hint ? { hint: true } : {}),
        },
        now,
      );
      room.setDailyRank(user.id, r.record.day, rank);
    } catch {
      /* the board write is best effort; the solve itself is already stored */
    }
  }
  if (action.t === 'daily.open' || r.justFinished) await refreshSolvers(room, solo, guild, now);
  return { ok: true };
}

/** Put finished Myth or Math runs on the server's week board, or mark them off the record. */
export async function postMyth(room: Room, solo: SoloService | undefined, guild: string | null, now: number): Promise<void> {
  const pending = room.pendingMyth();
  if (!pending.length) return;
  let posted = false;
  for (const p of pending) {
    if (!guild) {
      room.applyMyth(p.userId, p.runId, null, true);
      continue;
    }
    if (!solo) continue;
    try {
      const brags = await solo.mythRecord(guild, [p.result], now);
      room.applyMyth(p.userId, p.runId, brags[p.userId] ?? null);
      posted = true;
    } catch {
      // Give up quietly on this run's board write; the end screen just won't brag.
      room.applyMyth(p.userId, p.runId, null);
    }
  }
  if (posted && solo) await refreshMythWeek(room, solo, guild, now);
}
