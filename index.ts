/**
 * Shared event types for the TiltCheck ecosystem.
 */

export interface TiltCheckEvent<T = any> {
  id: string;
  type: string;
  payload: T;
  timestamp: Date;
  source: string;
  correlationId?: string;
}

export interface UserEventPayload {
  userId: string;
  guildId?: string;
  action: string;
  metadata?: Record<string, any>;
}

export interface SystemEventPayload {
  service: string;
  status: 'up' | 'down' | 'degraded';
  message?: string;
}

/**
 * Runtime constant to ensure this file is emitted as a module.
 * This fixes the 'isolatedModules' build error.
 */
export const EventTopics = {
  USER_ACTION: 'user.action',
  SYSTEM_STATUS: 'system.status',
  TILT_DETECTED: 'tilt.detected',
  TRUST_SCORE_UPDATED: 'trust.score.updated'
} as const;