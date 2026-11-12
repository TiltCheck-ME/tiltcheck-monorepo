// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// TriviaScores: one Durable Object per Discord server (idFromName('guild:<id>')), migration v3.
// Holds that server's trivia high scores: top 10 all time, top 10 this week (Monday 00:00
// America/Chicago), and each player's personal best.
//
// Internal routes, reached only through a DO stub, never from the public internet:
//   POST /record  {guild, results}   from a TouchGrassRoom that just ran a game to the end
//   GET  /board?guild=&me=           for GET /api/trivia/scores (the worker already checked the token)
// The public worker never forwards a client body to /record: there is no way to hand in a score.

import { ScoreBook, validFinished, type FinishedScore } from '../../src/shared/scores.js';
import { isValidGuildId } from '../../src/shared/protocol.js';

export function scoresName(guildId: string): string {
  return `guild:${guildId}`;
}

export class TriviaScores implements DurableObject {
  private readonly book: ScoreBook;

  constructor(
    private readonly ctx: DurableObjectState,
    _env: unknown,
  ) {
    this.book = new ScoreBook({
      get: (k) => ctx.storage.get(k),
      put: (k, v) => ctx.storage.put(k, v),
    });
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const now = Date.now();
    const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

    if (url.pathname === '/record' && req.method === 'POST') {
      let body: { guild?: unknown; results?: unknown };
      try {
        body = (await req.json()) as typeof body;
      } catch {
        return json({ error: 'bad-json' }, 400);
      }
      if (!isValidGuildId(body.guild as string) || !Array.isArray(body.results) || body.results.length > 64) return json({ error: 'bad-record' }, 400);
      const results = body.results.map(validFinished).filter((x): x is FinishedScore => x !== null);
      return json({ ok: true, brags: await this.book.record(results, now) });
    }

    if (url.pathname === '/board' && req.method === 'GET') {
      const guild = url.searchParams.get('guild');
      if (!isValidGuildId(guild)) return json({ error: 'bad-guild' }, 400);
      return json(await this.book.view(guild, url.searchParams.get('me'), now));
    }

    return json({ error: 'not-found' }, 404);
  }
}
