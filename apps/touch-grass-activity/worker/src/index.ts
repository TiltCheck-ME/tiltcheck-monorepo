// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// Touch Grass Activity worker. Code only: NOT deployed, NOT bound to any existing worker.
//
// Routes (Discord proxies <app>.discordsays.com/api/* here through a URL Mapping):
//   POST /api/activity/token          {code} -> {access_token}
//   GET  /api/room/:instanceId/ws     WebSocket, first frame {t:'auth', token}
//   GET  /api/room/:instanceId/state  polling fallback, Authorization: Bearer <token>
//   POST /api/room/:instanceId/action polling fallback, Authorization: Bearer <token>
//   GET  /api/live?guild=<id>         anonymous live-tables counts (CORS: tiltcheck.me, chrome-extension://)
//   GET  /api/health
// The /api prefix is optional so either mapping style works (see README).

import { exchangeCode, verifyToken, type AuthEnv } from './auth.js';
import { isValidGuildId, isValidInstanceId } from '../../src/shared/protocol.js';
import { RateLimiter } from '../../src/shared/room.js';
import { LIVE_REGISTRY_NAME } from './registry-do.js';
export { TouchGrassRoom } from './room-do.js';
export { LiveRegistry } from './registry-do.js';

export interface Env extends AuthEnv {
  ROOMS: DurableObjectNamespace;
  /** Singleton live-tables registry (migration v2). */
  LIVE?: DurableObjectNamespace;
  /** Comma separated origins allowed for CORS in local dev. Discord traffic is same-origin via the proxy. */
  DEV_ORIGINS?: string;
}

// Per-isolate limiter for the token endpoint. Isolates come and go, so this is a speed bump, not a wall.
const tokenLimiter = new RateLimiter(5, 0.2);
// Light per-isolate limit for the public live-tables read: 20 burst, 1 per second.
const liveLimiter = new RateLimiter(20, 1);

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

  const m = path.match(/^\/room\/([^/]+)\/(ws|state|action)$/);
  if (m) {
    const instanceId = decodeURIComponent(m[1] as string);
    const op = m[2] as 'ws' | 'state' | 'action';
    if (!isValidInstanceId(instanceId)) return json({ error: 'bad-instance' }, 400, cors);
    const stub = env.ROOMS.get(env.ROOMS.idFromName(instanceId));
    const inner = new URL(`https://room.internal/${op}`);
    inner.searchParams.set('instanceId', instanceId);
    const guild = url.searchParams.get('guild');
    if (isValidGuildId(guild)) inner.searchParams.set('guild', guild);

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
