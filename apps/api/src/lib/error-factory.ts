/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * API Error Factory
 * 
 * Provides standardized ways to create and throw APIError instances.
 */

import { APIError } from '../middleware/error.js';

/**
 * Standard API error factory
 */
export const createError = {
  /**
   * 400 Bad Request
   */
  badRequest(message: string, code = 'BAD_REQUEST', details?: unknown): APIError {
    return new APIError(400, code, message, details);
  },

  /**
   * 401 Unauthorized
   */
  unauthorized(message = 'Unauthorized access', code = 'UNAUTHORIZED'): APIError {
    return new APIError(401, code, message);
  },

  /**
   * 403 Forbidden (e.g. Geo-Compliance)
   */
  forbidden(message = 'Access forbidden', code = 'FORBIDDEN', details?: unknown): APIError {
    return new APIError(403, code, message, details);
  },

  /**
   * 404 Not Found
   */
  notFound(message = 'Resource not found', code = 'NOT_FOUND'): APIError {
    return new APIError(404, code, message);
  },

  /**
   * 503 Service Unavailable (e.g. Rate limits or maintenance)
   */
  serviceUnavailable(message = 'Service unavailable', code = 'SERVICE_UNAVAILABLE'): APIError {
    return new APIError(503, code, message);
  },

  /**
   * 500 Internal Error
   */
  internal(message = 'An internal error occurred', code = 'INTERNAL_ERROR', details?: unknown): APIError {
    return new APIError(500, code, message, details);
  }
};
