/**
 * @tiltcheck/utils - Crypto Helpers
 * Cryptographic utilities for tokens, hashing, etc.
 */

import { randomBytes, createHash, createHmac } from 'crypto';

// ============================================================================
// Random Generation
// ============================================================================

/**
 * Generate a random hex string
 */
export function randomHex(bytes: number = 32): string {
  return randomBytes(bytes).toString('hex');
}

/**
 * Generate a random base64 string
 */
export function randomBase64(bytes: number = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/**
 * Generate a random numeric string
 */
export function randomNumeric(length: number = 6): string {
  const max = Math.pow(10, length);
  const random = randomBytes(4).readUInt32BE(0);
  return String(random % max).padStart(length, '0');
}

/**
 * Generate a UUID v4
 */
export function generateUUID(): string {
  const bytes = randomBytes(16);
  
  // Set version (4) and variant (10xx)
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  
  const hex = bytes.toString('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

// ============================================================================
// Hashing
// ============================================================================

/**
 * Create a SHA-256 hash
 */
export function sha256(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Create a SHA-512 hash
 */
export function sha512(data: string): string {
  return createHash('sha512').update(data).digest('hex');
}

/**
 * Create an HMAC
 */
export function hmac(data: string, secret: string, algorithm: 'sha256' | 'sha512' = 'sha256'): string {
  return createHmac(algorithm, secret).update(data).digest('hex');
}

/**
 * Hash a token for storage (one-way)
 */
export function hashToken(token: string): string {
  return sha256(token);
}

// ============================================================================
// Token Generation
// ============================================================================

/**
 * Generate a secure API token
 */
export function generateApiToken(): string {
  return `tc_${randomBase64(32)}`;
}

/**
 * Generate a magic link token
 */
export function generateMagicLinkToken(): string {
  return randomBase64(48);
}

/**
 * Generate a session token
 */
export function generateSessionToken(): string {
  return randomBase64(32);
}

/**
 * Generate a nonce for signatures
 */
export function generateNonce(): string {
  return randomHex(16);
}

// ============================================================================
// Timing-Safe Comparison
// ============================================================================

/**
 * Constant-time string comparison to prevent timing attacks
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  
  let result = 0;
  for (let i = 0; i < bufA.length; i++) {
    result |= bufA[i] ^ bufB[i];
  }
  
  return result === 0;
}

/**
 * Verify a token against a hash
 */
export function verifyToken(token: string, hash: string): boolean {
  const tokenHash = hashToken(token);
  return timingSafeEqual(tokenHash, hash);
}
