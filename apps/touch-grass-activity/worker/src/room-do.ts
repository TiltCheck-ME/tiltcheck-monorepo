// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// Durable Object: one per room key (g-<guild>-c-<channel> in a server channel, else the Discord
// Activity instanceId; the worker resolves it). The 'instanceId' below is that room key. Uses the WebSocket Hibernation API
// so idle rooms cost nothing while sockets stay open.

import { RoomHost, type HostSocket } from './host.js';
import { verifyToken, type AuthEnv } from './auth.js';
import type { RoomUser } from '../../src/shared/protocol.js';
import { LIVE_REGISTRY_NAME } from './registry-do.js';
import { scoresName } from './scores-do.js';
import type { Brag } from '../../src/shared/scores.js';

export interface RoomEnv extends AuthEnv {
  /** Singleton live-tables registry. Optional so an older deploy without the binding keeps working. */
  LIVE?: DurableObjectNamespace;
  /** Per-server trivia high scores (migration v3). Optional: without it games just aren't recorded. */
  SCORES?: DurableObjectNamespace;
}

interface SocketAttachment {
  instanceId: string;
  user: RoomUser | null;
}

function wrap(ws: WebSocket): HostSocket {
  const att = (ws.deserializeAttachment() as SocketAttachment | null) ?? { instanceId: '', user: null };
  return {
    user: att.user,
    send: (msg) => ws.send(msg),
    close: (code, reason) => ws.close(code, reason),
    setUser(user) {
      this.user = user;
      ws.serializeAttachment({ ...att, user } satisfies SocketAttachment);
    },
  };
}

export class TouchGrassRoom implements DurableObject {
  private readonly host: RoomHost;
  private instanceId = '';
  private readonly wrapped = new WeakMap<WebSocket, HostSocket>();

  constructor(
    private readonly ctx: DurableObjectState,
    env: RoomEnv,
  ) {
    this.host = new RoomHost({
      storage: {
        get: (k) => ctx.storage.get(k),
        put: (k, v) => ctx.storage.put(k, v),
      },
      sockets: () => ctx.getWebSockets().map((ws) => this.socketFor(ws)),
      verify: (token) => verifyToken(token, env),
      setWake: async (at) => {
        if (at === null) await ctx.storage.deleteAlarm();
        else await ctx.storage.setAlarm(at);
      },
      report: async (r) => {
        if (!env.LIVE) return;
        const stub = env.LIVE.get(env.LIVE.idFromName(LIVE_REGISTRY_NAME));
        await stub.fetch('https://live.internal/report', { method: 'POST', body: JSON.stringify(r), headers: { 'Content-Type': 'application/json' } });
      },
      postScores: env.SCORES
        ? async (guild, results) => {
            const ns = env.SCORES as DurableObjectNamespace;
            const stub = ns.get(ns.idFromName(scoresName(guild)));
            const res = await stub.fetch('https://scores.internal/record', {
              method: 'POST',
              body: JSON.stringify({ guild, results }),
              headers: { 'Content-Type': 'application/json' },
            });
            if (!res.ok) throw new Error(`scores ${res.status}`);
            return ((await res.json()) as { brags: Record<string, Brag> }).brags;
          }
        : undefined,
    });
  }

  private socketFor(ws: WebSocket): HostSocket {
    let s = this.wrapped.get(ws);
    if (!s) {
      s = wrap(ws);
      this.wrapped.set(ws, s);
    }
    return s;
  }

  private async instance(fromUrl?: URL): Promise<string> {
    const fromQuery = fromUrl?.searchParams.get('instanceId');
    if (fromQuery) {
      this.instanceId = fromQuery;
      await this.ctx.storage.put('instanceId', fromQuery);
    }
    if (!this.instanceId) this.instanceId = (await this.ctx.storage.get<string>('instanceId')) ?? 'unknown';
    return this.instanceId;
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const instanceId = await this.instance(url);
    const op = url.pathname.slice(1);
    await this.host.setGuild(instanceId, url.searchParams.get('guild'));

    if (op === 'ws') {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair) as [WebSocket, WebSocket];
      this.ctx.acceptWebSocket(server);
      server.serializeAttachment({ instanceId, user: null } satisfies SocketAttachment);
      return new Response(null, { status: 101, webSocket: client });
    }

    const userHeader = req.headers.get('x-tg-user');
    if (!userHeader) return new Response('unauthorized', { status: 401 });
    const user = JSON.parse(userHeader) as RoomUser;

    const r = op === 'state' ? await this.host.pollState(instanceId, user) : await this.host.pollAction(instanceId, user, await req.text());
    return new Response(JSON.stringify(r.body), { status: r.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    await this.host.onMessage(await this.instance(), this.socketFor(ws), message);
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    await this.host.onClose(await this.instance(), this.socketFor(ws));
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.host.onClose(await this.instance(), this.socketFor(ws));
  }

  async alarm(): Promise<void> {
    await this.host.onAlarm(await this.instance());
  }
}
