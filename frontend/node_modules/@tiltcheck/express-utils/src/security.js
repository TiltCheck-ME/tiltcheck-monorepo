// Express utilities: Security middleware and utilities for API protection
const crypto = require('crypto');

/**
 * Build admin IP allowlist from environment
 * @param {Object} env - Environment variables object
 * @returns {string[]} - Array of allowed IP addresses
 */
function buildAdminIPs(env) {
  const ips = [
    '127.0.0.1',           // localhost IPv4
    '::1',                 // localhost IPv6
    '::ffff:127.0.0.1',    // IPv4-mapped IPv6 localhost
    env.ADMIN_IP_1,
    env.ADMIN_IP_2,
    env.ADMIN_IP_3,
  ].filter(Boolean);
  return ips;
}

/**
 * Create IP allowlist middleware for admin routes
 * @param {string[]} allowed - Array of allowed IP addresses
 * @returns {Function} - Express middleware function
 */
function ipAllowlistMiddleware(allowed) {
  return function ipAllowlist(req, res, next) {
    // Get client IP with multiple fallbacks for proxy/Railway/Render environments
    const clientIP = req.ip ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      (req.connection?.socket ? req.connection.socket.remoteAddress : null) ||
      (req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : null) ||
      req.headers['x-real-ip'] ||
      '127.0.0.1';

    console.log(`[${new Date().toISOString()}] Admin access attempt from IP: ${clientIP}`);

    if (!allowed.includes(clientIP)) {
      console.warn(`[SECURITY] Blocked admin access from unauthorized IP: ${clientIP}`);
      return res.status(403).json({
        error: 'Access denied',
        message: 'Admin panel access is restricted to authorized IPs only',
        timestamp: new Date().toISOString(),
        clientIP,
        allowedIPs: allowed,
      });
    }
    
    console.log(`[SECURITY] Admin access granted to authorized IP: ${clientIP}`);
    next();
  };
}

// ============================================================================
// API Security Utilities for Third-Party Integration Protection
// ============================================================================

/**
 * Generate HMAC signature for API request
 * Use for internal API authentication between TiltCheck services
 * @param {Object|string} payload - Request payload to sign
 * @param {string} secret - Shared secret key
 * @returns {string} - HMAC-SHA256 signature
 */
function signRequest(payload, secret) {
  const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * Verify HMAC signature for API request (timing-safe)
 * @param {Object|string} payload - Request payload that was signed
 * @param {string} signature - Signature to verify
 * @param {string} secret - Shared secret key
 * @returns {boolean} - True if signature is valid
 */
function verifySignature(payload, signature, secret) {
  const expected = signRequest(payload, secret);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expected, 'hex')
    );
  } catch {
    return false;
  }
}

/**
 * Create middleware to verify X-TiltCheck-Signature header
 * @param {string} secret - Shared secret for HMAC verification
 * @returns {Function} - Express middleware
 */
function signatureVerificationMiddleware(secret) {
  return function verifyApiSignature(req, res, next) {
    const signature = req.headers['x-tiltcheck-signature'];
    
    if (!signature) {
      console.warn('[SECURITY] Missing X-TiltCheck-Signature header');
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing API signature'
      });
    }

    if (!verifySignature(req.body, signature, secret)) {
      console.warn('[SECURITY] Invalid API signature');
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid API signature'
      });
    }

    next();
  };
}

/**
 * Simple in-memory rate limiter for API endpoints
 * Protects against abuse and helps stay within third-party API quotas
 */
class RateLimiter {
  /**
   * @param {number} limit - Maximum requests per window
   * @param {number} windowMs - Time window in milliseconds
   */
  constructor(limit, windowMs) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.requests = new Map(); // key -> timestamp[]
  }

  /**
   * Check if a request from this key is allowed
   * @param {string} key - Identifier (e.g., user ID, IP address)
   * @returns {boolean} - True if request is allowed
   */
  isAllowed(key) {
    const now = Date.now();
    const timestamps = this.requests.get(key) || [];
    
    // Remove expired timestamps
    const valid = timestamps.filter(t => now - t < this.windowMs);
    this.requests.set(key, valid);
    
    return valid.length < this.limit;
  }

  /**
   * Record a request from this key
   * @param {string} key - Identifier (e.g., user ID, IP address)
   */
  recordRequest(key) {
    const timestamps = this.requests.get(key) || [];
    timestamps.push(Date.now());
    this.requests.set(key, timestamps);
  }

  /**
   * Get remaining requests for this key
   * @param {string} key - Identifier
   * @returns {number} - Remaining requests in current window
   */
  remaining(key) {
    const now = Date.now();
    const timestamps = this.requests.get(key) || [];
    const valid = timestamps.filter(t => now - t < this.windowMs);
    return Math.max(0, this.limit - valid.length);
  }

  /**
   * Clear all rate limit data (for testing)
   */
  clear() {
    this.requests.clear();
  }
}

/**
 * Create rate limiting middleware
 * @param {number} limit - Maximum requests per window
 * @param {number} windowMs - Time window in milliseconds (default: 60000 = 1 minute)
 * @param {Function} [keyGenerator] - Function to generate rate limit key from request
 * @returns {Function} - Express middleware
 */
function rateLimitMiddleware(limit, windowMs = 60000, keyGenerator = null) {
  const limiter = new RateLimiter(limit, windowMs);
  
  return function rateLimit(req, res, next) {
    // Default key is IP address
    const key = keyGenerator ? keyGenerator(req) : (
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
      req.ip || 
      '127.0.0.1'
    );

    if (!limiter.isAllowed(key)) {
      console.warn(`[SECURITY] Rate limit exceeded for: ${key}`);
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }

    limiter.recordRequest(key);
    
    // Add rate limit headers
    res.set('X-RateLimit-Limit', String(limit));
    res.set('X-RateLimit-Remaining', String(limiter.remaining(key)));
    res.set('X-RateLimit-Reset', String(Math.ceil((Date.now() + windowMs) / 1000)));
    
    next();
  };
}

/**
 * Circuit breaker for third-party API calls
 * Prevents cascading failures when external services are down
 */
class CircuitBreaker {
  /**
   * @param {Object} options - Circuit breaker options
   * @param {number} [options.failureThreshold=5] - Failures before opening circuit
   * @param {number} [options.resetTimeMs=60000] - Time to wait before trying again
   * @param {number} [options.halfOpenRequests=1] - Requests to allow in half-open state
   */
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeMs = options.resetTimeMs || 60000;
    this.halfOpenRequests = options.halfOpenRequests || 1;
    
    this.failures = 0;
    this.successes = 0;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.lastFailure = 0;
    this.halfOpenAttempts = 0;
  }

  /**
   * Execute a function with circuit breaker protection
   * @param {Function} fn - Async function to execute
   * @returns {Promise} - Result of the function
   * @throws {Error} - If circuit is open or function fails
   */
  async call(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailure > this.resetTimeMs) {
        this.state = 'HALF_OPEN';
        this.halfOpenAttempts = 0;
        console.log('[CircuitBreaker] Transitioning to HALF_OPEN');
      } else {
        throw new Error('Circuit breaker is OPEN - service unavailable');
      }
    }

    if (this.state === 'HALF_OPEN' && this.halfOpenAttempts >= this.halfOpenRequests) {
      throw new Error('Circuit breaker HALF_OPEN limit reached');
    }

    try {
      if (this.state === 'HALF_OPEN') {
        this.halfOpenAttempts++;
      }
      
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Record a successful call
   */
  onSuccess() {
    this.failures = 0;
    this.successes++;
    if (this.state === 'HALF_OPEN') {
      console.log('[CircuitBreaker] Success in HALF_OPEN - closing circuit');
      this.state = 'CLOSED';
    }
  }

  /**
   * Record a failed call
   */
  onFailure() {
    this.failures++;
    this.lastFailure = Date.now();
    
    if (this.state === 'HALF_OPEN') {
      console.log('[CircuitBreaker] Failure in HALF_OPEN - opening circuit');
      this.state = 'OPEN';
    } else if (this.failures >= this.failureThreshold) {
      console.log(`[CircuitBreaker] Threshold reached (${this.failures}) - opening circuit`);
      this.state = 'OPEN';
    }
  }

  /**
   * Get current circuit breaker state
   * @returns {Object} - State information
   */
  getState() {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailure: this.lastFailure
    };
  }

  /**
   * Reset circuit breaker (for testing)
   */
  reset() {
    this.failures = 0;
    this.successes = 0;
    this.state = 'CLOSED';
    this.lastFailure = 0;
    this.halfOpenAttempts = 0;
  }

  /**
   * Force circuit to OPEN state (for testing)
   * @param {number} [lastFailureOffset=0] - Milliseconds to subtract from now for lastFailure
   */
  forceOpen(lastFailureOffset = 0) {
    this.state = 'OPEN';
    this.lastFailure = Date.now() - lastFailureOffset;
  }

  /**
   * Force circuit to HALF_OPEN state (for testing)
   */
  forceHalfOpen() {
    this.state = 'HALF_OPEN';
    this.halfOpenAttempts = 0;
  }
}

/**
 * Sanitize error messages before sending to clients
 * Prevents leaking internal details or third-party API information
 * @param {Error} error - Original error
 * @param {boolean} [isDev=false] - Whether to include details in development
 * @returns {Object} - Sanitized error response
 */
function sanitizeError(error, isDev = false) {
  // Known safe error messages
  const safeMessages = [
    'Rate limit exceeded',
    'Unauthorized',
    'Not found',
    'Bad request',
    'Service unavailable'
  ];

  const isSafe = safeMessages.some(msg => 
    error.message?.toLowerCase().includes(msg.toLowerCase())
  );

  const sanitized = {
    error: 'An error occurred',
    message: isSafe ? error.message : 'Please try again later',
    timestamp: new Date().toISOString()
  };

  // Include details only in development
  if (isDev && process.env.NODE_ENV === 'development') {
    sanitized.details = error.message;
    sanitized.stack = error.stack;
  }

  return sanitized;
}

/**
 * Validate that a URL is safe for external requests
 * Prevents SSRF attacks and internal network access
 * @param {string} url - URL to validate
 * @returns {boolean} - True if URL is safe
 */
function isUrlSafe(url) {
  try {
    const parsed = new URL(url);
    
    // Only allow http/https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }
    
    // Block internal/private networks
    const hostname = parsed.hostname.toLowerCase();
    
    // Exact matches for localhost variants
    const exactBlocked = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];
    if (exactBlocked.includes(hostname)) {
      return false;
    }
    
    // Check for private IP ranges using proper IP parsing
    // IPv4 private ranges: 10.x.x.x, 172.16-31.x.x, 192.168.x.x, 169.254.x.x
    const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4Match) {
      const [, a, b, c, d] = ipv4Match.map(Number);
      
      // Validate each octet is in range
      if ([a, b, c, d].some(octet => octet < 0 || octet > 255)) {
        return false;
      }
      
      // 10.0.0.0/8 - Private Class A
      if (a === 10) {
        return false;
      }
      
      // 172.16.0.0/12 - Private Class B (172.16.0.0 - 172.31.255.255)
      if (a === 172 && b >= 16 && b <= 31) {
        return false;
      }
      
      // 192.168.0.0/16 - Private Class C
      if (a === 192 && b === 168) {
        return false;
      }
      
      // 169.254.0.0/16 - Link-local (including AWS metadata 169.254.169.254)
      if (a === 169 && b === 254) {
        return false;
      }
      
      // 127.0.0.0/8 - Loopback
      if (a === 127) {
        return false;
      }
    }
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Redact sensitive data from objects before logging
 * @param {Object} obj - Object to redact
 * @param {string[]} [sensitiveKeys] - Keys to redact
 * @returns {Object} - Redacted object (shallow copy)
 */
function redactSensitiveData(obj, sensitiveKeys = null) {
  const defaultKeys = [
    'password', 'token', 'secret', 'key', 'apiKey', 'api_key',
    'authorization', 'auth', 'credential', 'private'
  ];
  
  const keysToRedact = sensitiveKeys || defaultKeys;
  const redacted = { ...obj };
  
  for (const key of Object.keys(redacted)) {
    const lowerKey = key.toLowerCase();
    if (keysToRedact.some(k => lowerKey.includes(k.toLowerCase()))) {
      redacted[key] = '[REDACTED]';
    }
  }
  
  return redacted;
}

module.exports = {
  // IP allowlist (existing)
  buildAdminIPs,
  ipAllowlistMiddleware,
  
  // API signature verification
  signRequest,
  verifySignature,
  signatureVerificationMiddleware,
  
  // Rate limiting
  RateLimiter,
  rateLimitMiddleware,
  
  // Circuit breaker
  CircuitBreaker,
  
  // Security utilities
  sanitizeError,
  isUrlSafe,
  redactSensitiveData
};

