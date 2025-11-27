/**
 * @tiltcheck/supabase-auth
 * 
 * Supabase Authentication integration for TiltCheck ecosystem
 * Implements authentication following: https://supabase.com/docs/guides/auth
 * 
 * Features:
 * - Email/Password authentication
 * - OAuth providers (Discord, Google, GitHub, etc.)
 * - Magic link (passwordless) authentication
 * - Session management
 * - Express middleware for route protection
 * - Role-based access control
 * 
 * @example
 * ```typescript
 * import { createAuthClient, requireAuth } from '@tiltcheck/supabase-auth';
 * 
 * // Create auth client
 * const auth = createAuthClient({
 *   supabaseUrl: process.env.SUPABASE_URL!,
 *   supabaseAnonKey: process.env.SUPABASE_ANON_KEY!,
 * });
 * 
 * // Sign up a user
 * const { data, error } = await auth.signUp({
 *   email: 'user@example.com',
 *   password: 'securepassword',
 * });
 * 
 * // Protect Express routes
 * app.get('/api/protected', requireAuth(), (req, res) => {
 *   res.json({ user: req.user });
 * });
 * ```
 */

// Client exports
export {
  SupabaseAuthClient,
  createAuthClient,
  createAuthClientFromEnv,
} from './client.js';

// Type exports
export type {
  AuthConfig,
  AuthUser,
  AuthSession,
  AuthResult,
  AuthError,
  AuthProvider,
  AuthChangeEvent,
  AuthStateChangeCallback,
  SignUpRequest,
  SignInWithPasswordRequest,
  SignInWithOAuthRequest,
  SignInWithMagicLinkRequest,
  ResetPasswordRequest,
  UpdatePasswordRequest,
  UpdateUserRequest,
} from './types.js';

// Helper function exports
export {
  mapSupabaseUser,
  mapSupabaseSession,
} from './types.js';

// Middleware exports
export {
  authMiddleware,
  requireAuth,
  optionalAuth,
  requireRole,
  requireVerifiedEmail,
  requireDiscordLinked,
} from './middleware.js';

export type { AuthMiddlewareOptions } from './middleware.js';
