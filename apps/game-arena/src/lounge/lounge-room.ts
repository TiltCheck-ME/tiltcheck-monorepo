/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-28 */

import {
  sanitizeAwayMessage,
  sanitizeChatText,
  sanitizeGameTitle,
} from './sanitize.js';

export type LoungeStatus = 'online' | 'away' | 'idle';

export type LoungePresence = {
  userId: string;
  username: string;
  status: LoungeStatus;
  awayMessage: string | null;
  gameTitle: string | null;
  lastActive: number;
};

export type LoungeMessage = {
  id: string;
  userId: string;
  username: string;
  text: string;
  timestamp: number;
};

export type LoungeReport = {
  reporterId: string;
  targetId: string;
  reason: string;
  timestamp: number;
};

export type LoungeSnapshot = {
  tagline: string;
  messages: LoungeMessage[];
  presence: LoungePresence[];
};

const RATE_WINDOW_MS = 10_000;
const RATE_MAX = 5;
const IDLE_AFTER_MS = 5 * 60_000;
const AWAY_AFTER_MS = 15 * 60_000;
const MAX_MESSAGES = 200;

export const LOUNGE_TAGLINE = 'Show receipts or touch grass.';

export class LoungeRoom {
  private messages: LoungeMessage[] = [];
  private presence = new Map<string, LoungePresence>();
  private mutes = new Set<string>();
  private reports: LoungeReport[] = [];
  private sendTimes = new Map<string, number[]>();
  private seq = 0;
  private readonly now: () => number;
  private readonly moderatorIds: Set<string>;

  constructor(opts?: { now?: () => number; moderatorIds?: string[] }) {
    this.now = opts?.now ?? Date.now;
    this.moderatorIds = new Set(opts?.moderatorIds ?? []);
  }

  snapshot(): LoungeSnapshot {
    this.tickIdle();
    return {
      tagline: LOUNGE_TAGLINE,
      messages: [...this.messages],
      presence: [...this.presence.values()].map((row) => ({ ...row })),
    };
  }

  join(input: {
    userId: string;
    username: string;
    gameTitle?: string | null;
    status?: LoungeStatus;
    awayMessage?: string | null;
  }): LoungePresence {
    const userId = input.userId.trim().slice(0, 64);
    const username = input.username.replace(/\s+/g, ' ').trim().slice(0, 32) || 'degen';
    const now = this.now();
    const existing = this.presence.get(userId);
    const row: LoungePresence = {
      userId,
      username,
      status: input.status ?? existing?.status ?? 'online',
      awayMessage: sanitizeAwayMessage(input.awayMessage ?? existing?.awayMessage),
      gameTitle: sanitizeGameTitle(input.gameTitle ?? existing?.gameTitle),
      lastActive: now,
    };
    this.presence.set(userId, row);
    return { ...row };
  }

  leave(userId: string): void {
    this.presence.delete(userId);
  }

  setPresence(input: {
    userId: string;
    status?: LoungeStatus;
    awayMessage?: string | null;
    gameTitle?: string | null;
  }): LoungePresence | null {
    const row = this.presence.get(input.userId);
    if (!row) return null;
    if (input.status) row.status = input.status;
    if (input.awayMessage !== undefined) row.awayMessage = sanitizeAwayMessage(input.awayMessage);
    if (input.gameTitle !== undefined) row.gameTitle = sanitizeGameTitle(input.gameTitle);
    row.lastActive = this.now();
    return { ...row };
  }

  post(userId: string, username: string, raw: string): { ok: true; message: LoungeMessage } | { ok: false; reason: string } {
    if (this.mutes.has(userId)) {
      return { ok: false, reason: 'muted' };
    }
    if (!this.allowSend(userId)) {
      return { ok: false, reason: 'slow down' };
    }
    const cleaned = sanitizeChatText(raw);
    if (!cleaned.ok) {
      return { ok: false, reason: cleaned.reason };
    }
    this.join({ userId, username });
    const message: LoungeMessage = {
      id: `m${++this.seq}`,
      userId,
      username: username.replace(/\s+/g, ' ').trim().slice(0, 32) || 'degen',
      text: cleaned.text,
      timestamp: this.now(),
    };
    this.messages.push(message);
    if (this.messages.length > MAX_MESSAGES) {
      this.messages.shift();
    }
    return { ok: true, message };
  }

  report(reporterId: string, targetId: string, reason: string): LoungeReport | { ok: false; reason: string } {
    if (!reporterId || !targetId || reporterId === targetId) {
      return { ok: false, reason: 'bad report' };
    }
    const cleaned = sanitizeChatText(reason);
    const row: LoungeReport = {
      reporterId,
      targetId,
      reason: cleaned.ok ? cleaned.text : 'no receipts',
      timestamp: this.now(),
    };
    this.reports.push(row);
    return row;
  }

  mute(moderatorId: string, targetId: string): { ok: true } | { ok: false; reason: string } {
    if (this.moderatorIds.size > 0 && !this.moderatorIds.has(moderatorId)) {
      return { ok: false, reason: 'not a mod' };
    }
    if (!targetId || moderatorId === targetId) {
      return { ok: false, reason: 'bad mute' };
    }
    this.mutes.add(targetId);
    return { ok: true };
  }

  isMuted(userId: string): boolean {
    return this.mutes.has(userId);
  }

  reportsFor(targetId: string): LoungeReport[] {
    return this.reports.filter((row) => row.targetId === targetId);
  }

  private allowSend(userId: string): boolean {
    const now = this.now();
    const times = (this.sendTimes.get(userId) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
    if (times.length >= RATE_MAX) {
      this.sendTimes.set(userId, times);
      return false;
    }
    times.push(now);
    this.sendTimes.set(userId, times);
    return true;
  }

  private tickIdle(): void {
    const now = this.now();
    for (const row of this.presence.values()) {
      if (row.status === 'away' && row.awayMessage) continue;
      const idleFor = now - row.lastActive;
      if (idleFor >= AWAY_AFTER_MS) row.status = 'away';
      else if (idleFor >= IDLE_AFTER_MS) row.status = 'idle';
    }
  }
}

export const loungeRoom = new LoungeRoom({
  moderatorIds: (process.env.LOUNGE_MOD_USER_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean),
});
