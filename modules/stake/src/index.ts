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
