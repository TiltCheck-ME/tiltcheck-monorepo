/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * Error Handling Middleware
 */

import type { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ApplicationError } from '@tiltcheck/error-factory';

/**
 * Not found handler
 */
export function notFoundHandler(req: Request, res: Response): void {
  const error = new ApplicationError(`Cannot ${req.method} ${req.path}`, 404, 'NOT_FOUND');
  res.status(404).json(error.toJSON());
}

/**
 * Global error handler
 */
export const errorHandler: ErrorRequestHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Use the shared error factory to normalize any error type
  const appError = ApplicationError.fromError(err);
  
  // Log critical errors
  if (appError.statusCode >= 500) {
    console.error('[API Critical Error]', err);
  } else {
    console.warn('[API Client Error]', appError.message);
  }
  
  const serialized = appError.toJSON();
  
  // Backward compatibility for 'error' vs 'message' field
  // The UI might expect { error: string } instead of { message: string }
  res.status(appError.statusCode).json({
    ...serialized,
    error: serialized.message 
  });
};

