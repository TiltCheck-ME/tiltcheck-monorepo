/**
 * Error Handling Middleware
 */

import type { Request, Response, NextFunction, ErrorRequestHandler } from 'express';

/**
 * API Error class
 */
export class APIError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * Not found handler
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: 'Not Found',
    code: 'NOT_FOUND',
    message: `Cannot ${req.method} ${req.path}`,
  });
}

/**
 * Global error handler
 */
export const errorHandler: ErrorRequestHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('[API Error]', err);
  
  if (err instanceof APIError) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      details: err.details,
    });
    return;
  }
  
  // Handle specific error types
  if (err.message.includes('CORS')) {
    res.status(403).json({
      error: 'CORS Error',
      code: 'CORS_ERROR',
      message: 'Cross-origin request blocked',
    });
    return;
  }
  
  if (err.message.includes('JSON')) {
    res.status(400).json({
      error: 'Invalid JSON',
      code: 'INVALID_JSON',
      message: 'Request body contains invalid JSON',
    });
    return;
  }
  
  // Default error response
  res.status(500).json({
    error: 'Internal Server Error',
    code: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : err.message,
  });
};
