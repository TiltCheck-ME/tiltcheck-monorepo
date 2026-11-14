// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-13
// Touch Grass Activity worker. Code only: NOT deployed, NOT bound to any existing worker.
//
// Routes (Discord proxies <app>.discordsays.com/api/* here through a URL Mapping):
//   POST /api/activity/token          {code} -> {access_token}
//   GET  /api/room/:roomId/ws     WebSocket, first frame {t:'auth', token}
//   GET  /api/room/:roomId/state  polling fallback, Authorization: Bearer <token>
//   POST /api/room/:roomId/action polling fallback, Authorization: Bearer <token>
//   :roomId is g-<guild>-c-<channel> for a server channel (with ?instance=<Discord instance id>
//   naming the same guild), otherwise the Discord instance id as before.
//   GET  /api/live?guild=<id>         anonymous live-tables counts (CORS: tiltcheck.me, chrome-extension://)
//   GET  /api/trivia/scores?guild=<id> that server's trivia high scores, Authorization: Bearer <token>
//   GET  /api/social?guild=<id>&instance=<id>   Hot Takes + Story Chain for that server, Bearer token
//   POST /api/social?guild=<id>&instance=<id>   {op, ...} one Hot Takes / Story Chain action, Bearer token
//   GET  /api/health
// The /api prefix is optional so either mapping style works (see README).

import { exchangeCode, verifyToken, type AuthEnv } from './auth.js';
import { guildForInstance, isValidGuildId, isValidInstanceId, resolveRoom } from '../../src/shared/protocol.js';
import { isMod, type ModEnv } from './mods.js';
import { RateLimiter } from '../../src/shared/room.js';
import { LIVE_REGISTRY_NAME, type RegistryEnv } from './registry-do.js';
import { scoresName, type ScoresEnv } from './scores-do.js';
export { TouchGrassRoom } from './room-do.js';
export { LiveRegistry } from './registry-do.js';
export { TriviaScores } from './scores-do.js';

export interface Env extends AuthEnv, RegistryEnv, ScoresEnv, ModEnv {
  ROOMS: DurableObjectNamespace;
  /** Singleton live-tables registry (migration v2). */
  LIVE?: DurableObjectNamespace;
  /** Per-server trivia high scores (migration v3). */
  SCORES?: DurableObjectNamespace;
  /** Comma separated origins allowed for CORS in local dev. Discord traffic is same-origin via the proxy. */
  DEV_ORIGINS?: string;
}

// Per-isolate limiter for the token endpoint. Isolates come and go, so this is a speed bump, not a wall.
const tokenLimiter = new RateLimiter(5, 0.2);
// Light per-isolate limit for the public live-tables read: 20 burst, 1 per second.
const liveLimiter = new RateLimiter(20, 1);
// Per-user limit for the high-score read: 10 burst, 1 every 2 seconds.
const scoresLimiter = new RateLimiter(10, 0.5);
// Hot Takes / Story Chain: reads 10 burst, 1 every 2 s; writes 6 burst, 1 every 3 s, per user.
const socialReadLimiter = new RateLimiter(10, 0.5);
const socialWriteLimiter = new RateLimiter(6, 1 / 3);

/**
 * Which server a Hot Takes / Story Chain call is for. The instance id wins when it names a guild
 * (i-<n>-gc-<guild>-<n>); a DM instance (-pc-) has none. Only an instance id of another shape (or
 * none, local dev) falls back to the client's ?guild. A client ?guild that disagrees with the
 * instance id is refused.
 */
export function socialGuild(instance: string | null, clientGuild: string | null): { ok: true; guild: string | null } | { ok: false } {
  if (instance !== null && instance !== '' && !isValidInstanceId(instance)) return { ok: false };
  const guild = guildForInstance(instance ?? '', clientGuild);
  if (guild && clientGuild && isValidGuildId(clientGuild) && clientGuild !== guild) return { ok: false };
  return { ok: true, guild };
}

/** Origins allowed to read /api/live from a browser: tiltcheck.me (and subdomains) and any extension. */
export function isLiveOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (/^chrome-extension:\/\/[a-p]{32}$/.test(origin)) return true;
  return /^https:\/\/([a-z0-9-]+\.)*tiltcheck\.me$/.test(origin);
}

function liveCors(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin');
  if (!isLiveOrigin(origin)) return {};
  return { 'Access-Control-Allow-Origin': origin as string, 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Max-Age': '600', Vary: 'Origin' };
}

export function normalizePath(pathname: string): string {
  let p = pathname;
  if (p.startsWith('/.proxy/')) p = p.slice('/.proxy'.length);
  if (p === '/api' || p.startsWith('/api/')) p = p.slice('/api'.length) || '/';
  return p;
}

function json(body: unknown, status = 200, extra: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extra },
  });
}

function corsHeaders(req: Request, env: Env): Record<string, string> {
  const origin = req.headers.get('Origin');
  const allowed = (env.DEV_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (origin && allowed.includes(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      Vary: 'Origin',
    };
  }
  return {};
}

function bearer(req: Request): string | null {
  const h = req.headers.get('Authorization') ?? '';
  return h.startsWith('Bearer ') ? h.slice(7).trim() : null;
}

export async function handleRequest(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const path = normalizePath(url.pathname);
  if (path === '/live') {
    const lc = liveCors(req);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: lc });
    if (req.method !== 'GET') return json({ error: 'method-not-allowed' }, 405, lc);
    const ip = req.headers.get('CF-Connecting-IP') ?? 'unknown';
    if (!liveLimiter.take(ip, Date.now())) return json({ error: 'rate-limited' }, 429, { ...lc, 'Retry-After': '5' });
    const guild = url.searchParams.get('guild');
    if (guild !== null && guild !== '' && !isValidGuildId(guild)) return json({ error: 'bad-guild' }, 400, lc);
    if (!env.LIVE) return json({ error: 'not-configured' }, 503, lc);
    const stub = env.LIVE.get(env.LIVE.idFromName(LIVE_REGISTRY_NAME));
    const inner = new URL('https://live.internal/live');
    if (guild) inner.searchParams.set('guild', guild);
    const res = await stub.fetch(inner.toString());
    return new Response(res.body, { status: res.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...lc } });
  }

  const cors = corsHeaders(req, env);

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

  if (path === '/health') return json({ ok: true, service: 'touch-grass-activity' }, 200, cors);

  if (path === '/activity/token') {
    if (req.method !== 'POST') return json({ error: 'method-not-allowed' }, 405, cors);
    const ip = req.headers.get('CF-Connecting-IP') ?? 'unknown';
    if (!tokenLimiter.take(ip, Date.now())) return json({ error: 'rate-limited' }, 429, cors);
    let code: unknown;
    try {
      const body = (await req.json()) as { code?: unknown };
      code = body.code;
    } catch {
      return json({ error: 'bad-json' }, 400, cors);
    }
    if (typeof code !== 'string') return json({ error: 'bad-code' }, 400, cors);
    const r = await exchangeCode(code, env);
    return json(r.body, r.status, cors);
  }

  if (path === '/trivia/scores') {
    // Read only. Scores get onto a board only from a room that ran the game to the end.
    if (req.method !== 'GET') return json({ error: 'method-not-allowed' }, 405, { ...cors, Allow: 'GET' });
    const token = bearer(req);
    const user = token ? await verifyToken(token, env) : null;
    if (!user) return json({ t: 'error', code: 'unauthorized', message: 'Discord sign-in did not check out.' }, 401, cors);
    if (!scoresLimiter.take(user.id, Date.now())) return json({ error: 'rate-limited' }, 429, { ...cors, 'Retry-After': '5' });
    const guild = url.searchParams.get('guild');
    if (!isValidGuildId(guild)) return json({ error: 'bad-guild' }, 400, cors);
    if (!env.SCORES) return json({ error: 'not-configured' }, 503, cors);
    const stub = env.SCORES.get(env.SCORES.idFromName(scoresName(guild)));
    const inner = new URL('https://scores.internal/board');
    inner.searchParams.set('guild', guild);
    inner.searchParams.set('me', user.id);
    const res = await stub.fetch(inner.toString());
    return new Response(res.body, { status: res.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors } });
  }

  if (path === '/social') {
    if (req.method !== 'GET' && req.method !== 'POST') return json({ error: 'method-not-allowed' }, 405, { ...cors, Allow: 'GET, POST' });
    const token = bearer(req);
    const user = token ? await verifyToken(token, env) : null;
    if (!user) return json({ t: 'error', code: 'unauthorized', message: 'Discord sign-in did not check out.' }, 401, cors);
    const limiter = req.method === 'GET' ? socialReadLimiter : socialWriteLimiter;
    if (!limiter.take(user.id, Date.now())) return json({ error: 'rate-limited' }, 429, { ...cors, 'Retry-After': '5' });
    const g = socialGuild(url.searchParams.get('instance'), url.searchParams.get('guild'));
    if (!g.ok) return json({ error: 'bad-guild' }, 400, cors);
    if (!g.guild) return json({ error: 'no-server' }, 404, cors);
    if (!env.SCORES) return json({ error: 'not-configured' }, 503, cors);
    let op: unknown = undefined;
    if (req.method === 'POST') {
      const raw = await req.text();
      if (raw.length > 4096) return json({ error: 'too-large' }, 413, cors);
      try {
        op = JSON.parse(raw) as unknown;
      } catch {
        return json({ error: 'bad-json' }, 400, cors);
      }
    }
    const mod = await isMod(user.id, g.guild, env);
    const stub = env.SCORES.get(env.SCORES.idFromName(scoresName(g.guild)));
    const inner = `https://scores.internal/social/${req.method === 'GET' ? 'view' : 'act'}`;
    const res = await stub.fetch(inner, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guild: g.guild, user: { id: user.id, name: user.name }, mod, op }),
    });
    return new Response(res.body, { status: res.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors } });
  }

  const m = path.match(/^\/room\/([^/]+)\/(ws|state|action)$/);
  if (m) {
    let pathId: string;
    try {
      pathId = decodeURIComponent(m[1] as string);
    } catch {
      return json({ error: 'bad-instance' }, 400, cors);
    }
    const op = m[2] as 'ws' | 'state' | 'action';
    // Channel rooms (g-<guild>-c-<channel>) need ?instance=<Discord instance id> naming the same
    // guild; instance-id rooms work as before. See resolveRoom in src/shared/protocol.ts.
    const resolved = resolveRoom(pathId, url.searchParams.get('instance'), url.searchParams.get('guild'));
    if (!resolved.ok) return json({ error: resolved.error }, resolved.status, cors);
    const roomKey = resolved.roomKey;
    const stub = env.ROOMS.get(env.ROOMS.idFromName(roomKey));
    const inner = new URL(`https://room.internal/${op}`);
    inner.searchParams.set('instanceId', roomKey);
    // The guild comes from the instance id (or the checked channel key) when it can; that beats the client's word.
    if (resolved.guild) inner.searchParams.set('guild', resolved.guild);

    if (op === 'ws') {
      if (req.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return json({ error: 'expected-websocket' }, 426, cors);
      return stub.fetch(new Request(inner.toString(), req));
    }

    const token = bearer(req);
    const user = token ? await verifyToken(token, env) : null;
    if (!user) return json({ t: 'error', code: 'unauthorized', message: 'Discord sign-in did not check out.' }, 401, cors);

    if (op === 'state' && req.method !== 'GET') return json({ error: 'method-not-allowed' }, 405, cors);
    if (op === 'action' && req.method !== 'POST') return json({ error: 'method-not-allowed' }, 405, cors);

    const res = await stub.fetch(inner.toString(), {
      method: req.method,
      headers: { 'x-tg-user': JSON.stringify(user), 'Content-Type': 'application/json' },
      body: op === 'action' ? await req.text() : undefined,
    });
    return new Response(res.body, { status: res.status, headers: { ...Object.fromEntries(res.headers), ...cors } });
  }

  return json({ error: 'not-found' }, 404, cors);
}

export default {
  fetch(req: Request, env: Env): Promise<Response> {
    return handleRequest(req, env);
  },
} satisfies ExportedHandler<Env>;
