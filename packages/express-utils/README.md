# @tiltcheck/express-utils

Shared Express middleware and utilities for TiltCheck microservices.

## Features

- **Request Logging** — NDJSON request logs with in-memory metrics
- **Admin Security** — IP allowlist middleware for protected routes
- **API Signature Verification** — HMAC-based request signing for internal APIs
- **Rate Limiting** — Protect against abuse and stay within API quotas
- **Circuit Breaker** — Graceful degradation when third-party APIs fail
- **Security Utilities** — URL validation, error sanitization, data redaction

## Installation

```bash
pnpm install @tiltcheck/express-utils
```

## Usage

### Request Logging

```javascript
const { initLogging } = require('@tiltcheck/express-utils');

const { requestLogger, adminLogger, buildMetrics, pathCounters } = initLogging('/tmp/app.log');

app.use(requestLogger);

app.get('/metrics', (req, res) => {
  const metrics = buildMetrics();
  res.json(metrics);
});

app.get('/admin/panel', (req, res) => {
  adminLogger(req); // Log admin access
  res.send('Admin Panel');
});
```

### IP Allowlist Security

```javascript
const { buildAdminIPs, ipAllowlistMiddleware } = require('@tiltcheck/express-utils');

const ADMIN_IPS = buildAdminIPs(process.env);
const ipAllowlist = ipAllowlistMiddleware(ADMIN_IPS);

app.get('/admin/panel', ipAllowlist, (req, res) => {
  res.send('Protected Admin Panel');
});
```

### API Signature Verification

Protect internal APIs from unauthorized access:

```javascript
const { signRequest, verifySignature, signatureVerificationMiddleware } = require('@tiltcheck/express-utils');

// Sign outgoing requests
const payload = { userId: '123', action: 'tip' };
const signature = signRequest(payload, process.env.API_SECRET);
// Include signature in X-TiltCheck-Signature header

// Verify incoming requests
app.post('/api/internal', signatureVerificationMiddleware(process.env.API_SECRET), (req, res) => {
  // Request is authenticated
  res.json({ success: true });
});
```

### Rate Limiting

Protect against abuse and third-party API quota overruns:

```javascript
const { RateLimiter, rateLimitMiddleware } = require('@tiltcheck/express-utils');

// Use middleware
app.use('/api', rateLimitMiddleware(100, 60000)); // 100 req/min

// Or use class directly
const limiter = new RateLimiter(100, 60000);
if (limiter.isAllowed(userId)) {
  limiter.recordRequest(userId);
  // Make API call
}
```

### Circuit Breaker

Prevent cascading failures when external APIs are down:

```javascript
const { CircuitBreaker } = require('@tiltcheck/express-utils');

const openAIBreaker = new CircuitBreaker({
  failureThreshold: 5,   // Open after 5 failures
  resetTimeMs: 60000     // Try again after 1 minute
});

async function callOpenAI(prompt) {
  try {
    return await openAIBreaker.call(async () => {
      return await openai.chat.completions.create({ ... });
    });
  } catch (error) {
    if (error.message.includes('Circuit breaker')) {
      return getMockResponse(); // Fallback
    }
    throw error;
  }
}
```

### Security Utilities

```javascript
const { isUrlSafe, sanitizeError, redactSensitiveData } = require('@tiltcheck/express-utils');

// Prevent SSRF attacks
if (!isUrlSafe(userProvidedUrl)) {
  return res.status(400).json({ error: 'Invalid URL' });
}

// Sanitize errors before sending to client
app.use((err, req, res, next) => {
  const safe = sanitizeError(err);
  res.status(500).json(safe);
});

// Redact sensitive data before logging
console.log(redactSensitiveData({ apiKey: 'secret', userId: '123' }));
// Output: { apiKey: '[REDACTED]', userId: '123' }
```

## API Reference

### Logging

#### `initLogging(logPath)`
Initialize logging system.

### IP Security

#### `buildAdminIPs(env)`
Build IP allowlist from environment variables.

#### `ipAllowlistMiddleware(allowedIPs)`
Create Express middleware to restrict access by IP.

### API Signature Verification

#### `signRequest(payload, secret)`
Generate HMAC-SHA256 signature for request payload.

#### `verifySignature(payload, signature, secret)`
Verify HMAC signature (timing-safe).

#### `signatureVerificationMiddleware(secret)`
Express middleware to verify `X-TiltCheck-Signature` header.

### Rate Limiting

#### `new RateLimiter(limit, windowMs)`
Create rate limiter instance.
- `isAllowed(key)` — Check if request is allowed
- `recordRequest(key)` — Record a request
- `remaining(key)` — Get remaining requests

#### `rateLimitMiddleware(limit, windowMs, keyGenerator?)`
Express middleware for rate limiting.

### Circuit Breaker

#### `new CircuitBreaker(options)`
Create circuit breaker instance.
- `call(fn)` — Execute function with circuit breaker protection
- `getState()` — Get current state (CLOSED, OPEN, HALF_OPEN)
- `reset()` — Reset circuit breaker

**Options:**
- `failureThreshold` — Failures before opening (default: 5)
- `resetTimeMs` — Time to wait before trying again (default: 60000)
- `halfOpenRequests` — Requests to allow in half-open state (default: 1)

### Security Utilities

#### `isUrlSafe(url)`
Validate URL is safe for external requests (prevents SSRF).

#### `sanitizeError(error, isDev?)`
Sanitize error messages before sending to clients.

#### `redactSensitiveData(obj, sensitiveKeys?)`
Redact sensitive fields from objects before logging.

## Environment Variables

```bash
# IP Allowlist
ADMIN_IP_1=your_public_ip_here
ADMIN_IP_2=optional_office_ip
ADMIN_IP_3=optional_vpn_ip

# API Signature
API_SECRET=your_shared_secret_32chars

# Environment (affects error detail level)
NODE_ENV=development|production
```

## Security Documentation

For comprehensive API security guidelines, see:
- [API Security Guide](../../docs/security/API-SECURITY-GUIDE.md)
- [Security Policy](../../SECURITY.md)

## License

UNLICENSED — TiltCheck internal package
