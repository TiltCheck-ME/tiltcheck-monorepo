/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * Activity Tilt Integration
 *
 * Bridges tilt events from the Discord bot to Discord Activities
 * and manages real-time broadcasting to the Activity iframe
 */

import type { DiscordActivityManager } from '@tiltcheck/discord-activities';
import type { TiltCheckBaseEvent, TiltDetectedPayload } from '@tiltcheck/event-types';
import { eventRouter } from '@tiltcheck/event-router';
import { tiltBroadcaster } from '@tiltcheck/discord-activities';

/**
 * Initialize integration between tilt events and Activity broadcasts
 */
export function initializeActivityTiltIntegration(activityManager: DiscordActivityManager): void {
  // Subscribe to tilt events and broadcast to activities
  eventRouter.subscribe(
    'safety.tilt.detected',
    async (event: TiltCheckBaseEvent<'safety.tilt.detected', TiltDetectedPayload>) => {
      try {
        const { userId, tiltScore } = event.payload;

        // Broadcast to tilt broadcaster (used by Activity for real-time UI updates)
        tiltBroadcaster.broadcastTilt(event);

        // Send state-update message to active activity for this user
        const activeActivities = activityManager.getActiveInstancesForUser(userId);
        if (activeActivities.length > 0) {
          const activity = activeActivities[0];
          await activityManager.sendActivityMessage(activity.id, {
            type: 'state-update',
            instanceId: activity.id,
            userId,
            payload: {
              event: 'tilt-update',
              tiltScore,
              sessionMetrics: event.payload.sessionMetrics,
              peerVisibility: tiltBroadcaster.getPeerVisibility(),
            },
            timestamp: Date.now(),
          });
        }

        console.log(
          `[ActivityTiltIntegration] Broadcast tilt update to activity: ${userId} (tilt: ${tiltScore})`
        );
      } catch (error) {
        console.error('[ActivityTiltIntegration] Error broadcasting tilt to activity:', error);
      }
    },
    'discord-bot'
  );

  console.log('[ActivityTiltIntegration] Initialized - tilt events will broadcast to activities');
}

/**
 * Get current tilt state for activity display
 */
export function getTiltStateForActivity(userId: string) {
  return tiltBroadcaster.getTiltState(userId);
}

/**
 * Get peer visibility (all active users) for activity
 */
export function getPeerVisibilityForActivity() {
  return tiltBroadcaster.getPeerVisibility();
}

/**
 * Get tilted users list
 */
export function getTiltedUsersForActivity(threshold: number = 60) {
  return tiltBroadcaster.getTiltedUsers(threshold);
}

/**
 * Handle session end (cleanup)
 */
export function handleActivitySessionEnd(userId: string): void {
  tiltBroadcaster.endSession(userId);
  console.log(`[ActivityTiltIntegration] Session ended for ${userId}`);
}
