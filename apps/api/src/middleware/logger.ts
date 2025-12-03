/**
 * Request Logger Middleware
 */

import type { Request, Response, NextFunction } from 'express';

/**
 * Request logging middleware
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  
  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - start;
    const log = {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.headers['x-forwarded-for'] || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
    };
    
    // Log based on status code
    if (res.statusCode >= 500) {
      console.error('[API]', JSON.stringify(log));
    } else if (res.statusCode >= 400) {
      console.warn('[API]', JSON.stringify(log));
    } else {
      console.log('[API]', JSON.stringify(log));
    }
  });
  
  next();
}
