// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// LiveRegistry: one Durable Object (idFromName('global')) holding an anonymous summary per room.
// Rooms POST /report on change and on a heartbeat; GET /live?guild= reads counts. Entries older than
// LIVE_TTL_MS drop off. Nothing here identifies a person.

import { LiveBoard, parseLiveReport, type LiveEntry } from '../../src/shared/live.js';
import { isValidGuildId } from '../../src/shared/protocol.js';

export const LIVE_REGISTRY_NAME = 'global';
const STORAGE_KEY = 'entries';

export class LiveRegistry implements DurableObject {
  private readonly board = new LiveBoard();
  private loaded = false;

  constructor(
    private readonly ctx: DurableObjectState,
    _env: unknown,
  ) {}

  private async load(): Promise<void> {
    if (this.loaded) return;
    this.board.load(await this.ctx.storage.get<LiveEntry[]>(STORAGE_KEY));
    this.loaded = true;
  }

  async fetch(req: Request): Promise<Response> {
    await this.load();
    const url = new URL(req.url);
    const now = Date.now();
    if (url.pathname === '/report' && req.method === 'POST') {
      let body: unknown;
      try {
        body = await req.json();
      } catch {
        return new Response('bad json', { status: 400 });
      }
      const r = parseLiveReport(body);
      if (!r) return new Response('bad report', { status: 400 });
      this.board.report(r, now);
      await this.ctx.storage.put(STORAGE_KEY, this.board.toJSON());
      return new Response(null, { status: 204 });
    }
    if (url.pathname === '/live' && req.method === 'GET') {
      const g = url.searchParams.get('guild');
      const guild = isValidGuildId(g) ? g : null;
      const pruned = this.board.prune(now);
      if (pruned) await this.ctx.storage.put(STORAGE_KEY, this.board.toJSON());
      return new Response(JSON.stringify(this.board.summary(guild, now)), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      });
    }
    return new Response('not found', { status: 404 });
  }
}
