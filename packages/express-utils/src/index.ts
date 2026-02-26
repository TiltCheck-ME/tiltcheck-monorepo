/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 *
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */

// v0.1.0 — 2026-02-25

/**
 * @tiltcheck/express-utils
 * Common Express middleware utilities for error handling, logging, CORS, and 404 responses
 */

import type { Request, Response, NextFunction } from 'express';

/**
 * Type for async route handler functions
 */
type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void> | Promise<any>;

/**
 * Type for error object with optional statusCode and code properties
 */
interface AppError extends Error {
  statusCode?: number;
  code?: string;
  field?: string;
  serviceName?: string;
}

/**
 * Type for standard error response
 */
interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  code?: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// asyncHandler — Wraps async route handlers to catch errors
// ============================================================================

/**
 * Wraps async route handlers to automatically catch errors and pass them to next()
 * Prevents "unhandled promise rejection" errors in Express
 *
 * Usage:
 *   app.get('/path', asyncHandler(async (req, res) => {
 *     const data = await someAsyncOperation();
 *     res.json(data);
 *   }));
 */
export function asyncHandler(fn: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ============================================================================
// notFoundHandler — 404 middleware
// ============================================================================

/**
 * Middleware that responds with a 404 error for unmatched routes
 * Should be registered after all other route handlers
 *
 * Usage:
 *   app.use(notFoundHandler());
 */
export function notFoundHandler() {
  return (req: Request, res: Response, next: NextFunction) => {
    const error: AppError = new Error(`Cannot ${req.method} ${req.originalUrl}`);
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    next(error);
  };
}

// ============================================================================
// errorHandler — Standard error response middleware
// ============================================================================

/**
 * Middleware that handles errors and sends standardized JSON responses
 * Integrates with error-factory if available for structured error types
 * Should be registered as the last middleware
 *
 * Usage:
 *   app.use(errorHandler());
 */
export function errorHandler() {
  return (err: AppError | Error, req: Request, res: Response, next: NextFunction) => {
    const statusCode = (err as AppError).statusCode || 500;
    const code = (err as AppError).code || 'INTERNAL_SERVER_ERROR';
    const message = err.message || 'An unexpected error occurred';
    const timestamp = new Date().toISOString();

    // Prepare response
    const response: ErrorResponse = {
      error: code,
      message,
      statusCode,
      timestamp,
    };

    // Include additional details if available
    if ((err as AppError).field) {
      response.details = {
        field: (err as AppError).field,
      };
    }

    // Log error (optional: integrate with @tiltcheck/logger)
    if (statusCode >= 500) {
      console.error('[ERROR]', {
        code,
        message,
        statusCode,
        path: req.path,
        method: req.method,
        timestamp,
      });
    }

    res.status(statusCode).json(response);
  };
}

// ============================================================================
// requestLogger — Simple request logging middleware
// ============================================================================

/**
 * Middleware that logs incoming requests with basic information
 * Logs method, path, query, IP, and response time
 *
 * Usage:
 *   app.use(requestLogger());
 */
export function requestLogger() {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const ip = req.ip || req.socket.remoteAddress || 'unknown';

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const status = res.statusCode;

      console.log('[REQUEST]', {
        method: req.method,
        path: req.path,
        query: Object.keys(req.query).length > 0 ? req.query : undefined,
        status,
        duration: `${duration}ms`,
        ip,
        timestamp: new Date().toISOString(),
      });
    });

    next();
  };
}

// ============================================================================
// corsMiddleware — Configurable CORS headers
// ============================================================================

/**
 * Configuration options for CORS middleware
 */
export interface CorsOptions {
  origins?: string[];
  methods?: string[];
  headers?: string[];
  credentials?: boolean;
  maxAge?: number;
}

/**
 * Middleware that adds CORS headers to responses
 * Supports configurable allowed origins, methods, and headers
 *
 * Usage:
 *   // Default CORS (all origins)
 *   app.use(corsMiddleware());
 *
 *   // Restricted origins
 *   app.use(corsMiddleware({
 *     origins: ['https://example.com', 'https://app.example.com'],
 *     methods: ['GET', 'POST', 'PUT', 'DELETE'],
 *     credentials: true
 *   }));
 */
export function corsMiddleware(options?: CorsOptions) {
  const {
    origins = ['*'],
    methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    headers = ['Content-Type', 'Authorization'],
    credentials = false,
    maxAge = 86400,
  } = options || {};

  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin || req.headers.referer?.split('/').slice(0, 3).join('/');
    const isAllowedOrigin = origins.includes('*') || origins.includes(origin as string);

    if (isAllowedOrigin) {
      res.header('Access-Control-Allow-Origin', origin || origins[0]);
    }

    res.header('Access-Control-Allow-Methods', methods.join(', '));
    res.header('Access-Control-Allow-Headers', headers.join(', '));

    if (credentials) {
      res.header('Access-Control-Allow-Credentials', 'true');
    }

    res.header('Access-Control-Max-Age', maxAge.toString());

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }

    next();
  };
}

// ============================================================================
// Exports
// ============================================================================

export {
  AsyncHandler,
  AppError,
  ErrorResponse
};

export default {
  asyncHandler,
  notFoundHandler,
  errorHandler,
  requestLogger,
  corsMiddleware,
};
