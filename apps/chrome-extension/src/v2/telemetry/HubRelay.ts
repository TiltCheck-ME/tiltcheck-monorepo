/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-03 */

/**
 * Hub Telemetry Relay (v2)
 * 
 * Pushes round data to the canonical API telemetry hub.
 */

import { RoundData } from '../core/Sensor.js';
import { postRoundTelemetry } from '../../telemetry-client.js';

interface HubRelayStorageSnapshot {
  userData?: { id?: string };
  tiltguard_user_id?: string;
  discord_user_id?: string;
}

export class HubRelay {
  private userId: string | null = null;

  constructor() {
    this.loadUser();
  }

  private async loadUser(): Promise<void> {
    const data = await chrome.storage.local.get([
      'userData',
      'tiltguard_user_id',
      'discord_user_id',
    ]) as HubRelayStorageSnapshot;
    this.userId = data.userData?.id || data.tiltguard_user_id || data.discord_user_id || null;
  }

  async setUserId(id: string): Promise<void> {
    this.userId = id;
    await chrome.storage.local.set({
      discord_user_id: id,
      tiltguard_user_id: id,
    });
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
      const resp = await postRoundTelemetry({
        userId: this.userId,
        bet: round.bet,
        win: round.win,
      });

      if (!resp.ok) {
        throw new Error(`Hub Error: ${resp.status}`);
      }
    } catch (err) {
      console.error('[TiltCheck] Hub relay failed:', err);
    }
  }
}
