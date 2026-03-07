/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Stake API Module
 * 
 * Exports client and types for interacting with Stake.com API
 */

export { StakeClient } from './client.js';
export {
  StakeApiError,
  RateLimitError,
  AuthenticationError,
  InvalidCodeError,
  IneligibleError,
} from './errors.js';
export type {
  StakeClientConfig,
  EligibilityResult,
  ClaimResult,
  WagerRequirement,
  StakeApiErrorResponse,
} from './types.js';
