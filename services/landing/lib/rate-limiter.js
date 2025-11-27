/**
 * Redis-based Rate Limiter
 * 
 * Production-grade rate limiter using Redis for distributed state.
 * Gracefully falls back to in-memory when Redis is unavailable.
 */

const { createClient } = require('redis');

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_REQUESTS = 5;

// In-memory fallback
const fallbackStore = new Map();

let redisClient = null;
let useRedis = false;

/**
 * Initialize Redis client with timeout
 */
async function initRateLimiter() {
  // Skip Redis if REDIS_URL is not set (common in containerized environments)
  if (!process.env.REDIS_URL) {
    console.log('[RateLimiter] REDIS_URL not set, using in-memory fallback');
    useRedis = false;
    return;
  }

  try {
    const redisUrl = process.env.REDIS_URL;
    redisClient = createClient({ 
      url: redisUrl,
      socket: {
        connectTimeout: 5000, // 5 second connection timeout
        reconnectStrategy: false // Don't auto-reconnect, use fallback instead
      }
    });
    
    redisClient.on('error', (err) => {
      console.error('[RateLimiter] Redis error:', err.message);
      useRedis = false;
    });

    // Add timeout wrapper to prevent hanging
    const connectWithTimeout = Promise.race([
      redisClient.connect(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Redis connection timeout')), 5000)
      )
    ]);

    await connectWithTimeout;
    useRedis = true;
    console.log('[RateLimiter] Redis connected');
  } catch (err) {
    console.warn('[RateLimiter] Redis unavailable, using in-memory fallback:', err.message);
    useRedis = false;
    // Clean up any partial connection
    if (redisClient) {
      try { await redisClient.disconnect(); } catch {}
      redisClient = null;
    }
  }
}

/**
 * Check if IP is rate limited
 * @param {string} ip - Client IP address
 * @returns {Promise<{allowed: boolean, remaining: number}>}
 */
async function checkRateLimit(ip) {
  const key = `ratelimit:newsletter:${ip}`;
  const now = Date.now();

  if (useRedis && redisClient) {
    try {
      const count = await redisClient.incr(key);
      
      if (count === 1) {
        await redisClient.pExpire(key, RATE_LIMIT_WINDOW_MS);
      }

      const remaining = Math.max(0, MAX_REQUESTS - count);
      const allowed = count <= MAX_REQUESTS;

      return { allowed, remaining };
    } catch (err) {
      console.error('[RateLimiter] Redis operation failed:', err.message);
      // Fall through to in-memory
    }
  }

  // In-memory fallback
  const entry = fallbackStore.get(ip);
  
  if (!entry || now - entry.timestamp > RATE_LIMIT_WINDOW_MS) {
    fallbackStore.set(ip, { count: 1, timestamp: now });
    return { allowed: true, remaining: MAX_REQUESTS - 1 };
  }

  entry.count++;
  const remaining = Math.max(0, MAX_REQUESTS - entry.count);
  const allowed = entry.count <= MAX_REQUESTS;

  return { allowed, remaining };
}

/**
 * Express middleware for rate limiting
 */
function rateLimitMiddleware(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  
  checkRateLimit(ip).then(({ allowed, remaining }) => {
    res.setHeader('X-RateLimit-Limit', MAX_REQUESTS);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Window', `${RATE_LIMIT_WINDOW_MS / 1000}s`);

    if (!allowed) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Maximum ${MAX_REQUESTS} requests per ${RATE_LIMIT_WINDOW_MS / 60000} minutes. Try again later.`,
        retryAfter: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000)
      });
    }

    next();
  }).catch(err => {
    console.error('[RateLimiter] Middleware error:', err);
    next(); // Allow request on error
  });
}

/**
 * Cleanup on shutdown
 */
async function closeRateLimiter() {
  if (redisClient) {
    await redisClient.quit();
    console.log('[RateLimiter] Redis connection closed');
  }
}

module.exports = {
  initRateLimiter,
  checkRateLimit,
  rateLimitMiddleware,
  closeRateLimiter
};
