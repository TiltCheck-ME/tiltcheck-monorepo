/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Supabase Auth Types
 * Type definitions for authentication functionality
 */

import type { User as SupabaseUser, Session as SupabaseSession, Provider } from '@supabase/supabase-js';

/**
 * Authentication provider types supported by Supabase
 * Re-export the Provider type from Supabase for compatibility
 */
export type AuthProvider = Provider;

/**
 * Authenticated user representation
 */
export interface AuthUser {
  /** Supabase user ID */
  id: string;
  /** User email address */
  email?: string;
  /** Email verification status */
  emailConfirmed: boolean;
  /** Phone number (if set) */
  phone?: string;
  /** Phone verification status */
  phoneConfirmed: boolean;
  /** Authentication provider used */
  provider?: AuthProvider;
  /** User metadata from provider */
  userMetadata: Record<string, any>;
  /** App-specific metadata */
  appMetadata: Record<string, any>;
  /** Account creation timestamp */
  createdAt: string;
  /** Last sign-in timestamp */
  lastSignInAt?: string;
  /** Discord ID (linked from provider metadata) */
  discordId?: string;
  /** Discord username */
  discordUsername?: string;
  /** User avatar URL */
  avatarUrl?: string;
}

/**
 * Authentication session
 */
export interface AuthSession {
  /** Access token for API requests */
  accessToken: string;
  /** Refresh token for session renewal */
  refreshToken: string;
  /** Token expiry timestamp (Unix epoch) */
  expiresAt: number;
  /** Token type (typically "bearer") */
  tokenType: string;
  /** Authenticated user */
  user: AuthUser;
}

/**
 * Sign up request payload
 */
export interface SignUpRequest {
  email: string;
  password: string;
  options?: {
    /** Custom user metadata to store */
    data?: Record<string, any>;
    /** Email redirect URL after confirmation */
    emailRedirectTo?: string;
  };
}

/**
 * Sign in with password request
 */
export interface SignInWithPasswordRequest {
  email: string;
  password: string;
}

/**
 * Sign in with OAuth request
 */
export interface SignInWithOAuthRequest {
  provider: AuthProvider;
  options?: {
    /** OAuth scopes to request */
    scopes?: string;
    /** Redirect URL after OAuth */
    redirectTo?: string;
    /** Skip browser redirect (for server-side) */
    skipBrowserRedirect?: boolean;
  };
}

/**
 * Magic link request (passwordless)
 */
export interface SignInWithMagicLinkRequest {
  email: string;
  options?: {
    /** Redirect URL after clicking magic link */
    emailRedirectTo?: string;
    /** Create user if not exists */
    shouldCreateUser?: boolean;
  };
}

/**
 * Password reset request
 */
export interface ResetPasswordRequest {
  email: string;
  options?: {
    /** Redirect URL for password reset page */
    redirectTo?: string;
  };
}

/**
 * Update password request
 */
export interface UpdatePasswordRequest {
  password: string;
}

/**
 * Update user request
 */
export interface UpdateUserRequest {
  email?: string;
  password?: string;
  data?: Record<string, any>;
}

/**
 * Authentication result wrapper
 */
export interface AuthResult<T> {
  data: T | null;
  error: AuthError | null;
}

/**
 * Authentication error
 */
export interface AuthError {
  message: string;
  status?: number;
  code?: string;
}

/**
 * Auth state change event types
 */
export type AuthChangeEvent = 
  | 'INITIAL_SESSION'
  | 'SIGNED_IN'
  | 'SIGNED_OUT'
  | 'TOKEN_REFRESHED'
  | 'USER_UPDATED'
  | 'PASSWORD_RECOVERY';

/**
 * Auth state change callback
 */
export type AuthStateChangeCallback = (
  event: AuthChangeEvent,
  session: AuthSession | null
) => void;

/**
 * Auth configuration options
 */
export interface AuthConfig {
  /** Supabase project URL */
  supabaseUrl: string;
  /** Supabase anon/public key */
  supabaseAnonKey: string;
  /** Auto-refresh tokens (default: true) */
  autoRefreshToken?: boolean;
  /** Persist session (default: true) */
  persistSession?: boolean;
  /** Storage key prefix for session data */
  storageKey?: string;
}

/**
 * Helper to map Supabase user to AuthUser
 */
export function mapSupabaseUser(user: SupabaseUser): AuthUser {
  const identities = user.identities || [];
  const discordIdentity = identities.find(i => i.provider === 'discord');
  
  return {
    id: user.id,
    email: user.email,
    emailConfirmed: !!user.email_confirmed_at,
    phone: user.phone,
    phoneConfirmed: !!user.phone_confirmed_at,
    provider: (user.app_metadata?.provider as AuthProvider) || 'email',
    userMetadata: user.user_metadata || {},
    appMetadata: user.app_metadata || {},
    createdAt: user.created_at,
    lastSignInAt: user.last_sign_in_at,
    discordId: discordIdentity?.identity_data?.id,
    discordUsername: discordIdentity?.identity_data?.username || user.user_metadata?.full_name,
    avatarUrl: user.user_metadata?.avatar_url,
  };
}

/**
 * Helper to map Supabase session to AuthSession
 */
export function mapSupabaseSession(session: SupabaseSession): AuthSession {
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at || 0,
    tokenType: session.token_type,
    user: mapSupabaseUser(session.user),
  };
}
