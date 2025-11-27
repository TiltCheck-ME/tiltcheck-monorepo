// @tiltcheck/express-utils
// Shared Express middleware and utilities for TiltCheck services

const { initLogging } = require('./logging');
const { 
  buildAdminIPs, 
  ipAllowlistMiddleware,
  signRequest,
  verifySignature,
  signatureVerificationMiddleware,
  RateLimiter,
  rateLimitMiddleware,
  CircuitBreaker,
  sanitizeError,
  isUrlSafe,
  redactSensitiveData
} = require('./security');

module.exports = {
  // Logging
  initLogging,
  
  // IP Security (existing)
  buildAdminIPs,
  ipAllowlistMiddleware,
  
  // API Signature Verification
  signRequest,
  verifySignature,
  signatureVerificationMiddleware,
  
  // Rate Limiting
  RateLimiter,
  rateLimitMiddleware,
  
  // Circuit Breaker
  CircuitBreaker,
  
  // Security Utilities
  sanitizeError,
  isUrlSafe,
  redactSensitiveData
};
