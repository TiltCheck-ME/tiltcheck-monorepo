/**
 * Tests for API Security utilities
 * @tiltcheck/express-utils/security
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  signRequest,
  verifySignature,
  RateLimiter,
  CircuitBreaker,
  isUrlSafe,
  sanitizeError,
  redactSensitiveData,
  buildAdminIPs
} from '../src/security.js';

describe('API Security Utilities', () => {
  describe('signRequest / verifySignature', () => {
    const secret = 'test-secret-key-12345';
    const payload = { userId: '123', action: 'tip', amount: 5 };

    it('should generate consistent signatures for same payload', () => {
      const sig1 = signRequest(payload, secret);
      const sig2 = signRequest(payload, secret);
      expect(sig1).toBe(sig2);
    });

    it('should generate different signatures for different payloads', () => {
      const sig1 = signRequest(payload, secret);
      const sig2 = signRequest({ ...payload, amount: 10 }, secret);
      expect(sig1).not.toBe(sig2);
    });

    it('should verify valid signatures', () => {
      const signature = signRequest(payload, secret);
      expect(verifySignature(payload, signature, secret)).toBe(true);
    });

    it('should reject invalid signatures', () => {
      const signature = signRequest(payload, secret);
      expect(verifySignature(payload, 'invalid-signature', secret)).toBe(false);
    });

    it('should reject signatures with wrong secret', () => {
      const signature = signRequest(payload, secret);
      expect(verifySignature(payload, signature, 'wrong-secret')).toBe(false);
    });

    it('should handle string payloads', () => {
      const stringPayload = 'simple string payload';
      const signature = signRequest(stringPayload, secret);
      expect(verifySignature(stringPayload, signature, secret)).toBe(true);
    });
  });

  describe('RateLimiter', () => {
    let limiter: RateLimiter;

    beforeEach(() => {
      limiter = new RateLimiter(3, 1000); // 3 requests per second
    });

    it('should allow requests under the limit', () => {
      expect(limiter.isAllowed('user1')).toBe(true);
      limiter.recordRequest('user1');
      expect(limiter.isAllowed('user1')).toBe(true);
      limiter.recordRequest('user1');
      expect(limiter.isAllowed('user1')).toBe(true);
    });

    it('should block requests over the limit', () => {
      for (let i = 0; i < 3; i++) {
        limiter.recordRequest('user1');
      }
      expect(limiter.isAllowed('user1')).toBe(false);
    });

    it('should track users independently', () => {
      for (let i = 0; i < 3; i++) {
        limiter.recordRequest('user1');
      }
      expect(limiter.isAllowed('user1')).toBe(false);
      expect(limiter.isAllowed('user2')).toBe(true);
    });

    it('should report remaining requests correctly', () => {
      expect(limiter.remaining('user1')).toBe(3);
      limiter.recordRequest('user1');
      expect(limiter.remaining('user1')).toBe(2);
    });

    it('should reset after window expires', async () => {
      for (let i = 0; i < 3; i++) {
        limiter.recordRequest('user1');
      }
      expect(limiter.isAllowed('user1')).toBe(false);
      
      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 1100));
      expect(limiter.isAllowed('user1')).toBe(true);
    });
  });

  describe('CircuitBreaker', () => {
    let breaker: CircuitBreaker;

    beforeEach(() => {
      breaker = new CircuitBreaker({
        failureThreshold: 2,
        resetTimeMs: 100
      });
    });

    it('should start in CLOSED state', () => {
      expect((breaker.getState() as any).state).toBe('CLOSED');
    });

    it('should allow calls when CLOSED', async () => {
      const result = await breaker.call(async () => 'success');
      expect(result).toBe('success');
    });

    it('should track successful calls', async () => {
      await breaker.call(async () => 'success');
      expect((breaker.getState() as any).successes).toBe(1);
    });

    it('should open circuit after failure threshold', async () => {
      const failingFn = async () => { throw new Error('API error'); };
      
      // First failure
      await expect(breaker.call(failingFn)).rejects.toThrow('API error');
      expect((breaker.getState() as any).state).toBe('CLOSED');
      
      // Second failure - should open circuit
      await expect(breaker.call(failingFn)).rejects.toThrow('API error');
      expect((breaker.getState() as any).state).toBe('OPEN');
    });

    it('should reject calls when OPEN', async () => {
      // Force circuit open using test method
      breaker.forceOpen(0);
      
      await expect(breaker.call(async () => 'success')).rejects.toThrow('Circuit breaker is OPEN');
    });

    it('should transition to HALF_OPEN after reset time', async () => {
      // Force circuit open with old timestamp (200ms ago, past reset time of 100ms)
      breaker.forceOpen(200);
      
      // Should transition to HALF_OPEN and allow call
      const result = await breaker.call(async () => 'success');
      expect(result).toBe('success');
      expect((breaker.getState() as any).state).toBe('CLOSED');
    });

    it('should close circuit on success in HALF_OPEN', async () => {
      breaker.forceHalfOpen();
      
      await breaker.call(async () => 'success');
      expect((breaker.getState() as any).state).toBe('CLOSED');
    });

    it('should re-open circuit on failure in HALF_OPEN', async () => {
      breaker.forceHalfOpen();
      
      await expect(breaker.call(async () => { throw new Error('fail'); })).rejects.toThrow();
      expect((breaker.getState() as any).state).toBe('OPEN');
    });
  });

  describe('isUrlSafe', () => {
    it('should allow valid HTTPS URLs', () => {
      expect(isUrlSafe('https://api.example.com/data')).toBe(true);
      expect(isUrlSafe('https://github.com')).toBe(true);
    });

    it('should allow valid HTTP URLs', () => {
      expect(isUrlSafe('http://api.example.com/data')).toBe(true);
    });

    it('should block localhost', () => {
      expect(isUrlSafe('http://localhost/api')).toBe(false);
      expect(isUrlSafe('http://127.0.0.1/api')).toBe(false);
      expect(isUrlSafe('http://0.0.0.0/api')).toBe(false);
    });

    it('should block private network ranges', () => {
      expect(isUrlSafe('http://10.0.0.1/api')).toBe(false);
      expect(isUrlSafe('http://172.16.0.1/api')).toBe(false);
      expect(isUrlSafe('http://192.168.1.1/api')).toBe(false);
    });

    it('should block AWS metadata endpoint', () => {
      expect(isUrlSafe('http://169.254.169.254/latest/meta-data')).toBe(false);
    });

    it('should block non-HTTP protocols', () => {
      expect(isUrlSafe('file:///etc/passwd')).toBe(false);
      expect(isUrlSafe('ftp://ftp.example.com')).toBe(false);
    });

    it('should handle invalid URLs gracefully', () => {
      expect(isUrlSafe('not-a-url')).toBe(false);
      expect(isUrlSafe('')).toBe(false);
    });

    it('should not have false positives for valid public IPs', () => {
      // Ensure IPs that look similar to private ranges are allowed
      expect(isUrlSafe('http://110.0.0.1/api')).toBe(true);  // Not 10.x.x.x
      expect(isUrlSafe('http://8.8.8.8/api')).toBe(true);     // Google DNS
      expect(isUrlSafe('http://1.1.1.1/api')).toBe(true);     // Cloudflare DNS
      expect(isUrlSafe('http://104.16.0.1/api')).toBe(true);  // Cloudflare range
    });

    it('should block all loopback addresses', () => {
      expect(isUrlSafe('http://127.0.0.1/api')).toBe(false);
      expect(isUrlSafe('http://127.1.2.3/api')).toBe(false);  // Also loopback range
      expect(isUrlSafe('http://127.255.255.255/api')).toBe(false);
    });

    it('should block entire Class B private range', () => {
      expect(isUrlSafe('http://172.16.0.1/api')).toBe(false);
      expect(isUrlSafe('http://172.20.100.50/api')).toBe(false);
      expect(isUrlSafe('http://172.31.255.255/api')).toBe(false);
      // But allow IPs outside the 172.16-31 range
      expect(isUrlSafe('http://172.15.0.1/api')).toBe(true);
      expect(isUrlSafe('http://172.32.0.1/api')).toBe(true);
    });
  });

  describe('sanitizeError', () => {
    it('should hide internal error details', () => {
      const error = new Error('Database connection failed at 192.168.1.100:5432');
      const sanitized = sanitizeError(error) as any;
      
      expect(sanitized.message).not.toContain('192.168.1.100');
      expect(sanitized.error).toBe('An error occurred');
    });

    it('should preserve safe error messages', () => {
      const error = new Error('Rate limit exceeded');
      const sanitized = sanitizeError(error) as any;
      
      expect(sanitized.message).toBe('Rate limit exceeded');
    });

    it('should include timestamp', () => {
      const error = new Error('Some error');
      const sanitized = sanitizeError(error) as any;
      
      expect(sanitized.timestamp).toBeDefined();
    });
  });

  describe('redactSensitiveData', () => {
    it('should redact sensitive fields', () => {
      const data = {
        userId: '123',
        apiKey: 'sk-secret-key',
        password: 'super-secret',
        email: 'user@example.com'
      };
      
      const redacted = redactSensitiveData(data) as any;
      
      expect(redacted.userId).toBe('123');
      expect(redacted.email).toBe('user@example.com');
      expect(redacted.apiKey).toBe('[REDACTED]');
      expect(redacted.password).toBe('[REDACTED]');
    });

    it('should not modify the original object', () => {
      const data = { apiKey: 'secret' };
      redactSensitiveData(data);
      
      expect(data.apiKey).toBe('secret');
    });

    it('should handle custom sensitive keys', () => {
      const data = {
        customSecret: 'value',
        normalField: 'visible'
      };
      
      const redacted = redactSensitiveData(data, ['customSecret']) as any;
      
      expect(redacted.customSecret).toBe('[REDACTED]');
      expect(redacted.normalField).toBe('visible');
    });
  });

  describe('buildAdminIPs', () => {
    it('should include localhost IPs', () => {
      const ips = buildAdminIPs({});
      expect(ips).toContain('127.0.0.1');
      expect(ips).toContain('::1');
    });

    it('should include environment variable IPs', () => {
      const ips = buildAdminIPs({
        ADMIN_IP_1: '1.2.3.4',
        ADMIN_IP_2: '5.6.7.8'
      });
      expect(ips).toContain('1.2.3.4');
      expect(ips).toContain('5.6.7.8');
    });

    it('should filter undefined values', () => {
      const ips = buildAdminIPs({
        ADMIN_IP_1: '1.2.3.4',
        ADMIN_IP_2: undefined
      });
      expect(ips).not.toContain(undefined);
    });
  });
});
