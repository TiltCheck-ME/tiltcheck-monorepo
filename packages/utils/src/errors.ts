/**
 * @tiltcheck/utils - Error Helpers
 * Standardized error handling utilities
 */

import type { AuthError, AuthErrorCode } from '@tiltcheck/types';

// ============================================================================
// Base Error Classes
// ============================================================================

/**
 * Base TiltCheck error
 */
export class TiltCheckError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: unknown;

  constructor(message: string, code: string, status: number = 500, details?: unknown) {
    super(message);
    this.name = 'TiltCheckError';
    this.code = code;
    this.status = status;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: this.name,
      code: this.code,
      message: this.message,
      status: this.status,
      details: this.details,
    };
  }
}

/**
 * API Error - for HTTP API responses
 */
export class APIError extends TiltCheckError {
  constructor(message: string, code: string, status: number = 500, details?: unknown) {
    super(message, code, status, details);
    this.name = 'APIError';
  }
}

/**
 * Validation Error - for input validation failures
 */
export class ValidationError extends TiltCheckError {
  public readonly field?: string;

  constructor(message: string, field?: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
    this.field = field;
  }
}

/**
 * Not Found Error
 */
export class NotFoundError extends TiltCheckError {
  public readonly resource: string;

  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with id '${id}' not found` : `${resource} not found`;
    super(message, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
    this.resource = resource;
  }
}

/**
 * Unauthorized Error
 */
export class UnauthorizedError extends TiltCheckError {
  constructor(message: string = 'Authentication required') {
    super(message, 'UNAUTHORIZED', 401);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Forbidden Error
 */
export class ForbiddenError extends TiltCheckError {
  constructor(message: string = 'Access denied') {
    super(message, 'FORBIDDEN', 403);
    this.name = 'ForbiddenError';
  }
}

/**
 * Rate Limit Error
 */
export class RateLimitError extends TiltCheckError {
  public readonly retryAfter?: number;

  constructor(message: string = 'Too many requests', retryAfter?: number) {
    super(message, 'RATE_LIMIT_EXCEEDED', 429);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Service Error - for internal service failures
 */
export class ServiceError extends TiltCheckError {
  public readonly service: string;

  constructor(service: string, message: string, details?: unknown) {
    super(message, 'SERVICE_ERROR', 503, details);
    this.name = 'ServiceError';
    this.service = service;
  }
}

// ============================================================================
// Error Helpers
// ============================================================================

/**
 * Check if an error is a TiltCheck error
 */
export function isTiltCheckError(error: unknown): error is TiltCheckError {
  return error instanceof TiltCheckError;
}

/**
 * Create an AuthError from an error
 */
export function toAuthError(error: unknown, defaultCode: AuthErrorCode = 'SERVICE_ERROR'): AuthError {
  if (error instanceof TiltCheckError) {
    return {
      code: error.code as AuthErrorCode,
      message: error.message,
      status: error.status,
    };
  }

  if (error instanceof Error) {
    return {
      code: defaultCode,
      message: error.message,
      status: 500,
    };
  }

  return {
    code: defaultCode,
    message: 'An unexpected error occurred',
    status: 500,
  };
}

/**
 * Wrap an async function with error handling
 */
export function withErrorHandling<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  errorHandler: (error: unknown) => void
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      errorHandler(error);
      throw error;
    }
  }) as T;
}

/**
 * Safe JSON parse with error handling
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Assert a condition and throw if false
 */
export function assert(condition: boolean, message: string, ErrorClass = TiltCheckError): asserts condition {
  if (!condition) {
    throw new ErrorClass(message, 'ASSERTION_FAILED', 500);
  }
}
