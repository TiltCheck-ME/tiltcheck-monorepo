/**
 * Express Auth Middleware
 * Authentication middleware for Express routes using Supabase Auth
 */

import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { SupabaseAuthClient, createAuthClientFromEnv } from './client.js';
import type { AuthUser, AuthSession } from './types.js';

// Extend Express Request type to include auth properties
// eslint-disable-next-line @typescript-eslint/no-namespace
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Authenticated user (set by auth middleware) */
      user?: AuthUser;
      /** Current auth session (set by auth middleware) */
      authSession?: AuthSession;
      /** Auth client instance */
      authClient?: SupabaseAuthClient;
    }
  }
}

/**
 * Middleware options
 */
export interface AuthMiddlewareOptions {
  /** Auth client instance (optional - creates from env if not provided) */
  authClient?: SupabaseAuthClient;
  /** Header name for access token (default: 'authorization') */
  tokenHeader?: string;
  /** Token prefix to strip (default: 'Bearer ') */
  tokenPrefix?: string;
  /** Whether to require authentication (default: true) */
  required?: boolean;
  /** Custom unauthorized response handler */
  onUnauthorized?: (req: Request, res: Response, next: NextFunction) => void;
}

/**
 * Extract access token from request
 */
function extractToken(req: Request, options: AuthMiddlewareOptions): string | null {
  const headerName = options.tokenHeader || 'authorization';
  const prefix = options.tokenPrefix || 'Bearer ';
  
  const header = req.headers[headerName.toLowerCase()];
  if (!header || typeof header !== 'string') {
    return null;
  }

  if (header.startsWith(prefix)) {
    return header.slice(prefix.length);
  }

  return header;
}

/**
 * Default unauthorized handler
 */
function defaultUnauthorized(_req: Request, res: Response, _next: NextFunction): void {
  res.status(401).json({
    error: 'Unauthorized',
    message: 'Authentication required',
  });
}

/**
 * Create authentication middleware
 * Validates the access token and attaches user info to request
 */
export function authMiddleware(options: AuthMiddlewareOptions = {}): RequestHandler {
  // Create or use provided auth client - shared across all requests handled by this middleware
  const authClient: SupabaseAuthClient = options.authClient || createAuthClientFromEnv();
  
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Attach auth client to request
      req.authClient = authClient;

      // Extract token
      const token = extractToken(req, options);

      if (!token) {
        if (options.required !== false) {
          const handler = options.onUnauthorized || defaultUnauthorized;
          handler(req, res, next);
          return;
        }
        // Token not required, continue without auth
        next();
        return;
      }

      // Validate token by getting user
      const { data: user, error } = await authClient.getUser();

      if (error || !user) {
        if (options.required !== false) {
          const handler = options.onUnauthorized || defaultUnauthorized;
          handler(req, res, next);
          return;
        }
        // Token invalid but not required
        next();
        return;
      }

      // Attach user to request
      req.user = user;

      // Get full session if needed
      const { data: authSessionData } = await authClient.getSession();
      if (authSessionData) {
        req.authSession = authSessionData;
      }

      next();
    } catch (err) {
      // Handle unexpected errors
      console.error('[AuthMiddleware] Error:', err);
      if (options.required !== false) {
        res.status(500).json({
          error: 'Internal Server Error',
          message: 'Authentication service unavailable',
        });
        return;
      }
      next();
    }
  };
}

/**
 * Require authentication middleware
 * Shorthand for authMiddleware with required: true
 */
export function requireAuth(options: Omit<AuthMiddlewareOptions, 'required'> = {}): RequestHandler {
  return authMiddleware({ ...options, required: true });
}

/**
 * Optional authentication middleware
 * Attaches user if token provided, continues without if not
 */
export function optionalAuth(options: Omit<AuthMiddlewareOptions, 'required'> = {}): RequestHandler {
  return authMiddleware({ ...options, required: false });
}

/**
 * Role-based authorization middleware
 * Checks if the authenticated user has the required role
 */
export function requireRole(role: string, _options: AuthMiddlewareOptions = {}): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // First, ensure user is authenticated
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    // Check role in app metadata
    const userRoles = req.user.appMetadata?.roles || [];
    const userRole = req.user.appMetadata?.role;

    if (Array.isArray(userRoles) && userRoles.includes(role)) {
      next();
      return;
    }

    if (userRole === role) {
      next();
      return;
    }

    res.status(403).json({
      error: 'Forbidden',
      message: `Role '${role}' required`,
    });
  };
}

/**
 * Verified email middleware
 * Requires user to have a verified email
 */
export function requireVerifiedEmail(): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    if (!req.user.emailConfirmed) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Email verification required',
      });
      return;
    }

    next();
  };
}

/**
 * Discord linked account middleware
 * Requires user to have Discord OAuth linked
 */
export function requireDiscordLinked(): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    if (!req.user.discordId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Discord account linking required',
      });
      return;
    }

    next();
  };
}
