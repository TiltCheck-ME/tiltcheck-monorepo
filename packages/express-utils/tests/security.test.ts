/**
 * Tests for API Security utilities
 * @tiltcheck/express-utils/security
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
const security = require('../src/security.js');

describe('API Security Utilities', () => {
  describe('signRequest / verifySignature', () => {
    const secret = 'test-secret-key-12345';
    const payload = { userId: '123', action: 'tip', amount: 5 };

    it('should generate consistent signatures for same payload', () => {
      const sig1 = security.signRequest(payload, secret);
      const sig2 = security.signRequest(payload, secret);
      expect(sig1).toBe(sig2);
    });

    it('should generate different signatures for different payloads', () => {
      const sig1 = security.signRequest(payload, secret);
      const sig2 = security.signRequest({ ...payload, amount: 10 }, secret);
      expect(sig1).not.toBe(sig2);
    });

    it('should verify valid signatures', () => {
      const signature = security.signRequest(payload, secret);
      expect(security.verifySignature(payload, signature, secret)).toBe(true);
    });

    it('should reject invalid signatures', () => {
      const signature = security.signRequest(payload, secret);
      expect(security.verifySignature(payload, 'invalid-signature', secret)).toBe(false);
    });

    it('should reject signatures with wrong secret', () => {
      const signature = security.signRequest(payload, secret);
      expect(security.verifySignature(payload, signature, 'wrong-secret')).toBe(false);
    });

    it('should handle string payloads', () => {
      const stringPayload = 'simple string payload';
      const signature = security.signRequest(stringPayload, secret);
      expect(security.verifySignature(stringPayload, signature, secret)).toBe(true);
    });
  });

  describe('RateLimiter', () => {
    let limiter;

    beforeEach(() => {
      limiter = new security.RateLimiter(3, 1000); // 3 requests per second
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
    let breaker;

    beforeEach(() => {
      breaker = new security.CircuitBreaker({
        failureThreshold: 2,
        resetTimeMs: 100
      });
    });

    it('should start in CLOSED state', () => {
      expect(breaker.getState().state).toBe('CLOSED');
    });

    it('should allow calls when CLOSED', async () => {
      const result = await breaker.call(async () => 'success');
      expect(result).toBe('success');
    });

    it('should track successful calls', async () => {
      await breaker.call(async () => 'success');
      expect(breaker.getState().successes).toBe(1);
    });

    it('should open circuit after failure threshold', async () => {
      const failingFn = async () => { throw new Error('API error'); };
      
      // First failure
      await expect(breaker.call(failingFn)).rejects.toThrow('API error');
      expect(breaker.getState().state).toBe('CLOSED');
      
      // Second failure - should open circuit
      await expect(breaker.call(failingFn)).rejects.toThrow('API error');
      expect(breaker.getState().state).toBe('OPEN');
    });

    it('should reject calls when OPEN', async () => {
      // Force circuit open
      breaker.state = 'OPEN';
      breaker.lastFailure = Date.now();
      
      await expect(breaker.call(async () => 'success')).rejects.toThrow('Circuit breaker is OPEN');
    });

    it('should transition to HALF_OPEN after reset time', async () => {
      // Force circuit open with old timestamp
      breaker.state = 'OPEN';
      breaker.lastFailure = Date.now() - 200; // Past reset time
      
      // Should transition to HALF_OPEN and allow call
      const result = await breaker.call(async () => 'success');
      expect(result).toBe('success');
      expect(breaker.getState().state).toBe('CLOSED');
    });

    it('should close circuit on success in HALF_OPEN', async () => {
      breaker.state = 'HALF_OPEN';
      
      await breaker.call(async () => 'success');
      expect(breaker.getState().state).toBe('CLOSED');
    });

    it('should re-open circuit on failure in HALF_OPEN', async () => {
      breaker.state = 'HALF_OPEN';
      
      await expect(breaker.call(async () => { throw new Error('fail'); })).rejects.toThrow();
      expect(breaker.getState().state).toBe('OPEN');
    });
  });

  describe('isUrlSafe', () => {
    it('should allow valid HTTPS URLs', () => {
      expect(security.isUrlSafe('https://api.example.com/data')).toBe(true);
      expect(security.isUrlSafe('https://github.com')).toBe(true);
    });

    it('should allow valid HTTP URLs', () => {
      expect(security.isUrlSafe('http://api.example.com/data')).toBe(true);
    });

    it('should block localhost', () => {
      expect(security.isUrlSafe('http://localhost/api')).toBe(false);
      expect(security.isUrlSafe('http://127.0.0.1/api')).toBe(false);
      expect(security.isUrlSafe('http://0.0.0.0/api')).toBe(false);
    });

    it('should block private network ranges', () => {
      expect(security.isUrlSafe('http://10.0.0.1/api')).toBe(false);
      expect(security.isUrlSafe('http://172.16.0.1/api')).toBe(false);
      expect(security.isUrlSafe('http://192.168.1.1/api')).toBe(false);
    });

    it('should block AWS metadata endpoint', () => {
      expect(security.isUrlSafe('http://169.254.169.254/latest/meta-data')).toBe(false);
    });

    it('should block non-HTTP protocols', () => {
      expect(security.isUrlSafe('file:///etc/passwd')).toBe(false);
      expect(security.isUrlSafe('ftp://ftp.example.com')).toBe(false);
    });

    it('should handle invalid URLs gracefully', () => {
      expect(security.isUrlSafe('not-a-url')).toBe(false);
      expect(security.isUrlSafe('')).toBe(false);
    });
  });

  describe('sanitizeError', () => {
    it('should hide internal error details', () => {
      const error = new Error('Database connection failed at 192.168.1.100:5432');
      const sanitized = security.sanitizeError(error);
      
      expect(sanitized.message).not.toContain('192.168.1.100');
      expect(sanitized.error).toBe('An error occurred');
    });

    it('should preserve safe error messages', () => {
      const error = new Error('Rate limit exceeded');
      const sanitized = security.sanitizeError(error);
      
      expect(sanitized.message).toBe('Rate limit exceeded');
    });

    it('should include timestamp', () => {
      const error = new Error('Some error');
      const sanitized = security.sanitizeError(error);
      
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
      
      const redacted = security.redactSensitiveData(data);
      
      expect(redacted.userId).toBe('123');
      expect(redacted.email).toBe('user@example.com');
      expect(redacted.apiKey).toBe('[REDACTED]');
      expect(redacted.password).toBe('[REDACTED]');
    });

    it('should not modify the original object', () => {
      const data = { apiKey: 'secret' };
      security.redactSensitiveData(data);
      
      expect(data.apiKey).toBe('secret');
    });

    it('should handle custom sensitive keys', () => {
      const data = {
        customSecret: 'value',
        normalField: 'visible'
      };
      
      const redacted = security.redactSensitiveData(data, ['customSecret']);
      
      expect(redacted.customSecret).toBe('[REDACTED]');
      expect(redacted.normalField).toBe('visible');
    });
  });

  describe('buildAdminIPs', () => {
    it('should include localhost IPs', () => {
      const ips = security.buildAdminIPs({});
      expect(ips).toContain('127.0.0.1');
      expect(ips).toContain('::1');
    });

    it('should include environment variable IPs', () => {
      const ips = security.buildAdminIPs({
        ADMIN_IP_1: '1.2.3.4',
        ADMIN_IP_2: '5.6.7.8'
      });
      expect(ips).toContain('1.2.3.4');
      expect(ips).toContain('5.6.7.8');
    });

    it('should filter undefined values', () => {
      const ips = security.buildAdminIPs({
        ADMIN_IP_1: '1.2.3.4',
        ADMIN_IP_2: undefined
      });
      expect(ips).not.toContain(undefined);
    });
  });
});
