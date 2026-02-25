/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Correlation ID Middleware
 * 
 * This module provides Express middleware for adding correlation IDs to requests.
 * Correlation IDs help track requests across service boundaries.
 * 
 * @example
 * ```typescript
 * import express from 'express';
 * import { correlationIdMiddleware } from '@tiltcheck/monitoring/correlation-id';
 * 
 * const app = express();
 * 
 * // Add correlation ID middleware early in the chain
 * app.use(correlationIdMiddleware());
 * 
 * // Access correlation ID in routes
 * app.get('/api/example', (req, res) => {
 *   console.log('Request ID:', req.id);
 *   console.log('Logger:', req.log); // Child logger with requestId
 *   req.log.info('Handling request');
 *   res.json({ requestId: req.id });
 * });
 * ```
 */

import type { Request, Response, NextFunction } from 'express';
import 'express';
import { v4 as uuidv4 } from 'uuid';
import { getLogger, createRequestLogger, type Logger } from '@tiltcheck/logger';

// Extend Express Request type to include correlation ID
declare module 'express' {
  export interface Request {
    id?: string;
    log?: Logger;
  }
}

/**
 * Generate a unique correlation ID
 */
function generateCorrelationId(): string {
  return uuidv4();
}

/**
 * Express middleware to add correlation ID to requests
 * @param options - Configuration options
 */
export function correlationIdMiddleware(options?: {
  headerName?: string;
  generateId?: () => string;
}) {
  const headerName = options?.headerName || 'x-correlation-id';
  const idGenerator = options?.generateId || generateCorrelationId;

  return (req: Request, res: Response, next: NextFunction) => {
    // Get existing correlation ID from headers or generate a new one
    const correlationId = (req.get(headerName) as string) || idGenerator();

    // Attach to request object
    req.id = correlationId;
    req.headers[headerName] = correlationId;

    // Ensure the ID is present in the response headers
    res.setHeader(headerName, correlationId);

    // Create child logger with correlation ID for request tracing
    req.log = createRequestLogger(getLogger(), correlationId);

    next();
  };
}

/**
 * Attach correlation ID to outgoing requests
 * @param correlationId - The correlation ID to attach
 */
export function attachCorrelationId(correlationId: string): Record<string, string> {
  return {
    'x-correlation-id': correlationId,
  };
}

/**
 * Extract correlation ID from request headers
 * @param headers - Request headers object
 */
export function extractCorrelationId(headers: Record<string, string | string[] | undefined>): string | undefined {
  const headerValue = headers['x-correlation-id'];
  return Array.isArray(headerValue) ? headerValue[0] : headerValue;
}
