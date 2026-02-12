import { Request, Response, NextFunction } from 'express';

/**
 * CSRF Protection Middleware
 * 
 * For APIs, we can use the "Custom Request Header" pattern.
 * Browsers' Same-Origin Policy (SOP) prevents cross-origin requests from adding custom headers
 * unless the server explicitly allows it via CORS.
 */
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // Skip CSRF check for GET, HEAD, OPTIONS (safe methods)
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Check for custom header
  // Common headers: X-Requested-With, X-CSRF-Token
  const csrfHeader = req.headers['x-requested-with'] || req.headers['x-csrf-token'];

  if (!csrfHeader) {
    return res.status(403).json({
      error: 'CSRF protection triggered: Missing required security header',
      code: 'CSRF_MISSING_HEADER'
    });
  }

  next();
};
