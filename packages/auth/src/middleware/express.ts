/**
 * @tiltcheck/auth - Express Middleware
 * Authentication middleware for Express.js applications
 */

import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { 
  AuthContext, 
  AuthMiddlewareOptions, 
  AuthError, 
  SessionData,
  JWTConfig,
  ServiceTokenConfig 
} from '../types.js';
import { verifySessionCookie, extractSessionToken } from '../cookies.js';
import { verifyToken } from '../jwt.js';
import { verifyServiceAuthHeader } from '../service.js';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
      tiltcheckSession?: SessionData;
    }
  }
}

/**
 * Create authentication error
 */
function createAuthError(
  code: AuthError['code'],
  message: string,
  status: number
): AuthError {
  return { code, message, status };
}

/**
 * Default unauthorized handler
 */
function defaultUnauthorizedHandler(
  error: AuthError,
  _req: Request,
  res: Response
): void {
  res.status(error.status).json({
    error: error.code,
    message: error.message,
  });
}

/**
 * Create JWT config from environment
 */
export function getJWTConfigFromEnv(): JWTConfig {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  
  return {
    secret,
    issuer: process.env.JWT_ISSUER || 'tiltcheck.me',
    audience: process.env.JWT_AUDIENCE || 'tiltcheck.me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  };
}

/**
 * Session authentication middleware
 * Verifies session cookie and attaches auth context to request
 */
export function sessionAuth(
  jwtConfig?: JWTConfig,
  options: AuthMiddlewareOptions = {}
): RequestHandler {
  const config = jwtConfig || getJWTConfigFromEnv();
  const { required = true, roles, sessionType, cookieName } = options;
  
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const cookieHeader = req.headers.cookie;
      const result = await verifySessionCookie(cookieHeader, config, cookieName);
      
      if (!result.valid || !result.session) {
        if (required) {
          const error = createAuthError(
            'UNAUTHORIZED',
            result.error || 'Authentication required',
            401
          );
          defaultUnauthorizedHandler(error, req, res);
          return;
        }
        next();
        return;
      }
      
      const session = result.session;
      
      // Check session type if required
      if (sessionType && session.type !== sessionType) {
        const error = createAuthError(
          'FORBIDDEN',
          `${sessionType} session required`,
          403
        );
        defaultUnauthorizedHandler(error, req, res);
        return;
      }
      
      // Check roles if required
      if (roles && roles.length > 0) {
        const hasRole = roles.some((role) => session.roles?.includes(role));
        if (!hasRole) {
          const error = createAuthError(
            'INSUFFICIENT_PERMISSIONS',
            'Insufficient permissions',
            403
          );
          defaultUnauthorizedHandler(error, req, res);
          return;
        }
      }
      
      // Attach auth context
      req.auth = {
        userId: session.userId,
        sessionType: session.type,
        discordId: session.discordId,
        walletAddress: session.walletAddress,
        roles: session.roles || [],
        isAdmin: session.type === 'admin',
        session,
      };
      req.tiltcheckSession = session;
      
      next();
    } catch (error) {
      const authError = createAuthError(
        'SERVICE_ERROR',
        'Authentication service error',
        500
      );
      defaultUnauthorizedHandler(authError, req, res);
    }
  };
}

/**
 * Bearer token authentication middleware
 * Verifies JWT from Authorization header
 */
export function bearerAuth(
  jwtConfig?: JWTConfig,
  options: AuthMiddlewareOptions = {}
): RequestHandler {
  const config = jwtConfig || getJWTConfigFromEnv();
  const { required = true, roles, sessionType } = options;
  
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        if (required) {
          const error = createAuthError(
            'UNAUTHORIZED',
            'Bearer token required',
            401
          );
          defaultUnauthorizedHandler(error, req, res);
          return;
        }
        next();
        return;
      }
      
      const token = authHeader.substring(7);
      const result = await verifyToken(token, config);
      
      if (!result.valid || !result.payload) {
        const error = createAuthError(
          result.error?.includes('expired') ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID',
          result.error || 'Invalid token',
          401
        );
        defaultUnauthorizedHandler(error, req, res);
        return;
      }
      
      const payload = result.payload;
      
      // Check session type if required
      if (sessionType && payload.type !== sessionType) {
        const error = createAuthError(
          'FORBIDDEN',
          `${sessionType} session required`,
          403
        );
        defaultUnauthorizedHandler(error, req, res);
        return;
      }
      
      // Check roles if required
      if (roles && roles.length > 0) {
        const hasRole = roles.some((role) => payload.roles?.includes(role));
        if (!hasRole) {
          const error = createAuthError(
            'INSUFFICIENT_PERMISSIONS',
            'Insufficient permissions',
            403
          );
          defaultUnauthorizedHandler(error, req, res);
          return;
        }
      }
      
      // Attach auth context
      const session: SessionData = {
        userId: payload.sub,
        type: payload.type,
        discordId: payload.discordId as string | undefined,
        walletAddress: payload.walletAddress as string | undefined,
        roles: payload.roles || [],
        createdAt: payload.iat,
      };
      
      req.auth = {
        userId: payload.sub,
        sessionType: payload.type,
        discordId: session.discordId,
        walletAddress: session.walletAddress,
        roles: payload.roles || [],
        isAdmin: payload.type === 'admin',
        session,
      };
      req.tiltcheckSession = session;
      
      next();
    } catch (error) {
      const authError = createAuthError(
        'SERVICE_ERROR',
        'Authentication service error',
        500
      );
      defaultUnauthorizedHandler(authError, req, res);
    }
  };
}

/**
 * Service-to-service authentication middleware
 */
export function serviceAuth(
  serviceConfig?: ServiceTokenConfig,
  options: { required?: boolean } = {}
): RequestHandler {
  const { required = true } = options;
  
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const config = serviceConfig || {
        secret: process.env.SERVICE_JWT_SECRET || '',
        serviceId: process.env.SERVICE_ID || 'unknown',
        allowedServices: (process.env.ALLOWED_SERVICES || '').split(','),
        expiresIn: '5m',
      };
      
      const result = await verifyServiceAuthHeader(
        req.headers.authorization,
        config
      );
      
      if (!result.valid) {
        if (required) {
          const error = createAuthError(
            'UNAUTHORIZED',
            result.error || 'Service authentication required',
            401
          );
          defaultUnauthorizedHandler(error, req, res);
          return;
        }
        next();
        return;
      }
      
      // Attach service context to request
      (req as Request & { service?: { id: string; context?: Record<string, unknown> } }).service = {
        id: result.serviceId!,
        context: result.context,
      };
      
      next();
    } catch (error) {
      const authError = createAuthError(
        'SERVICE_ERROR',
        'Service authentication error',
        500
      );
      defaultUnauthorizedHandler(authError, req, res);
    }
  };
}

/**
 * Combined auth middleware that tries session cookie first, then bearer token
 */
export function flexAuth(
  jwtConfig?: JWTConfig,
  options: AuthMiddlewareOptions = {}
): RequestHandler {
  const config = jwtConfig || getJWTConfigFromEnv();
  const { required = true, roles, sessionType, cookieName } = options;
  
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Try session cookie first
    const cookieHeader = req.headers.cookie;
    const token = extractSessionToken(cookieHeader, cookieName);
    
    // Fall back to Bearer token
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;
    
    const tokenToVerify = token || bearerToken;
    
    if (!tokenToVerify) {
      if (required) {
        const error = createAuthError(
          'UNAUTHORIZED',
          'Authentication required',
          401
        );
        defaultUnauthorizedHandler(error, req, res);
        return;
      }
      next();
      return;
    }
    
    try {
      const result = await verifyToken(tokenToVerify, config);
      
      if (!result.valid || !result.payload) {
        if (required) {
          const error = createAuthError(
            result.error?.includes('expired') ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID',
            result.error || 'Invalid token',
            401
          );
          defaultUnauthorizedHandler(error, req, res);
          return;
        }
        next();
        return;
      }
      
      const payload = result.payload;
      
      // Check session type
      if (sessionType && payload.type !== sessionType) {
        const error = createAuthError('FORBIDDEN', `${sessionType} session required`, 403);
        defaultUnauthorizedHandler(error, req, res);
        return;
      }
      
      // Check roles
      if (roles && roles.length > 0 && !roles.some((r) => payload.roles?.includes(r))) {
        const error = createAuthError('INSUFFICIENT_PERMISSIONS', 'Insufficient permissions', 403);
        defaultUnauthorizedHandler(error, req, res);
        return;
      }
      
      const session: SessionData = {
        userId: payload.sub,
        type: payload.type,
        discordId: payload.discordId as string | undefined,
        walletAddress: payload.walletAddress as string | undefined,
        roles: payload.roles || [],
        createdAt: payload.iat,
      };
      
      req.auth = {
        userId: payload.sub,
        sessionType: payload.type,
        discordId: session.discordId,
        walletAddress: session.walletAddress,
        roles: payload.roles || [],
        isAdmin: payload.type === 'admin',
        session,
      };
      req.tiltcheckSession = session;
      
      next();
    } catch (error) {
      const authError = createAuthError('SERVICE_ERROR', 'Authentication service error', 500);
      defaultUnauthorizedHandler(authError, req, res);
    }
  };
}

/**
 * Admin-only middleware (must be used after session/bearer auth)
 */
export function adminOnly(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth?.isAdmin) {
      const error = createAuthError('FORBIDDEN', 'Admin access required', 403);
      defaultUnauthorizedHandler(error, req, res);
      return;
    }
    next();
  };
}

/**
 * Role requirement middleware (must be used after session/bearer auth)
 */
export function requireRoles(...roles: string[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const hasRole = roles.some((role) => req.auth?.roles.includes(role));
    if (!hasRole) {
      const error = createAuthError('INSUFFICIENT_PERMISSIONS', 'Insufficient permissions', 403);
      defaultUnauthorizedHandler(error, req, res);
      return;
    }
    next();
  };
}

export type { AuthContext, AuthMiddlewareOptions, AuthError };
