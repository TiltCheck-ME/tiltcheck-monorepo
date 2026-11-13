// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// Table alerts: post to one Discord channel (through a channel webhook) when someone is waiting at
// a table in one server, so nobody sits at an empty table. Runs inside the LiveRegistry DO, which
// already sees every room's anonymous report.
//
// - Dormant unless ALERT_WEBHOOK_URL (secret) and ALERT_GUILD_ID (var) are both set.
// - Posts when a DA&D or Bluff table has someone seated and no game going, or someone is on the
//   Trivia screen with no game running. Only rooms whose guild is ALERT_GUILD_ID count.
// - Waits SETTLE_MS first: a room that empties inside that window never alerts.
// - At most one post per game per THROTTLE_MS.
// - When the game starts or the table empties, the alert is edited ("game on" / "closed") so a
//   stale post never baits anyone.
// - No names, no user ids, no mentions: allowed_mentions.parse is empty and the copy has no @.

import type { LiveEntry } from '../../src/shared/live.js';

export const SETTLE_MS = 20_000;
export const THROTTLE_MS = 10 * 60_000;
/** While an alert is open, re-check this often so rooms that vanish by TTL still close it. */
export const OPEN_RECHECK_MS = 60_000;

export type AlertGame = 'dad' | 'trivia' | 'bluff';
const GAMES: AlertGame[] = ['dad', 'trivia', 'bluff'];
const DAD_RUNNING = new Set(['submitting', 'judging', 'reveal']);
const BLUFF_RUNNING = new Set(['writing', 'guessing', 'reveal']);
const TRIVIA_RUNNING = new Set(['question', 'reveal']);

export const ALERT_COPY: Record<AlertGame, { open: string; on: string; closed: string }> = {
  dad: {
    open: "🃏 Someone's at the Degens Against Decency table. Pull up a chair: start the Tilt Check activity in voice.",
    on: "🃏 Degens Against Decency: table's full, game on. Catch the next one.",
    closed: '🃏 Degens Against Decency: table closed. Everyone wandered off to touch grass.',
  },
  trivia: {
    open: "🧠 Someone's waiting on Trivia. Ten questions, no host, no excuses: start the Tilt Check activity in voice.",
    on: '🧠 Trivia: game on. Late arrivals get in at the next question.',
    closed: '🧠 Trivia: lobby closed. Nobody waited around.',
  },
  bluff: {
    open: "🎭 Someone's at the Bluff table. Two truths, one lie, zero shame: start the Tilt Check activity in voice.",
    on: '🎭 Bluff: game on. Catch the next one.',
    closed: '🎭 Bluff: table closed. Nobody stuck around to lie.',
  },
};

export interface AlertGameState {
  /** When the waiting condition was first seen (cleared when it stops). */
  since: number | null;
  lastPostAt: number | null;
  messageId: string | null;
  status: 'none' | 'open' | 'on' | 'closed';
}

export type AlertState = Record<AlertGame, AlertGameState>;

export function emptyAlertState(): AlertState {
  const g = (): AlertGameState => ({ since: null, lastPostAt: null, messageId: null, status: 'none' });
  return { dad: g(), trivia: g(), bluff: g() };
}

/** Stored state from before a game existed gets an empty slot for it. */
export function upgradeAlertState(saved: Partial<AlertState> | undefined): AlertState {
  return { ...emptyAlertState(), ...(saved ?? {}) };
}

export interface AlertConfig {
  webhookUrl?: string;
  guildId?: string;
  fetch?: (input: string, init?: RequestInit) => Promise<Response>;
}

const WEBHOOK_RE = /^https:\/\/(?:(?:ptb|canary)\.)?discord(?:app)?\.com\/api(?:\/v\d+)?\/webhooks\/\d{5,25}\/[A-Za-z0-9_-]{20,200}$/;

/** Alerts are on only with a well-formed webhook URL and a guild id. Anything else = dormant. */
export function alertsEnabled(c: AlertConfig): boolean {
  return typeof c.webhookUrl === 'string' && WEBHOOK_RE.test(c.webhookUrl) && typeof c.guildId === 'string' && /^\d{5,25}$/.test(c.guildId);
}

/** Is anyone waiting at this game, and is a game of it running, across the guild's rooms? */
export function gameStatus(entries: Iterable<LiveEntry>, guildId: string, game: AlertGame): { waiting: boolean; running: boolean } {
  let waiting = false;
  let running = false;
  for (const e of entries) {
    if (e.guildId !== guildId || e.members <= 0) continue;
    if (game === 'dad') {
      const d = e.games.dad;
      if (d.count > 0 && DAD_RUNNING.has(d.phase)) running = true;
      else if (d.count > 0) waiting = true;
    } else if (game === 'bluff') {
      const b = e.games.bluff;
      if (!b) continue;
      if (b.count > 0 && BLUFF_RUNNING.has(b.phase)) running = true;
      else if (b.count > 0) waiting = true;
    } else {
      const t = e.games.trivia;
      if (TRIVIA_RUNNING.has(t.phase) && t.count > 0) running = true;
      else if ((t.waiting ?? 0) > 0) waiting = true;
    }
  }
  return { waiting, running };
}

function body(content: string): string {
  return JSON.stringify({ content, allowed_mentions: { parse: [] } });
}

/**
 * One pass over the guild's rooms. Mutates `state`. Returns whether state changed and when the
 * registry should wake to look again (null = nothing pending).
 */
export async function evaluateAlerts(
  entries: Iterable<LiveEntry>,
  state: AlertState,
  now: number,
  config: AlertConfig,
): Promise<{ changed: boolean; wakeAt: number | null }> {
  if (!alertsEnabled(config)) return { changed: false, wakeAt: null };
  const url = config.webhookUrl as string;
  const guildId = config.guildId as string;
  const doFetch = config.fetch ?? fetch;
  const list = [...entries];
  let changed = false;
  let wakeAt: number | null = null;
  const wake = (t: number) => {
    wakeAt = wakeAt === null ? t : Math.min(wakeAt, t);
  };

  for (const game of GAMES) {
    const g = state[game];
    const { waiting, running } = gameStatus(list, guildId, game);

    if (waiting && !running) {
      if (g.since === null) {
        g.since = now;
        changed = true;
      }
      if (g.status === 'open') {
        wake(now + OPEN_RECHECK_MS);
        continue;
      }
      const settleAt = g.since + SETTLE_MS;
      const throttleAt = g.lastPostAt === null ? 0 : g.lastPostAt + THROTTLE_MS;
      const readyAt = Math.max(settleAt, throttleAt);
      if (now < readyAt) {
        wake(readyAt);
        continue;
      }
      // Post. Counts against the throttle even if Discord says no, so a bad hook can't hammer it.
      g.lastPostAt = now;
      g.messageId = null;
      g.status = 'none';
      changed = true;
      try {
        const res = await doFetch(`${url}?wait=true`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body(ALERT_COPY[game].open) });
        if (res.ok) {
          const msg = (await res.json()) as { id?: unknown };
          g.messageId = typeof msg.id === 'string' && /^\d{5,25}$/.test(msg.id) ? msg.id : null;
          g.status = 'open';
          wake(now + OPEN_RECHECK_MS);
        }
      } catch {
        /* best effort */
      }
      continue;
    }

    // Nobody waiting (or a game is going): forget the pending start and close any open alert.
    if (g.since !== null) {
      g.since = null;
      changed = true;
    }
    if (g.status === 'open') {
      const next = running ? 'on' : 'closed';
      if (g.messageId) {
        try {
          await doFetch(`${url}/messages/${g.messageId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: body(ALERT_COPY[game][next]) });
        } catch {
          /* best effort */
        }
      }
      g.status = next;
      changed = true;
    }
  }
  return { changed, wakeAt };
}
