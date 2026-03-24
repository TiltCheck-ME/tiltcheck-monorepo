/* © 2026 TiltCheck Ecosystem. All Rights Reserved. */

/**
 * Hub Telemetry Relay (v2)
 * 
 * Pushes round data to the Cloudflare Hub for Discord Activity consumption.
 */

import { RoundData } from '../core/Sensor.js';

export class HubRelay {
  private hubUrl = 'https://hub.tiltcheck.me';
  private userId: string | null = null;

  constructor() {
    this.loadUser();
  }

  private async loadUser(): Promise<void> {
    const data = await chrome.storage.local.get(['discord_user_id']);
    this.userId = data.discord_user_id || null;
  }

  async setUserId(id: string): Promise<void> {
    this.userId = id;
    await chrome.storage.local.set({ discord_user_id: id });
  }

  getUserId(): string | null {
    return this.userId;
  }

  async pushRound(round: RoundData): Promise<void> {
    if (!this.userId) {
      console.warn('[TiltCheck] Telemetry deferred: No userId linked.');
      return;
    }

    try {
      const resp = await fetch(`${this.hubUrl}/telemetry/round`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: this.userId,
          bet: round.bet,
          win: round.win
        })
      });

      if (!resp.ok) {
        throw new Error(`Hub Error: ${resp.status}`);
      }
    } catch (err) {
      console.error('[TiltCheck] Hub relay failed:', err);
    }
  }
}
