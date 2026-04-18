/**
 * © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-18
 * Discord Activities SDK Types
 * Defines the interface contract for embedded Discord Activities (games/apps)
 */

export enum ActivityType {
  POKER = 'poker',
  TRIVIA = 'trivia',
  BLACKJACK = 'blackjack',
  WAR = 'war',
}

/**
 * Configuration for launching a Discord Activity
 */
export interface ActivityLaunchConfig {
  userId: string;
  guildId: string;
  channelId: string;
  activityType: ActivityType;
  instanceId: string;
  sessionToken: string;
  applicationId: string;
  
  // Optional monetization
  requiredSKUs?: string[];
  consumableSKUs?: string[];
  verifiedRequiredSKUs?: string[];
  
  // Optional game config
  gameConfig?: Record<string, unknown>;
}

/**
 * State of an active Activity instance
 */
export interface ActivityInstance {
  id: string;
  userId: string;
  guildId: string;
  channelId: string;
  messageId: string;
  activityType: ActivityType;
  status: 'launching' | 'active' | 'paused' | 'completed' | 'failed';
  sessionToken: string;
  createdAt: number;
  expiresAt: number;
  gameState?: Record<string, unknown>;
  entitlementsVerified?: boolean;
  requiredSKUs?: string[];
  consumableSKUs?: string[];
  verifiedRequiredSKUs?: string[];
  outcome?: ActivityResultStatus;
  result?: ActivityResult;
}

/**
 * Message protocol between Activity (iFrame) and Discord Bot
 */
export interface ActivityMessage {
  type: 'state-update' | 'action' | 'result' | 'error' | 'heartbeat';
  instanceId: string;
  userId: string;
  payload: Record<string, unknown>;
  timestamp: number;
}

/**
 * Result when an Activity completes
 */
export interface ActivityResult {
  instanceId: string;
  userId: string;
  activityType: ActivityType;
  status: ActivityResultStatus;
  score?: number;
  prizeAmount?: number;
  entitlementConsumed?: boolean;
  consumedEntitlementIds?: string[];
  completedAt: number;
}

export type ActivityResultStatus = 'won' | 'lost' | 'abandoned';

/**
 * Session state persisted for Activity
 */
export interface ActivitySessionState {
  instanceId: string;
  userId: string;
  activityType: ActivityType;
  guildId: string;
  channelId: string;
  sessionToken: string;
  gameState: Record<string, unknown>;
  lastHeartbeat: number;
  expiresAt: number;
  reconnectCount: number;
  status: ActivityInstance['status'];
  requiredSKUs?: string[];
  consumableSKUs?: string[];
  verifiedRequiredSKUs?: string[];
  outcome?: ActivityResultStatus;
  result?: ActivityResult;
  consumedEntitlementIds?: string[];
}
