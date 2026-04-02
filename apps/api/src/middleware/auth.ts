/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * JWT Authentication Middleware
 * 
 * Verifies JWT tokens from Authorization header and attaches user to req.user
 */

import type { Request, Response, NextFunction } from 'express';
import { findUserById } from '@tiltcheck/db';
import { verifySessionCookie, verifyToken, type JWTConfig, type JWTPayload } from '@tiltcheck/auth';

/**
 * Get unified JWT configuration
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
 * Extended Request with user data
 */
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    roles: string[];
    discordId?: string;
    walletAddress?: string;
  };
}

/**
 * Get JWT secret from environment
 */
function getJWTSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return secret;
}

async function getSessionUser(req: Request): Promise<AuthRequest['user'] | null> {
  try {
    const cookieHeader = req.headers.cookie;
    const jwtConfig = getJWTConfig();
    const result = await verifySessionCookie(cookieHeader, jwtConfig);
    if (!result.valid || !result.session) return null;
    const session = result.session;
    return {
      id: session.userId,
      email: `${session.userId}@session.local`,
      roles: Array.isArray(session.roles) ? session.roles : [],
      discordId: session.discordId,
      walletAddress: session.walletAddress,
    };
  } catch {
    return null;
  }
}

/**
 * Middleware to verify JWT token and attach user to request
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      const sessionUser = await getSessionUser(req);
      if (sessionUser) {
        (req as AuthRequest).user = sessionUser;
        next();
        return;
      }
      res.status(401).json({
        error: 'No authorization header',
        code: 'UNAUTHORIZED'
      });
      return;
    }
    
    // Check for Bearer token format
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      res.status(401).json({ 
        error: 'Invalid authorization format. Expected: Bearer <token>', 
        code: 'INVALID_TOKEN_FORMAT' 
      });
      return;
    }
    
    const token = parts[1];
    const jwtConfig = getJWTConfig();
    
    // Verify token using @tiltcheck/auth
    const result = await verifyToken(token, jwtConfig);
    
    if (!result.valid || !result.payload) {
      const sessionUser = await getSessionUser(req);
      if (sessionUser) {
        (req as AuthRequest).user = sessionUser;
        next();
        return;
      }
      
      if (result.error?.includes('expired')) {
        res.status(401).json({
          error: 'Token expired',
          code: 'TOKEN_EXPIRED'
        });
        return;
      }
      
      res.status(401).json({
        error: result.error || 'Invalid token',
        code: 'INVALID_TOKEN'
      });
      return;
    }
    
    const payload = result.payload as JWTPayloadExt;
    
    // Get userId from either sub or userId field
    const userId = payload.sub || payload.userId;
    if (!userId) {
      res.status(401).json({ 
        error: 'Token missing user ID', 
        code: 'INVALID_TOKEN' 
      });
      return;
    }
    
    // Verify user still exists in database
    const user = await findUserById(userId);
    if (!user) {
      res.status(401).json({ 
        error: 'User not found', 
        code: 'USER_NOT_FOUND' 
      });
      return;
    }
    
    // Attach user to request
    (req as AuthRequest).user = {
      id: user.id,
      email: user.email || payload.email || '',
      roles: payload.roles || user.roles || [],
      discordId: user.discord_id || payload.discordId,
      walletAddress: user.wallet_address || payload.walletAddress,
    };
    
    next();
  } catch (error) {
    console.error('[Auth Middleware] Error:', error);
    res.status(500).json({ 
      error: 'Authentication failed', 
      code: 'AUTH_ERROR' 
    });
  }
}

/**
 * Optional auth middleware - doesn't fail if no token provided
 * Useful for routes that work both authenticated and unauthenticated
 */
export async function optionalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    next();
    return;
  }
  
  // If header exists, validate it
  await authMiddleware(req, res, next);
}
/**
 * Middleware for internal service-to-service authentication
 * Compares Bearer token against INTERNAL_API_SECRET
 */
export function internalServiceAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const secret = process.env.INTERNAL_API_SECRET;
  
  if (!secret) {
    if (process.env.NODE_ENV !== 'production') {
       next(); // Skip in dev if not set
       return;
    }
    res.status(503).json({ error: 'Internal auth unconfigured' });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Bearer token required' });
    return;
  }

  const token = authHeader.substring(7);
  if (token !== secret) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  next();
}
