/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 *
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */

/**
 * Options for configuring the rate limiter.
 */
export interface RateLimiterOptions {
  /** Duration of the sliding window in milliseconds (e.g. 60_000 for 1 minute). */
  windowMs: number;
  /** Maximum number of requests allowed within the window. */
  max: number;
  /**
   * Function that derives a rate-limit key from the request.
   * Defaults to the client IP address.
   */
  keyFn?: (req: RateLimiterRequest) => string;
}

/**
 * Minimal request shape that the middleware understands.
 * Both Express `Request` and Hono's raw Node `IncomingMessage` satisfy this.
 */
export interface RateLimiterRequest {
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
}

/**
 * Minimal response shape required to send a 429 reply.
 */
export interface RateLimiterResponse {
  status(code: number): RateLimiterResponse;
  json(body: unknown): void;
  // Hono-style: context object may expose `set` for headers
  set?: (name: string, value: string) => void;
  setHeader?: (name: string, value: string | number | readonly string[]) => void;
}

export type NextFunction = (err?: unknown) => void;

export type RateLimiterMiddleware = (
  req: RateLimiterRequest,
  res: RateLimiterResponse,
  next: NextFunction
) => void;

/**
 * Per-key state stored by the sliding-window algorithm.
 */
interface WindowState {
  /** Timestamps (ms) of each request that falls within the current window. */
  timestamps: number[];
}

/**
 * Extracts the best-guess client IP from a request.
 */
function defaultKeyFn(req: RateLimiterRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const first = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    return first.split(',')[0].trim();
  }
  return req.ip ?? 'unknown';
}

/**
 * Sets the `Retry-After` header on the response using whichever API is available
 * (Express uses `setHeader`, Hono contexts expose `set`).
 */
function setRetryAfterHeader(
  res: RateLimiterResponse,
  retryAfterSeconds: number
): void {
  const value = String(retryAfterSeconds);
  if (typeof res.setHeader === 'function') {
    res.setHeader('Retry-After', value);
  } else if (typeof res.set === 'function') {
    res.set('Retry-After', value);
  }
}

/**
 * Creates an Express/Hono-compatible sliding-window rate-limiter middleware.
 *
 * The algorithm keeps a list of request timestamps for each key and discards
 * any that fall outside the current window on every incoming request.  This
 * gives an accurate O(n) sliding window without requiring Redis.
 *
 * @example
 * ```ts
 * import { createRateLimiter } from '@tiltcheck/rate-limiter';
 *
 * const limiter = createRateLimiter({ windowMs: 60_000, max: 100 });
 * app.use(limiter);
 * ```
 */
export function createRateLimiter(options: RateLimiterOptions): RateLimiterMiddleware {
  const { windowMs, max, keyFn = defaultKeyFn } = options;

  if (windowMs <= 0) throw new RangeError('windowMs must be a positive number');
  if (max <= 0) throw new RangeError('max must be a positive number');

  /** In-memory store keyed by the value returned from `keyFn`. */
  const store = new Map<string, WindowState>();

  return function rateLimiterMiddleware(
    req: RateLimiterRequest,
    res: RateLimiterResponse,
    next: NextFunction
  ): void {
    const now = Date.now();
    const windowStart = now - windowMs;
    const key = keyFn(req);

    // Retrieve or initialise state for this key.
    let state = store.get(key);
    if (!state) {
      state = { timestamps: [] };
      store.set(key, state);
    }

    // Evict timestamps that are outside the current window.
    state.timestamps = state.timestamps.filter((ts) => ts > windowStart);

    if (state.timestamps.length >= max) {
      // The oldest timestamp in the window determines when the client may retry.
      const oldestInWindow = state.timestamps[0];
      const retryAfterMs = oldestInWindow + windowMs - now;
      const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);

      setRetryAfterHeader(res, retryAfterSeconds);

      res.status(429).json({
        error: 'Too Many Requests',
        retryAfter: retryAfterSeconds,
      });
      return;
    }

    // Record the current request and proceed.
    state.timestamps.push(now);
    next();
  };
}
