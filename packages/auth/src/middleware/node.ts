/**
 * @tiltcheck/auth - Node.js HTTP Handler Middleware
 * Authentication for vanilla Node.js HTTP servers
 */

import type { IncomingMessage, ServerResponse } from 'http';
import type { 
  AuthContext, 
  AuthMiddlewareOptions, 
  AuthError, 
  SessionData,
  JWTConfig 
} from '../types.js';
import { verifyToken } from '../jwt.js';
import { parseCookies, getCookieConfig } from '../cookies.js';

/**
 * Extended request with auth context
 */
export interface AuthenticatedRequest extends IncomingMessage {
  auth?: AuthContext;
  session?: SessionData;
}

/**
 * Middleware function type
 */
export type NodeMiddleware = (
  req: AuthenticatedRequest,
  res: ServerResponse,
  next: (error?: Error) => void
) => void | Promise<void>;

/**
 * Create auth error response
 */
function sendError(res: ServerResponse, error: AuthError): void {
  res.writeHead(error.status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: error.code, message: error.message }));
}

/**
 * Get JWT config from environment
 */
function getJWTConfig(): JWTConfig {
  return {
    secret: process.env.JWT_SECRET || '',
    issuer: process.env.JWT_ISSUER || 'tiltcheck.me',
    audience: process.env.JWT_AUDIENCE || 'tiltcheck.me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  };
}

/**
 * Extract token from request
 */
function extractToken(req: IncomingMessage, cookieName?: string): string | null {
  const config = getCookieConfig();
  const name = cookieName || config.name;
  
  // Try cookie first
  const cookies = parseCookies(req.headers.cookie);
  if (cookies[name]) {
    return cookies[name];
  }
  
  // Fall back to Authorization header
  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return null;
}

/**
 * Create authentication middleware for Node.js HTTP servers
 */
export function createNodeAuthMiddleware(
  jwtConfig?: JWTConfig,
  options: AuthMiddlewareOptions = {}
): NodeMiddleware {
  const config = jwtConfig || getJWTConfig();
  const { required = true, roles, sessionType, cookieName } = options;
  
  return async (
    req: AuthenticatedRequest,
    res: ServerResponse,
    next: (error?: Error) => void
  ): Promise<void> => {
    const token = extractToken(req, cookieName);
    
    if (!token) {
      if (required) {
        sendError(res, {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          status: 401,
        });
        return;
      }
      next();
      return;
    }
    
    try {
      const result = await verifyToken(token, config);
      
      if (!result.valid || !result.payload) {
        if (required) {
          sendError(res, {
            code: result.error?.includes('expired') ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID',
            message: result.error || 'Invalid token',
            status: 401,
          });
          return;
        }
        next();
        return;
      }
      
      const payload = result.payload;
      
      // Check session type
      if (sessionType && payload.type !== sessionType) {
        sendError(res, {
          code: 'FORBIDDEN',
          message: `${sessionType} session required`,
          status: 403,
        });
        return;
      }
      
      // Check roles
      if (roles && roles.length > 0) {
        const hasRole = roles.some((role) => payload.roles?.includes(role));
        if (!hasRole) {
          sendError(res, {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Insufficient permissions',
            status: 403,
          });
          return;
        }
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
      req.session = session;
      
      next();
    } catch (error) {
      if (required) {
        sendError(res, {
          code: 'SERVICE_ERROR',
          message: 'Authentication service error',
          status: 500,
        });
        return;
      }
      next();
    }
  };
}

/**
 * Verify auth from request (for use in handlers)
 */
export async function verifyAuthFromRequest(
  req: IncomingMessage,
  jwtConfig?: JWTConfig,
  options: AuthMiddlewareOptions = {}
): Promise<{
  authenticated: boolean;
  auth?: AuthContext;
  error?: AuthError;
}> {
  const config = jwtConfig || getJWTConfig();
  const { roles, sessionType, cookieName } = options;
  
  const token = extractToken(req, cookieName);
  
  if (!token) {
    return {
      authenticated: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        status: 401,
      },
    };
  }
  
  try {
    const result = await verifyToken(token, config);
    
    if (!result.valid || !result.payload) {
      return {
        authenticated: false,
        error: {
          code: result.error?.includes('expired') ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID',
          message: result.error || 'Invalid token',
          status: 401,
        },
      };
    }
    
    const payload = result.payload;
    
    // Check session type
    if (sessionType && payload.type !== sessionType) {
      return {
        authenticated: false,
        error: {
          code: 'FORBIDDEN',
          message: `${sessionType} session required`,
          status: 403,
        },
      };
    }
    
    // Check roles
    if (roles && roles.length > 0) {
      const hasRole = roles.some((role) => payload.roles?.includes(role));
      if (!hasRole) {
        return {
          authenticated: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Insufficient permissions',
            status: 403,
          },
        };
      }
    }
    
    const session: SessionData = {
      userId: payload.sub,
      type: payload.type,
      discordId: payload.discordId as string | undefined,
      walletAddress: payload.walletAddress as string | undefined,
      roles: payload.roles || [],
      createdAt: payload.iat,
    };
    
    return {
      authenticated: true,
      auth: {
        userId: payload.sub,
        sessionType: payload.type,
        discordId: session.discordId,
        walletAddress: session.walletAddress,
        roles: payload.roles || [],
        isAdmin: payload.type === 'admin',
        session,
      },
    };
  } catch {
    return {
      authenticated: false,
      error: {
        code: 'SERVICE_ERROR',
        message: 'Authentication service error',
        status: 500,
      },
    };
  }
}

/**
 * Create a simple middleware runner for Node.js
 */
export function runMiddleware(
  req: AuthenticatedRequest,
  res: ServerResponse,
  middleware: NodeMiddleware
): Promise<void> {
  return new Promise((resolve, reject) => {
    middleware(req, res, (error?: Error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

export type { AuthContext, AuthMiddlewareOptions, AuthError, SessionData };
