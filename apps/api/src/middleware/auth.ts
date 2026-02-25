/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * JWT Authentication Middleware
 * 
 * Verifies JWT tokens from Authorization header and attaches user to req.user
 */

import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { findUserById } from '@tiltcheck/db';

/**
 * JWT payload structure
 */
export interface JWTPayload {
  userId: string;
  email: string;
  roles: string[];
  iat?: number;
  exp?: number;
}

/**
 * Extended Request with user data
 */
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    roles: string[];
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
    const secret = getJWTSecret();
    
    // Verify token
    let payload: JWTPayload;
    try {
      payload = jwt.verify(token, secret) as JWTPayload;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        res.status(401).json({ 
          error: 'Token expired', 
          code: 'TOKEN_EXPIRED' 
        });
        return;
      }
      if (err instanceof jwt.JsonWebTokenError) {
        res.status(401).json({ 
          error: 'Invalid token', 
          code: 'INVALID_TOKEN' 
        });
        return;
      }
      throw err;
    }
    
    // Verify user still exists in database
    const user = await findUserById(payload.userId);
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
      email: user.email || payload.email,
      roles: user.roles,
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
