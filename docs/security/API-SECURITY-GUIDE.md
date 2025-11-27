# API Security Guide: Protecting Against Third-Party Integration Breaches

> **TiltCheck Security Document**  
> Version: 1.0  
> Last Updated: November 2025

## Overview

This guide outlines security best practices for protecting TiltCheck code when integrating with external companies and third-party APIs. API breaches can expose sensitive data, compromise user funds, and damage trust. This document provides actionable security measures.

---

## Table of Contents

1. [API Key Security](#1-api-key-security)
2. [Input Validation & Sanitization](#2-input-validation--sanitization)
3. [Rate Limiting & Throttling](#3-rate-limiting--throttling)
4. [Secure Communication](#4-secure-communication)
5. [Token Rotation & Expiration](#5-token-rotation--expiration)
6. [Least Privilege Principle](#6-least-privilege-principle)
7. [Monitoring & Alerting](#7-monitoring--alerting)
8. [Vendor Security Assessment](#8-vendor-security-assessment)
9. [Fallback & Circuit Breaker Patterns](#9-fallback--circuit-breaker-patterns)
10. [Security Checklist](#10-security-checklist)

---

## 1. API Key Security

### Never Commit API Keys

```bash
# ❌ NEVER do this
const API_KEY = "sk-abc123...";

# ✅ Always use environment variables
const API_KEY = process.env.OPENAI_API_KEY;
```

### Environment Variable Best Practices

```bash
# .env files should never be committed
.env
.env.local
.env.production
*.pem
*.key
```

### Key Storage Hierarchy

| Environment | Storage Method |
|-------------|---------------|
| Development | `.env` files (gitignored) |
| CI/CD | GitHub Secrets / Encrypted env vars |
| Production | Vault, AWS Secrets Manager, Railway secrets |

### TiltCheck Implementation

```javascript
// services/ai-gateway/src/index.js
if (process.env.OPENAI_API_KEY) {
  this.openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
}
```

---

## 2. Input Validation & Sanitization

### Validate All External Data

**BEFORE** passing data to third-party APIs, validate:

```typescript
// modules/justthetip/src/wallet-manager.ts
function validateSolanaAddress(address: string): void {
  // Check for base58 charset
  if (!BASE58_REGEX.test(address)) {
    throw new Error('Invalid Solana address: must use base58 encoding');
  }

  // Validate length
  if (address.length < 32 || address.length > 44) {
    throw new Error('Invalid Solana address: incorrect length');
  }

  // Verify decoded key is exactly 32 bytes
  const keyBytes = publicKey.toBytes();
  if (keyBytes.length !== 32) {
    throw new Error('Invalid Solana address: must be exactly 32 bytes');
  }
}
```

### Sanitize API Responses

**AFTER** receiving data from third-party APIs:

```javascript
// Validate response structure before use
if (!completion.choices || 
    completion.choices.length === 0 || 
    !completion.choices[0].message) {
  console.error('[AIGateway] Invalid response: no choices returned');
  return null; // Fall back to safe default
}
```

### URL Validation for External Links

```typescript
// modules/suslink/src/scanner.ts
function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Only allow http/https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }
    // Block internal/localhost URLs
    if (['localhost', '127.0.0.1', '0.0.0.0'].includes(parsed.hostname)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
```

---

## 3. Rate Limiting & Throttling

### Protect Against API Abuse

```javascript
// Example rate limiter configuration
const rateLimiter = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,    // 100 requests per minute
  keyGenerator: (req) => req.headers['x-tiltcheck-user'] || req.ip
};
```

### Third-Party API Quotas

Track and respect API quotas:

```javascript
class APIQuotaTracker {
  constructor(limit, windowMs) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.requests = [];
  }

  canMakeRequest() {
    const now = Date.now();
    this.requests = this.requests.filter(t => now - t < this.windowMs);
    return this.requests.length < this.limit;
  }

  recordRequest() {
    this.requests.push(Date.now());
  }
}

// OpenAI: 10,000 RPM (requests per minute) for gpt-4o-mini
const openAIQuota = new APIQuotaTracker(10000, 60000);
```

---

## 4. Secure Communication

### Always Use HTTPS

```javascript
// ❌ NEVER use HTTP for API calls
const response = await fetch('http://api.example.com/data');

// ✅ Always use HTTPS
const response = await fetch('https://api.example.com/data');
```

### Certificate Validation

```javascript
// Never disable certificate validation in production
// ❌ DANGEROUS
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// ✅ Use proper certificates
// Let Node.js validate certificates by default
```

### Request Signing

For internal APIs, use HMAC signatures:

```javascript
// Generate request signature
import crypto from 'crypto';

function signRequest(payload, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
}

// Verify request signature
function verifySignature(payload, signature, secret) {
  const expected = signRequest(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
```

---

## 5. Token Rotation & Expiration

### Implement Token Refresh

```javascript
class TokenManager {
  constructor(refreshFn, expiryMs = 3600000) {
    this.refreshFn = refreshFn;
    this.expiryMs = expiryMs;
    this.token = null;
    this.expiresAt = 0;
  }

  async getToken() {
    const now = Date.now();
    // Refresh 5 minutes before expiry
    if (!this.token || now > this.expiresAt - 300000) {
      this.token = await this.refreshFn();
      this.expiresAt = now + this.expiryMs;
    }
    return this.token;
  }
}
```

### Rotate API Keys Regularly

- Rotate production API keys every 90 days
- Rotate immediately if breach suspected
- Maintain key versioning for rollback

---

## 6. Least Privilege Principle

### Scope API Permissions

Request only the permissions needed:

```javascript
// Discord Bot - Request minimal permissions
const REQUIRED_PERMISSIONS = [
  'Send Messages',
  'Read Message History',
  'Add Reactions'
  // Don't request Administrator or other broad permissions
];
```

### Separate API Keys by Environment

| Environment | API Key | Permissions |
|-------------|---------|-------------|
| Development | `dev_key_*` | Read-only, sandbox |
| Staging | `staging_key_*` | Limited write |
| Production | `prod_key_*` | Full access, monitored |

### Service-Specific Keys

```bash
# Use different keys for different services
DISCORD_TOKEN=<discord_only>
OPENAI_API_KEY=<openai_only>
SOLANA_RPC_URL=<solana_only>
```

---

## 7. Monitoring & Alerting

### Log API Interactions

```javascript
// Log all third-party API calls (without sensitive data)
function logAPICall(service, endpoint, status, duration) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    service,
    endpoint,
    status,
    durationMs: duration,
    // Never log: API keys, tokens, user PII
  }));
}
```

### Alert on Anomalies

```javascript
// Detect unusual patterns
const anomalyDetector = {
  checkRateSpike(currentRate, baseline) {
    if (currentRate > baseline * 5) {
      alertSecurityTeam('Rate spike detected: possible breach or abuse');
    }
  },

  checkUnauthorizedAccess(attempts, threshold = 10) {
    if (attempts > threshold) {
      alertSecurityTeam('Multiple unauthorized access attempts');
    }
  },

  checkResponseTimeAnomaly(responseTime, baselineMs = 200) {
    if (responseTime > baselineMs * 10) {
      alertSecurityTeam('API response time anomaly detected');
    }
  }
};
```

### Security Metrics to Track

- Failed authentication attempts
- Unusual IP addresses accessing APIs
- API response time anomalies
- Rate limit breaches
- Unexpected 4xx/5xx responses

---

## 8. Vendor Security Assessment

### Before Integrating with a Third Party

1. **Security Certification**
   - SOC 2 Type II compliance
   - ISO 27001 certification
   - GDPR/CCPA compliance (if handling user data)

2. **Data Handling**
   - What data do they store?
   - Where is data stored? (Geography)
   - Data retention policies
   - Encryption at rest and in transit

3. **Incident Response**
   - Breach notification timeline
   - Historical security incidents
   - Bug bounty program

### TiltCheck Vendor Assessment

| Vendor | Purpose | Security Notes |
|--------|---------|----------------|
| Discord | Bot platform | OAuth2, IP-based access |
| OpenAI | AI processing | API keys, no data retention option |
| Solana | Blockchain | Non-custodial, public network |
| Magic.link | Wallet creation | Non-custodial, OAuth flow |
| Supabase | Database | Row-level security, encrypted |
| CoinGecko | Pricing data | Public API, rate limited |

---

## 9. Fallback & Circuit Breaker Patterns

### Implement Graceful Degradation

```javascript
// services/ai-gateway/src/index.js
async callOpenAI(systemPrompt, userPrompt) {
  if (this.useMock || !this.openai) {
    return null; // Fall back to mock
  }

  try {
    const completion = await this.openai.chat.completions.create(options);
    return completion;
  } catch (error) {
    console.error('[AIGateway] OpenAI API error:', error.message);
    return null; // Fall back to mock
  }
}
```

### Circuit Breaker Pattern

```javascript
class CircuitBreaker {
  constructor(threshold = 5, resetTimeMs = 60000) {
    this.failures = 0;
    this.threshold = threshold;
    this.resetTimeMs = resetTimeMs;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.lastFailure = 0;
  }

  async call(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailure > this.resetTimeMs) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  onFailure() {
    this.failures++;
    this.lastFailure = Date.now();
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
    }
  }
}
```

### Mock/Fallback Data

Always have mock responses for when third-party APIs are unavailable:

```javascript
// Fallback when OpenAI is unavailable
return {
  success: true,
  data: {
    matchConfidence: 0.85,
    matchLevel: 'high',
    reasoning: ['Default response - API unavailable'],
  },
  source: 'mock'
};
```

---

## 10. Security Checklist

### Before Adding a New Integration

- [ ] API key stored in environment variables
- [ ] API key NOT committed to git
- [ ] Input validation implemented
- [ ] Output sanitization implemented
- [ ] Rate limiting configured
- [ ] HTTPS only
- [ ] Minimum required permissions requested
- [ ] Fallback/mock behavior implemented
- [ ] Logging implemented (without sensitive data)
- [ ] Error handling that doesn't expose internals
- [ ] Vendor security assessment completed

### Periodic Security Review

- [ ] API keys rotated (every 90 days)
- [ ] Unused integrations removed
- [ ] Dependency vulnerabilities checked (`pnpm audit`)
- [ ] Access logs reviewed for anomalies
- [ ] Rate limit thresholds validated
- [ ] Fallback systems tested

### Incident Response

- [ ] API key compromise procedure documented
- [ ] Contact information for vendors available
- [ ] Backup authentication methods ready
- [ ] Monitoring alerts configured

---

## TiltCheck-Specific Guidelines

### Non-Custodial Architecture

TiltCheck follows a **non-custodial architecture** for financial transactions:

```
User Wallet → (fee deduction) → Target Wallet or Jupiter Swap
```

This reduces API breach impact:
- No stored private keys to steal
- No custodial funds to drain
- Limited PII exposure

### Module Isolation

Modules communicate via Event Router, not direct API calls:

```typescript
// ✅ Correct: Use event router
await eventRouter.publish('wallet.registered', 'justthetip', data);

// ❌ Incorrect: Direct module call
await otherModule.registerWallet(data);
```

This limits breach blast radius.

### Discord Signature Verification

Always verify Discord interaction signatures:

```javascript
import { verifyKey } from 'discord-interactions';

function verifyDiscordRequest(req) {
  const signature = req.headers['x-signature-ed25519'];
  const timestamp = req.headers['x-signature-timestamp'];
  const body = JSON.stringify(req.body);
  
  return verifyKey(body, signature, timestamp, publicKey);
}
```

---

## Resources

- [OWASP API Security Top 10](https://owasp.org/API-Security/)
- [Discord Security Best Practices](https://discord.com/developers/docs/topics/oauth2)
- [OpenAI Security Practices](https://openai.com/security)
- [Solana Security Model](https://docs.solana.com/cluster/security-model)

---

## Reporting Security Issues

If you discover a security vulnerability in TiltCheck or its integrations:

1. **DO NOT** open a public issue
2. Email: jmenichole.security@proton.me
3. Include: Description, reproduction steps, potential impact

---

**TiltCheck Ecosystem © 2024–2025**

