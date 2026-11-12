// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// LiveRegistry: one Durable Object (idFromName('global')) holding an anonymous summary per room.
// Rooms POST /report on change and on a heartbeat; GET /live?guild= reads counts. Entries older than
// LIVE_TTL_MS drop off. Nothing here identifies a person.

import { LiveBoard, parseLiveReport, type LiveEntry } from '../../src/shared/live.js';
import { isValidGuildId } from '../../src/shared/protocol.js';
import { alertsEnabled, emptyAlertState, evaluateAlerts, upgradeAlertState, type AlertConfig, type AlertState } from './alerts.js';

export interface RegistryEnv {
  /** Discord channel webhook for table alerts (secret). Unset = alerts off. */
  ALERT_WEBHOOK_URL?: string;
  /** Only rooms in this guild trigger alerts. */
  ALERT_GUILD_ID?: string;
}

const ALERTS_KEY = 'alerts';

export const LIVE_REGISTRY_NAME = 'global';
const STORAGE_KEY = 'entries';

export class LiveRegistry implements DurableObject {
  private readonly board = new LiveBoard();
  private loaded = false;
  private alerts: AlertState = emptyAlertState();
  private readonly alertConfig: AlertConfig;

  constructor(
    private readonly ctx: DurableObjectState,
    env: RegistryEnv,
    fetchImpl?: AlertConfig['fetch'],
  ) {
    this.alertConfig = { webhookUrl: env?.ALERT_WEBHOOK_URL, guildId: env?.ALERT_GUILD_ID, fetch: fetchImpl };
  }

  private async load(): Promise<void> {
    if (this.loaded) return;
    this.board.load(await this.ctx.storage.get<LiveEntry[]>(STORAGE_KEY));
    this.alerts = upgradeAlertState(await this.ctx.storage.get<Partial<AlertState>>(ALERTS_KEY));
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
      // Alerts run on the alarm so a room's save never waits on Discord.
      if (r.guildId && r.guildId === this.alertConfig.guildId && alertsEnabled(this.alertConfig)) {
        const at = await this.ctx.storage.getAlarm();
        if (at === null || at > now) await this.ctx.storage.setAlarm(now);
      }
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

  /** Table alerts pass: prune stale rooms, post / edit as needed, then sleep until the next check. */
  async alarm(): Promise<void> {
    await this.load();
    const now = Date.now();
    if (this.board.prune(now)) await this.ctx.storage.put(STORAGE_KEY, this.board.toJSON());
    const r = await evaluateAlerts(this.board.entries.values(), this.alerts, now, this.alertConfig);
    if (r.changed) await this.ctx.storage.put(ALERTS_KEY, this.alerts);
    if (r.wakeAt !== null) await this.ctx.storage.setAlarm(Math.max(r.wakeAt, now + 1_000));
  }
}
