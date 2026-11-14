// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-14
// The solo games' storage side, behind one interface so the room host doesn't care where it lives.
// - Worker: SCORES Durable Object instances (worker/src/room-do.ts). Daily boards and stats live in
//   one instance per player ('daily-user:<id>'), so a player gets one board a day no matter which
//   room or channel they open it from. Today's solvers and the Myth or Math week live in that
//   server's own instance ('guild:<id>'), next to its trivia board, under their own keys.
// - Guest mode and tests: memorySoloService below, the same code on in-memory maps.
// Scores only ever come from the server's own game state; there is no route for a client number.

import { DailyBook, DailySolvers, type DailyResult, type DailyRules, type SolverRow } from './daily.js';
import { ScoreBook, memoryBookStorage, type BoardView, type BookStorage, type Brag, type FinishedScore } from './scores.js';
import type { RoomUser } from './protocol.js';

export const MYTH_BOOK_PREFIX = 'myth:';

export interface SoloService {
  dailyOpen(user: RoomUser, now: number): Promise<DailyResult>;
  dailyGuess(user: RoomUser, word: string, now: number): Promise<DailyResult>;
  /** Today's one hint for this player (the storage side holds the answer and picks the letter). */
  dailyHint(user: RoomUser, now: number): Promise<DailyResult>;
  /** Put a solve on that server's "Today's solvers". Returns the player's rank. */
  dailySolved(guild: string, row: SolverRow, now: number): Promise<number | null>;
  dailySolvers(guild: string, now: number): Promise<{ day: string; rows: SolverRow[] }>;
  mythRecord(guild: string, results: FinishedScore[], now: number): Promise<Record<string, Brag>>;
  mythBoard(guild: string, me: string | null, now: number): Promise<BoardView>;
}

/** In-memory service for guest mode and tests. `storages` is exposed so tests can look inside. */
export function memorySoloService(rules: DailyRules): SoloService & { users: BookStorage; guilds: Map<string, BookStorage> } {
  const users = memoryBookStorage();
  const guilds = new Map<string, BookStorage>();
  const guildStore = (g: string) => {
    let s = guilds.get(g);
    if (!s) {
      s = memoryBookStorage();
      guilds.set(g, s);
    }
    return s;
  };
  const daily = new DailyBook(users, rules);
  return {
    users,
    guilds,
    dailyOpen: (user, now) => daily.open(user.id, now),
    dailyGuess: (user, word, now) => daily.guess(user.id, word, now),
    dailyHint: (user, now) => daily.hint(user.id, now),
    dailySolved: (guild, row, now) => new DailySolvers(guildStore(guild)).record(row, now),
    dailySolvers: (guild, now) => new DailySolvers(guildStore(guild)).view(now),
    mythRecord: (guild, results, now) => new ScoreBook(guildStore(guild), MYTH_BOOK_PREFIX).record(results, now),
    mythBoard: (guild, me, now) => new ScoreBook(guildStore(guild), MYTH_BOOK_PREFIX).view(guild, me, now),
  };
}
