/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * @tiltcheck/shared - API Schemas
 * Zod schemas for API request/response validation
 */

import { z } from 'zod';

// ============================================================================
// Auth Schemas
// ============================================================================

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const authResponseSchema = z.object({
  success: z.boolean(),
  token: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string(),
    roles: z.array(z.string()),
  }),
});

export const userSchema = z.object({
  userId: z.string(),
  email: z.string().optional(),
  discordId: z.string().optional(),
  discordUsername: z.string().optional(),
  walletAddress: z.string().optional(),
  roles: z.array(z.string()),
  type: z.string().optional(),
  isAdmin: z.boolean().optional(),
});

export const errorSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
  details: z.unknown().optional(),
});

// ============================================================================
// Type Exports
// ============================================================================

export type RegisterRequest = z.infer<typeof registerSchema>;
export type LoginRequest = z.infer<typeof loginSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
export type User = z.infer<typeof userSchema>;
export type ErrorResponse = z.infer<typeof errorSchema>;
