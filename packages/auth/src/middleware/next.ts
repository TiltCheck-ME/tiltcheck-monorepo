/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * @tiltcheck/auth - Next.js Middleware
 * Authentication middleware for Next.js applications (App Router)
 */

import { NextRequest, NextResponse } from 'next/server';
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
 * Create authentication error response
 */
function createErrorResponse(error: AuthError): NextResponse {
  return NextResponse.json(
    { error: error.code, message: error.message },
    { status: error.status }
  );
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
 * Extract session token from Next.js request
 */
function extractToken(request: NextRequest, cookieName?: string): string | null {
  const config = getCookieConfig();
  const name = cookieName || config.name;
  
  // Try cookie first
  const cookie = request.cookies.get(name);
  if (cookie?.value) {
    return cookie.value;
  }
  
  // Fall back to Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return null;
}

/**
 * Verify authentication for Next.js middleware
 */
export async function verifyAuth(
  request: NextRequest,
  options: AuthMiddlewareOptions = {}
): Promise<{ 
  authenticated: boolean; 
  auth?: AuthContext; 
  error?: AuthError;
}> {
  const { roles, sessionType, cookieName } = options;
  const jwtConfig = getJWTConfig();
  
  if (!jwtConfig.secret) {
    return {
      authenticated: false,
      error: {
        code: 'SERVICE_ERROR',
        message: 'JWT configuration missing',
        status: 500,
      },
    };
  }
  
  const token = extractToken(request, cookieName);
  
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
    const result = await verifyToken(token, jwtConfig);
    
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
 * Create Next.js middleware for authentication
 */
export function createAuthMiddleware(
  options: AuthMiddlewareOptions & {
    publicPaths?: string[];
    loginPath?: string;
  } = {}
) {
  const { publicPaths = [], loginPath = '/login', required = true } = options;
  
  return async function authMiddleware(
    request: NextRequest
  ): Promise<NextResponse | null> {
    const { pathname } = request.nextUrl;
    
    // Check if path is public
    const isPublic = publicPaths.some((path) => {
      if (path.endsWith('*')) {
        return pathname.startsWith(path.slice(0, -1));
      }
      return pathname === path;
    });
    
    if (isPublic) {
      return null; // Continue to next middleware/route
    }
    
    const { authenticated, auth, error } = await verifyAuth(request, options);
    
    if (!authenticated) {
      if (!required) {
        return null;
      }
      
      // For API routes, return JSON error
      if (pathname.startsWith('/api/')) {
        return createErrorResponse(error!);
      }
      
      // For pages, redirect to login
      const url = request.nextUrl.clone();
      url.pathname = loginPath;
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
    
    // Add auth context to headers for server components
    const response = NextResponse.next();
    response.headers.set('x-user-id', auth!.userId);
    response.headers.set('x-session-type', auth!.sessionType);
    response.headers.set('x-roles', auth!.roles.join(','));
    
    if (auth!.discordId) {
      response.headers.set('x-discord-id', auth!.discordId);
    }
    
    if (auth!.walletAddress) {
      response.headers.set('x-wallet-address', auth!.walletAddress);
    }
    
    return response;
  };
}

/**
 * Helper to get auth context in API routes
 */
export async function getAuthContext(
  request: NextRequest,
  options: AuthMiddlewareOptions = {}
): Promise<AuthContext | null> {
  const { authenticated, auth } = await verifyAuth(request, options);
  return authenticated ? auth! : null;
}

/**
 * Helper to require auth in API routes
 */
export async function requireAuth(
  request: NextRequest,
  options: AuthMiddlewareOptions = {}
): Promise<{ auth: AuthContext } | { error: NextResponse }> {
  const { authenticated, auth, error } = await verifyAuth(request, options);
  
  if (!authenticated) {
    return { error: createErrorResponse(error!) };
  }
  
  return { auth: auth! };
}

/**
 * Helper to require admin in API routes
 */
export async function requireAdmin(
  request: NextRequest
): Promise<{ auth: AuthContext } | { error: NextResponse }> {
  return requireAuth(request, { sessionType: 'admin' });
}

/**
 * Helper to create session cookie header for responses
 */
export function createSessionCookieHeader(
  token: string,
  options?: { maxAge?: number }
): string {
  const config = getCookieConfig();
  const parts = [
    `${config.name}=${token}`,
    `Domain=${config.domain}`,
    `Path=${config.path}`,
    `Max-Age=${options?.maxAge ?? config.maxAge}`,
    config.secure ? 'Secure' : '',
    config.httpOnly ? 'HttpOnly' : '',
    `SameSite=${config.sameSite.charAt(0).toUpperCase() + config.sameSite.slice(1)}`,
  ].filter(Boolean);
  
  return parts.join('; ');
}

/**
 * Helper to clear session cookie
 */
export function clearSessionCookieHeader(): string {
  const config = getCookieConfig();
  return [
    `${config.name}=`,
    `Domain=${config.domain}`,
    `Path=${config.path}`,
    'Max-Age=0',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    config.secure ? 'Secure' : '',
    config.httpOnly ? 'HttpOnly' : '',
    `SameSite=${config.sameSite.charAt(0).toUpperCase() + config.sameSite.slice(1)}`,
  ].filter(Boolean).join('; ');
}

export type { AuthContext, AuthMiddlewareOptions, AuthError };
