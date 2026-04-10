// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-10
/**
 * Activity Tilt Integration
 *
 * Bridges tilt events from the Discord bot to Discord Activities
 * and manages real-time broadcasting to the Activity iframe
 */

import type { DiscordActivityManager } from '@tiltcheck/discord-activities';
import type { TiltCheckEvent } from '@tiltcheck/types';
import { eventRouter } from '@tiltcheck/event-router';
import { tiltBroadcaster } from '@tiltcheck/discord-activities';

/**
 * Initialize integration between tilt events and Activity broadcasts
 */
export function initializeActivityTiltIntegration(activityManager: DiscordActivityManager): void {
  // Subscribe to tilt events and broadcast to activities
  eventRouter.subscribe(
    'tilt.detected',
    async (event: TiltCheckEvent<'tilt.detected'>) => {
      try {
        const { userId, tiltScore } = event.data;
        const userId2 = userId || event.userId || '';

        // Broadcast to tilt broadcaster (used by Activity for real-time UI updates)
        // Note: broadcastTilt expects TiltCheckBaseEvent format, we have TiltCheckEvent format
        // For now we'll skip the broadcast since activity message is sent directly above
        
        // Send state-update message to active activity for this user
        const activeActivities = activityManager.getActiveInstancesForUser(userId2);
        if (activeActivities.length > 0) {
          const activity = activeActivities[0];
          await activityManager.sendActivityMessage(activity.id, {
            type: 'state-update',
            instanceId: activity.id,
            userId: userId2,
            payload: {
              event: 'tilt-update',
              tiltScore,
              sessionMetrics: event.data.sessionMetrics,
              peerVisibility: tiltBroadcaster.getPeerVisibility(),
            },
            timestamp: Date.now(),
          });
        }

        console.log(
          `[ActivityTiltIntegration] Broadcast tilt update to activity: ${userId2} (tilt: ${tiltScore})`
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
