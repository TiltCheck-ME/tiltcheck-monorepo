/**
 * Tilt Events Handler
 * 
 * Subscribes to tilt.detected events from @tiltcheck/tiltcheck-core
 * and forwards them to the backend API for persistent storage.
 */

import { eventRouter } from '@tiltcheck/event-router';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

/**
 * Initialize tilt events handler
 * Should be called in bot startup (index.ts)
 */
export function initializeTiltEventsHandler(): void {
  // Subscribe to tilt.detected events from tiltcheck-core
  eventRouter.subscribe(
    'tilt.detected',
    async (event: any) => {
      try {
        const tiltData = event.data as any;

        // Forward to backend for storage
        const response = await fetch(`${BACKEND_URL}/api/tilt/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: tiltData.userId,
            timestamp: tiltData.timestamp,
            signals: tiltData.signals || [],
            tiltScore: tiltData.tiltScore,
            context: 'discord-dm', // Can be set to discord-guild if in guild context
          }),
        });

        if (!response.ok) {
          console.error(
            `[TiltHandler] Failed to store tilt event: ${response.status} ${response.statusText}`
          );
          return;
        }

        const result = await response.json() as any;
        if (result.success) {
          console.log(`[TiltHandler] 📊 Tilt event stored for user ${tiltData.userId} (score: ${tiltData.tiltScore})`);
        }
      } catch (error) {
        console.error('[TiltHandler] Error posting tilt event to backend:', error);
      }
    },
    'discord-bot'
  );

  console.log('[TiltHandler] ✅ Tilt events handler initialized - listening for tilt.detected events');
}

/**
 * Fetch tilt history for a user from the backend
 */
export async function getUserTiltHistory(userId: string, options: {
  days?: number;
  limit?: number;
} = {}): Promise<any[]> {
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

    const result = await response.json() as any;
    return result.events || [];
  } catch (error) {
    console.error('[TiltHandler] Error fetching tilt history:', error);
    return [];
  }
}

/**
 * Fetch tilt statistics for a user from the backend
 */
export async function getUserTiltStats(userId: string): Promise<any | null> {
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

    const result = await response.json() as any;
    return result;
  } catch (error) {
    console.error('[TiltHandler] Error fetching tilt stats:', error);
    return null;
  }
}
