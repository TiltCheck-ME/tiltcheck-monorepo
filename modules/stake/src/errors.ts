/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Custom error classes for Stake API
 */

/**
 * Base error for Stake API operations
 */
export class StakeApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'StakeApiError';
  }
}

/**
 * Error thrown when rate limit is exceeded
 */
export class RateLimitError extends StakeApiError {
  constructor(
    message: string,
    public retryAfter?: number
  ) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitError';
  }
}

/**
 * Error thrown when authentication fails
 */
export class AuthenticationError extends StakeApiError {
  constructor(message: string = 'Invalid API key') {
    super(message, 401, 'AUTHENTICATION_FAILED');
    this.name = 'AuthenticationError';
  }
}

/**
 * Error thrown when code is invalid or expired
 */
export class InvalidCodeError extends StakeApiError {
  constructor(message: string) {
    super(message, 400, 'INVALID_CODE');
    this.name = 'InvalidCodeError';
  }
}

/**
 * Error thrown when user is not eligible
 */
export class IneligibleError extends StakeApiError {
  constructor(message: string) {
    super(message, 403, 'INELIGIBLE');
    this.name = 'IneligibleError';
  }
}
