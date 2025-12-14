/**
 * @tiltcheck/shared
 * 
 * Shared SDK for TiltCheck API
 * Provides type-safe API client with authentication support
 */

// Client exports
export {
  TiltCheckClient,
  TiltCheckAPIError,
  createClient,
  type ClientConfig,
  type RequestOptions,
} from './client.js';

// Schema exports
export {
  registerSchema,
  loginSchema,
  authResponseSchema,
  userSchema,
  errorSchema,
  type RegisterRequest,
  type LoginRequest,
  type AuthResponse,
  type User,
  type ErrorResponse,
} from './schemas.js';
