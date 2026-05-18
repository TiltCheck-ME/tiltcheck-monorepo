/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * @tiltcheck/auth - JWT Module
 * JWT token issuance and verification using jose library
 */

import { SignJWT, jwtVerify, type JWTPayload as JoseJWTPayload, generateKeyPair, exportJWK, importPKCS8, importSPKI, type JWK } from 'jose';
import type { JWTConfig, JWTPayload, JWTVerifyResult, SessionType } from './types.js';

/**
 * Default JWT configuration
 */
const DEFAULT_CONFIG: Partial<JWTConfig> = {
  issuer: 'tiltcheck.me',
  audience: 'tiltcheck.me',
  expiresIn: '7d',
  algorithm: 'HS256',
};

/**
 * Parse duration string to seconds
 * Supports: '7d', '24h', '30m', '60s'
 */
function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([dhms])$/);
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }
  
  const value = parseInt(match[1], 10);
  const unit = match[2];
  
  switch (unit) {
    case 'd': return value * 24 * 60 * 60;
    case 'h': return value * 60 * 60;
    case 'm': return value * 60;
    case 's': return value;
    default: throw new Error(`Unknown duration unit: ${unit}`);
  }
}

/**
 * Create a new JWT token
 */
export async function createToken(
  payload: Omit<JWTPayload, 'iat' | 'exp' | 'iss' | 'aud'>,
  config: JWTConfig
): Promise<string> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const secret = new TextEncoder().encode(mergedConfig.secret);
  
  const expiresInSeconds = parseDuration(mergedConfig.expiresIn!);
  const now = Math.floor(Date.now() / 1000);
  
  // Validate required fields
  if (!payload.sub || typeof payload.sub !== 'string') {
    throw new Error('payload.sub must be a non-empty string');
  }
  
  const jwt = new SignJWT({
    ...payload,
    type: payload.type,
    roles: payload.roles || [],
  } as unknown as JoseJWTPayload)
    .setProtectedHeader({ alg: mergedConfig.algorithm! })
    .setIssuedAt(now)
    .setExpirationTime(now + expiresInSeconds)
    .setIssuer(mergedConfig.issuer!)
    .setAudience(mergedConfig.audience!)
    .setSubject(payload.sub);

  if (payload.jti && typeof payload.jti === 'string') {
    jwt.setJti(payload.jti);
  }

  return jwt.sign(secret);
}

/**
 * Verify a JWT token
 */
export async function verifyToken(
  token: string,
  config: JWTConfig
): Promise<JWTVerifyResult> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const secret = new TextEncoder().encode(mergedConfig.secret);

  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer: mergedConfig.issuer,
      audience: mergedConfig.audience,
    });

    return {
      valid: true,
      payload: {
        sub: payload.sub as string,
        iat: payload.iat as number,
        exp: payload.exp as number,
        iss: payload.iss as string,
        aud: Array.isArray(payload.aud) ? payload.aud[0] : (payload.aud as string),
        jti: payload.jti as string | undefined,
        type: (payload.type as SessionType) || 'user',
        roles: (payload.roles as string[]) || [],
        ...payload,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Token verification failed';
    
    if (message.includes('expired')) {
      return { valid: false, error: 'Token has expired' };
    }
    if (message.includes('signature')) {
      return { valid: false, error: 'Invalid token signature' };
    }
    
    return { valid: false, error: message };
  }
}

/**
 * Decode a JWT token without verification (for debugging)
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf-8')
    );
    
    return payload as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Check if a token is expired
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodeToken(token);
  if (!payload || !payload.exp) {
    return true;
  }
  
  return payload.exp < Math.floor(Date.now() / 1000);
}

/**
 * Get time until token expiration in seconds
 */
export function getTokenTTL(token: string): number {
  const payload = decodeToken(token);
  if (!payload || !payload.exp) {
    return 0;
  }
  
  const ttl = payload.exp - Math.floor(Date.now() / 1000);
  return Math.max(0, ttl);
}

/**
 * Create a session token for a user
 */
export async function createSessionToken(
  userId: string,
  type: SessionType,
  roles: string[],
  config: JWTConfig,
  additionalClaims?: Record<string, unknown>
): Promise<string> {
  return createToken(
    {
      sub: userId,
      type,
      roles,
      ...additionalClaims,
    },
    config
  );
}

/**
 * Create an admin session token
 */
export async function createAdminToken(
  adminId: string,
  email: string,
  roles: string[],
  permissions: string[],
  config: JWTConfig
): Promise<string> {
  return createToken(
    {
      sub: adminId,
      type: 'admin',
      roles,
      email,
      permissions,
    },
    config
  );
}

// ============================================================
// OIDC / RS256 ASYMMETRIC KEY MANAGEMENT FOR MAGIC TEE
// ============================================================

let oidcKeyPair: { privateKey: any; publicKey: any } | null = null;
let oidcJWK: JWK | null = null;

/**
 * Get or dynamically generate the RS256 key pair for OIDC.
 */
export async function getOidcKeys(): Promise<{ privateKey: any; publicKey: any; jwk: JWK }> {
  if (oidcKeyPair && oidcJWK) {
    return { ...oidcKeyPair, jwk: oidcJWK };
  }

  const privateKeyPem = process.env.OIDC_PRIVATE_KEY_PEM?.replace(/\\n/g, '\n');
  const publicKeyPem = process.env.OIDC_PUBLIC_KEY_PEM?.replace(/\\n/g, '\n');

  if (privateKeyPem && publicKeyPem) {
    try {
      const privateKey = await importPKCS8(privateKeyPem, 'RS256');
      const publicKey = await importSPKI(publicKeyPem, 'RS256');
      const jwk = await exportJWK(publicKey);
      jwk.kid = process.env.OIDC_KEY_ID || 'tiltcheck-key-1';
      jwk.use = 'sig';
      jwk.alg = 'RS256';
      
      oidcKeyPair = { privateKey, publicKey };
      oidcJWK = jwk;
      return { privateKey, publicKey, jwk };
    } catch (err) {
      console.error('[OIDC] Failed to import OIDC keys from PEM, falling back to dynamic generation:', err);
    }
  }

  // Ephemeral key pair generation
  const { privateKey, publicKey } = await generateKeyPair('RS256', {
    modulusLength: 2048,
  });
  
  const jwk = await exportJWK(publicKey);
  jwk.kid = 'tiltcheck-ephemeral-key';
  jwk.use = 'sig';
  jwk.alg = 'RS256';
  
  oidcKeyPair = { privateKey, publicKey };
  oidcJWK = jwk;
  return { privateKey, publicKey, jwk };
}

/**
 * Sign an OIDC ID Token for a user to pass to Magic TEE Wallets
 */
export async function signOidcToken(
  user: { id: string; email: string },
  issuer: string,
  audience: string,
  expiresInSeconds = 3600
): Promise<string> {
  const { privateKey, jwk } = await getOidcKeys();
  const now = Math.floor(Date.now() / 1000);
  
  return new SignJWT({
    email: user.email,
    email_verified: true,
  })
    .setProtectedHeader({ alg: 'RS256', kid: jwk.kid })
    .setIssuedAt(now)
    .setExpirationTime(now + expiresInSeconds)
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject(user.id)
    .sign(privateKey);
}

export type { JWTConfig, JWTPayload, JWTVerifyResult };
