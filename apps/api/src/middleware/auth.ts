/**
 * DEPRECATED: This file is kept for backwards compatibility only.
 * New implementations should use middleware from @tiltcheck/auth/middleware/express.js:
 * - sessionAuth() - For session cookie authentication
 * - bearerAuth() - For JWT Bearer token authentication
 * - flexAuth() - For both session and bearer token
 * 
 * To migrate existing code:
 *   OLD: import { authMiddleware } from './middleware/auth.js'
 *   NEW: import { flexAuth } from '@tiltcheck/auth/middleware/express.js'
 *        app.use(flexAuth(getJWTConfig()));
 */

import type { Request, Response, NextFunction } from 'express';
import { verifySessionCookie, verifyToken, type JWTConfig, type JWTPayload } from '@tiltcheck/auth';

/**
 * Get unified JWT configuration
 * (For backwards compatibility - new code should use getJWTConfigFromEnv from @tiltcheck/auth)
 */
export function getJWTConfig(): JWTConfig {
  const secret = process.env.JWT_SECRET || '';
  if (!secret && process.env.NODE_ENV !== 'test') {
    throw new Error('[FATAL] JWT_SECRET env var is required for signatures');
  }
  return {
    secret,
    issuer: process.env.JWT_ISSUER || 'tiltcheck.me',
    audience: process.env.JWT_AUDIENCE || 'tiltcheck.me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  };
}

/**
 * JWT payload structure
 */
export interface JWTPayloadExt extends JWTPayload {
  userId?: string;
  email?: string;
  discordId?: string;
  walletAddress?: string;
}

/**
 * DEPRECATED: Use AuthenticatedRequest from @tiltcheck/auth instead
 * This type is kept for backwards compatibility only.
 */
export type AuthRequest = Request & {
  user?: {
    id: string;
    email: string;
    roles: string[];
    discordId?: string;
    walletAddress?: string;
  };
};

// Export types from @tiltcheck/auth for backwards compatibility
export type { JWTConfig, JWTPayload };
export { verifyToken, verifySessionCookie };

// Import the real middleware from @tiltcheck/auth
import { sessionAuth as _sessionAuth, flexAuth as _flexAuth } from '@tiltcheck/auth/middleware/express.js';

/**
 * Auth middleware that maps @tiltcheck/auth context to legacy .user property
 * This is a compatibility layer for existing routes.
 * NOTE: Using 'any' here is intentional - this bridges two different type systems.
 * Long-term solution is to migrate all routes to use @tiltcheck/auth directly.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Create sessionAuth middleware and call it
  const handler = _sessionAuth();
  handler(req, res, (err) => {
    if (err) {
      next(err);
      return;
    }

    // Map req.auth to req.user for backwards compatibility
    // Using 'any' bridge because @tiltcheck/auth's Request extends doesn't
    // match this middleware's expectation
    const authReq = req as any;
    if (authReq.auth) {
      authReq.user = {
        id: authReq.auth.userId,
        email: authReq.auth.email || '',
        roles: authReq.auth.roles || [],
        discordId: authReq.auth.discordId,
        walletAddress: authReq.auth.walletAddress,
      };
    }

    next();
  });
}

/**
 * Optional auth middleware (doesn't fail if no auth provided)
 * NOTE: Using 'any' in bridge for same reason as authMiddleware - see above.
 */
export function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Use flexAuth which handles both session and bearer tokens, with required: false
  const handler = _flexAuth(undefined, { required: false });
  handler(req, res, (err) => {
    if (err) {
      // Don't propagate the error - optional means we proceed anyway
      next();
      return;
    }

    // Map req.auth to req.user for backwards compatibility
    const authReq = req as any;
    if (authReq.auth) {
      authReq.user = {
        id: authReq.auth.userId,
        email: authReq.auth.email || '',
        roles: authReq.auth.roles || [],
        discordId: authReq.auth.discordId,
        walletAddress: authReq.auth.walletAddress,
      };
    }

    next();
  });
}

/**
 * Internal service authentication (kept for backwards compatibility)
 * Validates Bearer token against INTERNAL_API_SECRET
 */
export function internalServiceAuth(req: Request, _res: Response, next: NextFunction): void {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret || typeof secret !== 'string' || secret.trim() === '') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('INTERNAL_API_SECRET must be set to a non-empty string in production');
    }
    // Allow in dev (but warn)
    if (secret === '') {
      console.warn('[Auth] INTERNAL_API_SECRET is set to empty string - authentication will fail');
    }
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    // Middleware should reject, not pass
    throw new Error('Missing authorization header');
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    throw new Error('Invalid authorization format');
  }

  const token = parts[1];
  if (token !== secret) {
    throw new Error('Invalid service token');
  }

  next();
}
