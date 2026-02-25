/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * @tiltcheck/utils
 * 
 * Shared utilities for the TiltCheck ecosystem.
 * Provides error handling, API response formatting, and crypto helpers.
 */

// Import ValidationError for internal use
import { ValidationError } from './errors.js';

// Error helpers
export {
  TiltCheckError,
  APIError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  RateLimitError,
  ServiceError,
  isTiltCheckError,
  toAuthError,
  withErrorHandling,
  safeJsonParse,
  assert,
} from './errors.js';

// API response helpers
export {
  success,
  error,
  paginated,
  isSuccess,
  isError,
  unwrap,
  withRequestId,
  HTTP_STATUS,
  getStatusFromCode,
  type SuccessResponse,
  type ErrorResponse,
  type APIResponse,
  type ResponseMeta,
  type PaginationMeta,
} from './api.js';

// Crypto helpers
export {
  randomHex,
  randomBase64,
  randomNumeric,
  generateUUID,
  sha256,
  sha512,
  hmac,
  hashToken,
  generateApiToken,
  generateMagicLinkToken,
  generateSessionToken,
  generateNonce,
  timingSafeEqual,
  verifyToken,
} from './crypto.js';

// ============================================================================
// General Utilities
// ============================================================================

/**
 * Sleep for a specified number of milliseconds
 * @deprecated Use delay instead
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Delay execution for a specified number of milliseconds
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    baseDelay?: number;
    maxDelay?: number;
  } = {}
): Promise<T> {
  const { maxAttempts = 3, baseDelay = 1000, maxDelay = 10000 } = options;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxAttempts) {
        break;
      }

      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Debounce a function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | undefined;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => fn(...args), ms);
  };
}

/**
 * Throttle a function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= ms) {
      lastCall = now;
      fn(...args);
    }
  };
}

/**
 * Check if a value is defined (not null or undefined)
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Pick specific keys from an object
 */
export function pick<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Omit specific keys from an object
 */
export function omit<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result as Omit<T, K>;
}

/**
 * Deep clone an object using structuredClone
 * Falls back to JSON serialization for compatibility
 * Note: Functions, undefined, symbols, and circular references may not be preserved
 */
export function deepClone<T>(obj: T): T {
  // Use structuredClone if available (Node 17+, modern browsers)
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(obj);
    } catch {
      // Fall back to JSON for unsupported types
    }
  }
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Format a date to ISO string without milliseconds
 */
export function formatDate(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/**
 * Parse a duration string to milliseconds
 * Supports: '1h', '30m', '7d', '1w', '60s'
 * @throws {ValidationError} If duration format is invalid
 */
export function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)(s|m|h|d|w)$/);
  if (!match) {
    throw new ValidationError(`Invalid duration format: ${duration}`, 'duration');
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
  };

  return value * multipliers[unit];
}

/**
 * Format lamports (bigint) to a SOL string
 */
export function formatSol(lamports: bigint): string {
  const s = lamports.toString();
  if (s.length <= 9) {
    const padded = s.padStart(9, '0');
    const fractionalPart = padded.replace(/0+$/, '');
    return fractionalPart.length > 0 ? `0.${fractionalPart}` : '0';
  }
  const integerPart = s.slice(0, -9);
  const fractionalPart = s.slice(-9).replace(/0+$/, '');
  return fractionalPart.length > 0 ? `${integerPart}.${fractionalPart}` : integerPart;
}

/**
 * Truncate a wallet address for display (e.g. Abc1...xyz2)
 */
export function truncateWallet(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}
