// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-06
/**
 * Tilt Events Handler
 *
 * Subscribes to tilt.detected events from @tiltcheck/tiltcheck-core
 * and forwards them to the backend API for persistent storage.
 */

import { eventRouter } from '@tiltcheck/event-router';
import type { TiltCheckEvent } from '@tiltcheck/event-router';
import { trackTiltDetected } from '../services/elastic-telemetry.js';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

interface StoreTiltEventResponse {
  success: boolean;
  id?: string;
}

interface TiltHistoryResponse {
  events: TiltEvent[];
}

interface TiltEvent {
  userId: string;
  timestamp: string;
  signals: string[];
  tiltScore: number;
  context: string;
}

interface TiltStatsResponse {
  userId: string;
  totalEvents: number;
  avgTiltScore: number;
  averageTiltScore?: number;
  maxTiltScore?: number;
  eventsLast24h?: number;
  eventsLast7d?: number;
  lastDetectedAt?: string;
  lastEventAt?: string;
}

/**
 * Initialize tilt events handler
 * Should be called in bot startup (index.ts)
 */
export function initializeTiltEventsHandler(): void {
  // Subscribe to tilt.detected events from tiltcheck-core
  eventRouter.subscribe(
    'tilt.detected',
    async (event: TiltCheckEvent<'tilt.detected'>) => {
      try {
        const tiltData = event.data;

        // Forward to backend for storage
        const response = await fetch(`${BACKEND_URL}/api/tilt/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: tiltData.userId,
            timestamp: tiltData.sessionMetrics?.timeInSession ?? Date.now(),
            signals: tiltData.indicators || [],
            tiltScore: tiltData.tiltScore,
            context: 'discord-dm',
          }),
        });

        if (!response.ok) {
          console.error(
            `[TiltHandler] Failed to store tilt event: ${response.status} ${response.statusText}`
          );
          return;
        }

        const result = (await response.json()) as StoreTiltEventResponse;
        if (result.success) {
          console.log(`[TiltHandler] Tilt event stored for user ${tiltData.userId} (score: ${tiltData.tiltScore})`);
        }

        // Mirror to Elastic telemetry index
        await trackTiltDetected({
          userId: tiltData.userId,
          tiltScore: tiltData.tiltScore ?? 0,
          signals: tiltData.indicators ?? [],
        });
      } catch (error) {
        console.error('[TiltHandler] Error posting tilt event to backend:', error);
      }
    },
    'discord-bot'
  );

  console.log('[TiltHandler] Tilt events handler initialized - listening for tilt.detected events');
}

/**
 * Fetch tilt history for a user from the backend
 */
export async function getUserTiltHistory(userId: string, options: {
  days?: number;
  limit?: number;
} = {}): Promise<TiltEvent[]> {
  try {
    const params = new URLSearchParams();
    if (options.days) params.append('days', options.days.toString());
    if (options.limit) params.append('limit', options.limit.toString());

    const response = await fetch(`${BACKEND_URL}/api/tilt/history/${userId}?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`[TiltHandler] Failed to fetch tilt history: ${response.status}`);
      return [];
    }

    const result = (await response.json()) as TiltHistoryResponse;
    return result.events || [];
  } catch (error) {
    console.error('[TiltHandler] Error fetching tilt history:', error);
    return [];
  }
}

/**
 * Fetch tilt statistics for a user from the backend
 */
export async function getUserTiltStats(userId: string): Promise<TiltStatsResponse | null> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/tilt/stats/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`[TiltHandler] Failed to fetch tilt stats: ${response.status}`);
      return null;
    }

    return (await response.json()) as TiltStatsResponse;
  } catch (error) {
    console.error('[TiltHandler] Error fetching tilt stats:', error);
    return null;
  }
}
