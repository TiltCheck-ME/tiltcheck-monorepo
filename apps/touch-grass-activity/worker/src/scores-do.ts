// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// TriviaScores: the SCORES Durable Object class (migration v3). One instance per Discord server
// (idFromName('guild:<id>')) holds that server's boards: trivia high scores (top 10 all time and this
// week, Monday 00:00 America/Chicago, plus personal bests), Daily Grass "Today's solvers" and the
// Myth or Math week, each under its own storage keys. Daily Grass boards and stats live in one
// instance per player (idFromName('daily-user:<id>')) so a player gets one board a day wherever
// they open it. Same class, new instance names and keys: no new class, no migration.
//
// Internal routes, reached only through a DO stub, never from the public internet:
//   POST /record  {guild, results}          trivia: from a TouchGrassRoom that ran a game to the end
//   GET  /board?guild=&me=                  trivia: for GET /api/trivia/scores (token already checked)
//   POST /daily/open  {user}                per-player instance: today's board (made on first open)
//   POST /daily/guess {user, word}          per-player instance: server-checked guess, colors back
//   POST /daily/solved {guild, row}         server instance: a solve for Today's solvers
//   GET  /daily/solvers?guild=              server instance
//   POST /myth/record {guild, results}      server instance: a finished Myth or Math run
//   GET  /myth/board?guild=&me=             server instance
// The public worker never forwards a client body to any of these: scores and boards only come
// from a room's own game state.

import { ScoreBook, validFinished, type FinishedScore } from '../../src/shared/scores.js';
import { isValidGuildId } from '../../src/shared/protocol.js';
import { DailyBook, DailySolvers, validSolver } from '../../src/shared/daily.js';
import { DAILY_ANSWERS, isValidGuess } from '../../src/shared/dailyWords.js';
import { MYTH_BOOK_PREFIX } from '../../src/shared/solo.js';

export function scoresName(guildId: string): string {
  return `guild:${guildId}`;
}

/** The per-player instance for Daily Grass boards and stats. */
export function dailyUserName(userId: string): string {
  return `daily-user:${userId}`;
}

export interface ScoresEnv {
  /** Secret salt for the daily word pick. Unset = Daily Grass answers 503 not-configured. */
  DAILY_SALT?: string;
}

const USER_ID = /^[A-Za-z0-9_-]{1,64}$/;

export class TriviaScores implements DurableObject {
  private readonly book: ScoreBook;
  private readonly myth: ScoreBook;
  private readonly solvers: DailySolvers;
  private readonly daily: DailyBook | null;

  constructor(
    private readonly ctx: DurableObjectState,
    env: ScoresEnv | undefined,
  ) {
    const storage = {
      get: <T,>(k: string) => ctx.storage.get<T>(k),
      put: <T,>(k: string, v: T) => ctx.storage.put(k, v),
    };
    this.book = new ScoreBook(storage);
    this.myth = new ScoreBook(storage, MYTH_BOOK_PREFIX);
    this.solvers = new DailySolvers(storage);
    const salt = env?.DAILY_SALT;
    this.daily = salt ? new DailyBook(storage, { salt, answers: DAILY_ANSWERS, isValid: isValidGuess }) : null;
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const now = Date.now();
    const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
    const body = async (): Promise<Record<string, unknown> | null> => {
      try {
        const b = (await req.json()) as unknown;
        return b && typeof b === 'object' ? (b as Record<string, unknown>) : null;
      } catch {
        return null;
      }
    };

    if (url.pathname === '/record' && req.method === 'POST') {
      const b = await body();
      if (!b) return json({ error: 'bad-json' }, 400);
      if (!isValidGuildId(b.guild as string) || !Array.isArray(b.results) || b.results.length > 64) return json({ error: 'bad-record' }, 400);
      const results = b.results.map(validFinished).filter((x): x is FinishedScore => x !== null);
      return json({ ok: true, brags: await this.book.record(results, now) });
    }

    if (url.pathname === '/board' && req.method === 'GET') {
      const guild = url.searchParams.get('guild');
      if (!isValidGuildId(guild)) return json({ error: 'bad-guild' }, 400);
      return json(await this.book.view(guild, url.searchParams.get('me'), now));
    }

    if ((url.pathname === '/daily/open' || url.pathname === '/daily/guess') && req.method === 'POST') {
      if (!this.daily) return json({ error: 'not-configured' }, 503);
      const b = await body();
      const user = typeof b?.user === 'string' && USER_ID.test(b.user) ? b.user : null;
      if (!user) return json({ error: 'bad-user' }, 400);
      if (url.pathname === '/daily/open') return json(await this.daily.open(user, now));
      if (typeof b?.word !== 'string') return json({ error: 'bad-word' }, 400);
      return json(await this.daily.guess(user, b.word, now));
    }

    if (url.pathname === '/daily/solved' && req.method === 'POST') {
      const b = await body();
      const row = validSolver(b?.row);
      if (!isValidGuildId(b?.guild as string) || !row) return json({ error: 'bad-record' }, 400);
      return json({ ok: true, rank: await this.solvers.record(row, now) });
    }

    if (url.pathname === '/daily/solvers' && req.method === 'GET') {
      if (!isValidGuildId(url.searchParams.get('guild'))) return json({ error: 'bad-guild' }, 400);
      return json({ ok: true, ...(await this.solvers.view(now)) });
    }

    if (url.pathname === '/myth/record' && req.method === 'POST') {
      const b = await body();
      if (!b || !isValidGuildId(b.guild as string) || !Array.isArray(b.results) || b.results.length > 64) return json({ error: 'bad-record' }, 400);
      const results = b.results.map(validFinished).filter((x): x is FinishedScore => x !== null);
      return json({ ok: true, brags: await this.myth.record(results, now) });
    }

    if (url.pathname === '/myth/board' && req.method === 'GET') {
      const guild = url.searchParams.get('guild');
      if (!isValidGuildId(guild)) return json({ error: 'bad-guild' }, 400);
      return json(await this.myth.view(guild, url.searchParams.get('me'), now));
    }

    return json({ error: 'not-found' }, 404);
  }
}
