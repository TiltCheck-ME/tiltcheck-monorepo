/**
 * @tiltcheck/auth-flow - JWT Module
 *
 * Provides `issueToken` and `verifyToken` backed by the `jose` library.
 * Reads the signing secret from the `JWT_SECRET` environment variable.
 *
 * Environment variables:
 *   JWT_SECRET   (required) - HMAC-SHA256 signing secret
 *   JWT_EXPIRES_IN (optional) - token lifetime, e.g. "7d", "24h", "30m" (default: "7d")
 *   JWT_ISSUER   (optional) - token issuer claim (default: "tiltcheck.me")
 *   JWT_AUDIENCE (optional) - token audience claim (default: "tiltcheck.me")
 */

import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getSecret(): Uint8Array {
  const raw = process.env['JWT_SECRET'];
  if (!raw || raw.trim() === '') {
    throw new Error(
      '[auth-flow] JWT_SECRET environment variable is not set or is empty.'
    );
  }
  return new TextEncoder().encode(raw);
}

function getExpiresIn(): string {
  return process.env['JWT_EXPIRES_IN'] ?? '7d';
}

function getIssuer(): string {
  return process.env['JWT_ISSUER'] ?? 'tiltcheck.me';
}

function getAudience(): string {
  return process.env['JWT_AUDIENCE'] ?? 'tiltcheck.me';
}

/**
 * Parse a duration string (e.g. "7d", "24h", "30m", "60s") into seconds.
 */
function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([dhms])$/);
  if (!match) {
    throw new Error(
      `[auth-flow] Invalid duration format: "${duration}". Expected e.g. "7d", "24h", "30m", "60s".`
    );
  }
  const value = parseInt(match[1]!, 10);
  const unit = match[2]!;
  switch (unit) {
    case 'd': return value * 24 * 60 * 60;
    case 'h': return value * 60 * 60;
    case 'm': return value * 60;
    case 's': return value;
    default:  throw new Error(`[auth-flow] Unknown duration unit: "${unit}".`);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Sign a new JWT for the given `userId`.
 *
 * @param userId  - Becomes the `sub` (subject) claim.
 * @param claims  - Optional additional claims merged into the payload.
 * @returns       Compact serialised JWT string.
 */
export async function issueToken(
  userId: string,
  claims?: Record<string, unknown>
): Promise<string> {
  if (!userId || typeof userId !== 'string') {
    throw new Error('[auth-flow] issueToken: userId must be a non-empty string.');
  }

  const secret = getSecret();
  const expiresInSeconds = parseDuration(getExpiresIn());
  const now = Math.floor(Date.now() / 1000);

  const builder = new SignJWT({ ...(claims ?? {}), userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuer(getIssuer())
    .setAudience(getAudience())
    .setIssuedAt(now)
    .setExpirationTime(now + expiresInSeconds);

  return builder.sign(secret);
}

/**
 * Verify a JWT and return its decoded payload.
 *
 * @param token - Compact serialised JWT string.
 * @returns       Decoded payload including `userId` and any additional claims.
 * @throws        If the token is invalid, expired, or the secret does not match.
 */
export async function verifyToken(
  token: string
): Promise<{ userId: string } & Record<string, unknown>> {
  if (!token || typeof token !== 'string') {
    throw new Error('[auth-flow] verifyToken: token must be a non-empty string.');
  }

  const secret = getSecret();

  const { payload } = await jwtVerify(token, secret, {
    issuer: getIssuer(),
    audience: getAudience(),
  });

  // `sub` is the canonical userId claim; fall back to the `userId` custom claim
  // for tokens that were issued with an explicit `userId` field.
  const userId =
    payload.sub ??
    (payload as JWTPayload & { userId?: string }).userId;

  if (!userId) {
    throw new Error(
      '[auth-flow] verifyToken: decoded token is missing a userId (sub) claim.'
    );
  }

  // Spread all standard and custom claims, then guarantee `userId` is present.
  const { sub: _sub, ...rest } = payload as Record<string, unknown>;
  return { userId, ...rest };
}
