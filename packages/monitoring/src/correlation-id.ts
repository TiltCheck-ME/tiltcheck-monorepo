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

// Extend Express Request type to include correlation ID
declare global {
  namespace Express {
    interface Request {
      id?: string;
      log?: any; // Would be pino.Logger in real implementation
    }
  }
}

/**
 * Generate a unique correlation ID
 */
function generateCorrelationId(): string {
  // TODO: Use uuid or similar for production
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
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
    // TODO: Implement correlation ID middleware
    // - Check for existing correlation ID in headers
    // - Generate new ID if not present
    // - Attach to req.id
    // - Create child logger with requestId
    // - Add correlation ID to response headers
    
    // Get or generate correlation ID
    const correlationId = req.get(headerName) || idGenerator();
    
    req.id = correlationId;
    res.setHeader(headerName, correlationId);
    
    // TODO: Create child logger with correlation ID
    // req.log = logger.child({ requestId: correlationId });
    
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
