/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * @tiltcheck/auth - Cookie Session Module
 * Cookie-based session management with JWT tokens
 * All cookies: Secure, HttpOnly, SameSite=Lax, Domain=.tiltcheck.me
 */

import type { 
  CookieConfig, 
  CookieOptions, 
  SessionData, 
  SessionType,
  JWTConfig 
} from './types.js';
import { createToken, verifyToken } from './jwt.js';

/**
 * Default cookie configuration for TiltCheck
 */
export const DEFAULT_COOKIE_CONFIG: CookieConfig = {
  name: 'tiltcheck_session',
  domain: '.tiltcheck.me',
  path: '/',
  secure: true,
  httpOnly: true,
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
};

/**
 * Cookie configuration for development (localhost)
 */
export const DEV_COOKIE_CONFIG: CookieConfig = {
  ...DEFAULT_COOKIE_CONFIG,
  domain: 'localhost',
  secure: false, // Allow HTTP in development
};

/**
 * Get the appropriate cookie config based on environment
 */
export function getCookieConfig(isDev?: boolean): CookieConfig {
  if (isDev ?? process.env.NODE_ENV === 'development') {
    return DEV_COOKIE_CONFIG;
  }
  return DEFAULT_COOKIE_CONFIG;
}

/**
 * Serialize cookie options to a Set-Cookie header string
 */
export function serializeCookie(
  name: string,
  value: string,
  options: CookieOptions = {}
): string {
  const config = getCookieConfig();
  const mergedOptions = { ...config, ...options };
  
  const parts = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`];
  
  if (mergedOptions.domain) {
    parts.push(`Domain=${mergedOptions.domain}`);
  }
  
  if (mergedOptions.path) {
    parts.push(`Path=${mergedOptions.path}`);
  }
  
  if (mergedOptions.maxAge !== undefined) {
    parts.push(`Max-Age=${mergedOptions.maxAge}`);
  }
  
  if (mergedOptions.expires) {
    parts.push(`Expires=${mergedOptions.expires.toUTCString()}`);
  }
  
  if (mergedOptions.secure) {
    parts.push('Secure');
  }
  
  if (mergedOptions.httpOnly) {
    parts.push('HttpOnly');
  }
  
  if (mergedOptions.sameSite) {
    parts.push(`SameSite=${mergedOptions.sameSite.charAt(0).toUpperCase() + mergedOptions.sameSite.slice(1)}`);
  }
  
  return parts.join('; ');
}

/**
 * Parse cookies from a Cookie header string
 */
export function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) {
    return {};
  }
  
  const cookies: Record<string, string> = {};
  
  cookieHeader.split(';').forEach((cookie) => {
    const [name, ...valueParts] = cookie.trim().split('=');
    if (name) {
      cookies[decodeURIComponent(name.trim())] = decodeURIComponent(valueParts.join('=').trim());
    }
  });
  
  return cookies;
}

/**
 * Create a session and return the cookie header value
 */
export async function createSession(
  userId: string,
  jwtConfig: JWTConfig,
  sessionData?: Partial<Omit<SessionData, 'userId' | 'createdAt'>>,
  cookieOptions?: Partial<CookieOptions>
): Promise<{ token: string; cookie: string; sessionData: SessionData }> {
  const config = getCookieConfig();
  const now = Math.floor(Date.now() / 1000);
  
  const fullSessionData: SessionData = {
    userId,
    type: sessionData?.type || 'user',
    discordId: sessionData?.discordId,
    discordUsername: sessionData?.discordUsername,
    walletAddress: sessionData?.walletAddress,
    roles: sessionData?.roles || [],
    createdAt: now,
  };
  
  // Create JWT with session data
  const token = await createToken(
    {
      sub: userId,
      type: fullSessionData.type,
      roles: fullSessionData.roles,
      discordId: fullSessionData.discordId,
      discordUsername: fullSessionData.discordUsername,
      walletAddress: fullSessionData.walletAddress,
    },
    jwtConfig
  );
  
  // Create cookie header
  const cookie = serializeCookie(config.name, token, {
    ...config,
    ...cookieOptions,
  });
  
  return { token, cookie, sessionData: fullSessionData };
}

/**
 * Destroy session by returning an expired cookie header
 */
export function destroySession(cookieOptions?: Partial<CookieOptions>): string {
  const config = getCookieConfig();
  
  return serializeCookie(config.name, '', {
    ...config,
    ...cookieOptions,
    maxAge: 0,
    expires: new Date(0),
  });
}

/**
 * Verify a session cookie and return the session data
 */
export async function verifySessionCookie(
  cookieHeader: string | undefined,
  jwtConfig: JWTConfig,
  cookieName?: string
): Promise<{ valid: boolean; session?: SessionData; error?: string }> {
  const config = getCookieConfig();
  const name = cookieName || config.name;
  
  const cookies = parseCookies(cookieHeader);
  const token = cookies[name];
  
  if (!token) {
    return { valid: false, error: 'Session cookie not found' };
  }
  
  const result = await verifyToken(token, jwtConfig);
  
  if (!result.valid || !result.payload) {
    return { valid: false, error: result.error || 'Invalid session token' };
  }
  
  const session: SessionData = {
    userId: result.payload.sub,
    type: result.payload.type as SessionType,
    discordId: result.payload.discordId as string | undefined,
    discordUsername: result.payload.discordUsername as string | undefined,
    walletAddress: result.payload.walletAddress as string | undefined,
    roles: result.payload.roles || [],
    createdAt: result.payload.iat,
  };
  
  return { valid: true, session };
}

/**
 * Extract session token from cookie header
 */
export function extractSessionToken(
  cookieHeader: string | undefined,
  cookieName?: string
): string | null {
  const config = getCookieConfig();
  const name = cookieName || config.name;
  const cookies = parseCookies(cookieHeader);
  return cookies[name] || null;
}

/**
 * Refresh a session (create new token with extended expiry)
 */
export async function refreshSession(
  cookieHeader: string | undefined,
  jwtConfig: JWTConfig,
  cookieName?: string
): Promise<{ valid: boolean; cookie?: string; session?: SessionData; error?: string }> {
  const verification = await verifySessionCookie(cookieHeader, jwtConfig, cookieName);
  
  if (!verification.valid || !verification.session) {
    return { valid: false, error: verification.error };
  }
  
  // Create new session with same data but fresh token
  const { cookie, sessionData } = await createSession(
    verification.session.userId,
    jwtConfig,
    verification.session
  );
  
  return { valid: true, cookie, session: sessionData };
}

export type { CookieConfig, CookieOptions, SessionData };
