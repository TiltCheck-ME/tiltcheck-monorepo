/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Types for Stake API client
 */

/**
 * Configuration for Stake API client
 */
export interface StakeClientConfig {
  /** User's Stake API key */
  apiKey: string;
  /** API base URL (optional, defaults to production) */
  baseUrl?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * Result of eligibility check
 */
export interface EligibilityResult {
  /** Whether user is eligible to claim the code */
  eligible: boolean;
  /** Reason if not eligible */
  reason?: string;
  /** Wager requirements if applicable */
  wagersRequired?: number;
  /** Code expiration date if applicable */
  expiresAt?: Date;
}

/**
 * Result of code claim attempt
 */
export interface ClaimResult {
  /** Whether claim was successful */
  success: boolean;
  /** Reward details if successful */
  reward?: {
    type: 'bonus' | 'freespins' | 'rakeback' | 'other';
    amount: number;
    currency?: string;
  };
  /** Error message if failed */
  error?: string;
}

/**
 * Wager requirement information
 */
export interface WagerRequirement {
  /** Required wager amount */
  amount: number;
  /** Currency of wager */
  currency: string;
  /** Whether requirement is met */
  met: boolean;
  /** Remaining wager amount */
  remaining: number;
}

/**
 * Stake API error response
 */
export interface StakeApiErrorResponse {
  error: string;
  message?: string;
  code?: string;
}
