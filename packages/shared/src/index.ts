/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
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
