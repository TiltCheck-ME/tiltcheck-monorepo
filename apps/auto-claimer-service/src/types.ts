/**
 * Types for User Code Claimer Service
 */

/**
 * Claim job data
 */
export interface ClaimJob {
  userId: string;
  code: string;
  priority?: number;
}

/**
 * Bulk claim job data
 */
export interface BulkClaimJob {
  userId: string;
  codes: string[];
}

/**
 * Claim result status
 */
export type ClaimStatus = 'claimed' | 'skipped' | 'failed';

/**
 * Claim history record
 */
export interface ClaimHistory {
  id: string;
  userId: string;
  code: string;
  status: ClaimStatus;
  reason?: string;
  rewardType?: string;
  rewardAmount?: number;
  rewardCurrency?: string;
  attemptedAt: Date;
}

/**
 * User API key record (encrypted)
 */
export interface UserApiKey {
  id: string;
  userId: string;
  apiKeyEncrypted: string;
  createdAt: Date;
  lastUsedAt?: Date;
}

/**
 * Rate limit record
 */
export interface RateLimit {
  userId: string;
  windowStart: Date;
  requestCount: number;
}

/**
 * Configuration for claimer worker
 */
export interface ClaimerConfig {
  redisUrl: string;
  databaseUrl: string;
  claimsPerMinutePerUser: number;
  maxRetryAttempts: number;
  workerConcurrency: number;
  jobTimeout: number;
}

/**
 * Database interface for claimer
 */
export interface ClaimerDatabase {
  getUserApiKey(userId: string): Promise<string | null>;
  saveClaimHistory(history: ClaimHistory): Promise<void>;
  getClaimHistory(userId: string, limit?: number): Promise<ClaimHistory[]>;
  checkRateLimit(userId: string): Promise<boolean>;
  incrementRateLimit(userId: string): Promise<void>;
}
