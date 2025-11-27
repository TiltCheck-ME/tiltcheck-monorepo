/**
 * Supabase Auth Client
 * Centralized authentication functionality for TiltCheck ecosystem
 * 
 * Implements Supabase Auth following: https://supabase.com/docs/guides/auth
 */

import { createClient, SupabaseClient, AuthChangeEvent as SupabaseAuthEvent } from '@supabase/supabase-js';
import {
  AuthConfig,
  AuthUser,
  AuthSession,
  AuthResult,
  AuthStateChangeCallback,
  SignUpRequest,
  SignInWithPasswordRequest,
  SignInWithOAuthRequest,
  SignInWithMagicLinkRequest,
  ResetPasswordRequest,
  UpdatePasswordRequest,
  UpdateUserRequest,
  mapSupabaseUser,
  mapSupabaseSession,
  AuthChangeEvent,
} from './types.js';

/**
 * Maps Supabase auth events to our AuthChangeEvent type
 */
function mapAuthEvent(event: SupabaseAuthEvent): AuthChangeEvent {
  switch (event) {
    case 'INITIAL_SESSION':
      return 'INITIAL_SESSION';
    case 'SIGNED_IN':
      return 'SIGNED_IN';
    case 'SIGNED_OUT':
      return 'SIGNED_OUT';
    case 'TOKEN_REFRESHED':
      return 'TOKEN_REFRESHED';
    case 'USER_UPDATED':
      return 'USER_UPDATED';
    case 'PASSWORD_RECOVERY':
      return 'PASSWORD_RECOVERY';
    default:
      return 'SIGNED_OUT';
  }
}

/**
 * TiltCheck Supabase Auth Client
 * Provides authentication methods using Supabase Auth
 */
export class SupabaseAuthClient {
  private supabase: SupabaseClient;

  constructor(config: AuthConfig) {
    this.supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        autoRefreshToken: config.autoRefreshToken ?? true,
        persistSession: config.persistSession ?? true,
        storageKey: config.storageKey,
      },
    });
  }

  /**
   * Get the underlying Supabase client for direct access
   */
  getSupabaseClient(): SupabaseClient {
    return this.supabase;
  }

  // ============================================
  // Session Management
  // ============================================

  /**
   * Get the current session (if any)
   */
  async getSession(): Promise<AuthResult<AuthSession>> {
    const { data, error } = await this.supabase.auth.getSession();
    
    if (error) {
      return { data: null, error: { message: error.message, status: error.status } };
    }

    if (!data.session) {
      return { data: null, error: null };
    }

    return { data: mapSupabaseSession(data.session), error: null };
  }

  /**
   * Get the current authenticated user
   */
  async getUser(): Promise<AuthResult<AuthUser>> {
    const { data, error } = await this.supabase.auth.getUser();
    
    if (error) {
      return { data: null, error: { message: error.message, status: error.status } };
    }

    if (!data.user) {
      return { data: null, error: null };
    }

    return { data: mapSupabaseUser(data.user), error: null };
  }

  /**
   * Refresh the current session
   */
  async refreshSession(): Promise<AuthResult<AuthSession>> {
    const { data, error } = await this.supabase.auth.refreshSession();
    
    if (error) {
      return { data: null, error: { message: error.message, status: error.status } };
    }

    if (!data.session) {
      return { data: null, error: { message: 'No session to refresh' } };
    }

    return { data: mapSupabaseSession(data.session), error: null };
  }

  /**
   * Set the session from access/refresh tokens
   */
  async setSession(accessToken: string, refreshToken: string): Promise<AuthResult<AuthSession>> {
    const { data, error } = await this.supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    
    if (error) {
      return { data: null, error: { message: error.message, status: error.status } };
    }

    if (!data.session) {
      return { data: null, error: { message: 'Failed to set session' } };
    }

    return { data: mapSupabaseSession(data.session), error: null };
  }

  // ============================================
  // Sign Up
  // ============================================

  /**
   * Sign up a new user with email and password
   */
  async signUp(request: SignUpRequest): Promise<AuthResult<{ user: AuthUser; session: AuthSession | null }>> {
    const { data, error } = await this.supabase.auth.signUp({
      email: request.email,
      password: request.password,
      options: {
        data: request.options?.data,
        emailRedirectTo: request.options?.emailRedirectTo,
      },
    });

    if (error) {
      return { data: null, error: { message: error.message, status: error.status } };
    }

    if (!data.user) {
      return { data: null, error: { message: 'Sign up failed' } };
    }

    return {
      data: {
        user: mapSupabaseUser(data.user),
        session: data.session ? mapSupabaseSession(data.session) : null,
      },
      error: null,
    };
  }

  // ============================================
  // Sign In
  // ============================================

  /**
   * Sign in with email and password
   */
  async signInWithPassword(request: SignInWithPasswordRequest): Promise<AuthResult<AuthSession>> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: request.email,
      password: request.password,
    });

    if (error) {
      return { data: null, error: { message: error.message, status: error.status } };
    }

    if (!data.session) {
      return { data: null, error: { message: 'Sign in failed' } };
    }

    return { data: mapSupabaseSession(data.session), error: null };
  }

  /**
   * Sign in with OAuth provider (Discord, Google, GitHub, etc.)
   * Returns the OAuth URL to redirect the user to
   */
  async signInWithOAuth(request: SignInWithOAuthRequest): Promise<AuthResult<{ url: string }>> {
    const { data, error } = await this.supabase.auth.signInWithOAuth({
      provider: request.provider,
      options: {
        scopes: request.options?.scopes,
        redirectTo: request.options?.redirectTo,
        skipBrowserRedirect: request.options?.skipBrowserRedirect ?? true,
      },
    });

    if (error) {
      return { data: null, error: { message: error.message, status: error.status } };
    }

    if (!data.url) {
      return { data: null, error: { message: 'Failed to get OAuth URL' } };
    }

    return { data: { url: data.url }, error: null };
  }

  /**
   * Sign in with magic link (passwordless email)
   */
  async signInWithMagicLink(request: SignInWithMagicLinkRequest): Promise<AuthResult<{ success: boolean }>> {
    const { error } = await this.supabase.auth.signInWithOtp({
      email: request.email,
      options: {
        emailRedirectTo: request.options?.emailRedirectTo,
        shouldCreateUser: request.options?.shouldCreateUser ?? true,
      },
    });

    if (error) {
      return { data: null, error: { message: error.message, status: error.status } };
    }

    return { data: { success: true }, error: null };
  }

  /**
   * Verify OTP code (for magic link or phone auth)
   */
  async verifyOtp(token: string, type: 'signup' | 'magiclink' | 'recovery', email: string): Promise<AuthResult<AuthSession>> {
    const { data, error } = await this.supabase.auth.verifyOtp({
      token,
      type,
      email,
    });

    if (error) {
      return { data: null, error: { message: error.message, status: error.status } };
    }

    if (!data.session) {
      return { data: null, error: { message: 'Verification failed' } };
    }

    return { data: mapSupabaseSession(data.session), error: null };
  }

  // ============================================
  // Sign Out
  // ============================================

  /**
   * Sign out the current user
   */
  async signOut(): Promise<AuthResult<{ success: boolean }>> {
    const { error } = await this.supabase.auth.signOut();

    if (error) {
      return { data: null, error: { message: error.message, status: error.status } };
    }

    return { data: { success: true }, error: null };
  }

  // ============================================
  // Password Management
  // ============================================

  /**
   * Send password reset email
   */
  async resetPassword(request: ResetPasswordRequest): Promise<AuthResult<{ success: boolean }>> {
    const { error } = await this.supabase.auth.resetPasswordForEmail(request.email, {
      redirectTo: request.options?.redirectTo,
    });

    if (error) {
      return { data: null, error: { message: error.message, status: error.status } };
    }

    return { data: { success: true }, error: null };
  }

  /**
   * Update password for the current user
   */
  async updatePassword(request: UpdatePasswordRequest): Promise<AuthResult<AuthUser>> {
    const { data, error } = await this.supabase.auth.updateUser({
      password: request.password,
    });

    if (error) {
      return { data: null, error: { message: error.message, status: error.status } };
    }

    if (!data.user) {
      return { data: null, error: { message: 'Password update failed' } };
    }

    return { data: mapSupabaseUser(data.user), error: null };
  }

  // ============================================
  // User Management
  // ============================================

  /**
   * Update the current user's information
   */
  async updateUser(request: UpdateUserRequest): Promise<AuthResult<AuthUser>> {
    const { data, error } = await this.supabase.auth.updateUser({
      email: request.email,
      password: request.password,
      data: request.data,
    });

    if (error) {
      return { data: null, error: { message: error.message, status: error.status } };
    }

    if (!data.user) {
      return { data: null, error: { message: 'User update failed' } };
    }

    return { data: mapSupabaseUser(data.user), error: null };
  }

  // ============================================
  // Auth State Listeners
  // ============================================

  /**
   * Subscribe to auth state changes
   * Returns an unsubscribe function
   */
  onAuthStateChange(callback: AuthStateChangeCallback): { unsubscribe: () => void } {
    const { data } = this.supabase.auth.onAuthStateChange((event, session) => {
      const mappedEvent = mapAuthEvent(event);
      const mappedSession = session ? mapSupabaseSession(session) : null;
      callback(mappedEvent, mappedSession);
    });

    return {
      unsubscribe: () => data.subscription.unsubscribe(),
    };
  }

  // ============================================
  // OAuth Token Exchange (for server-side)
  // ============================================

  /**
   * Exchange an OAuth code for a session
   * Use this in callback routes after OAuth redirect
   */
  async exchangeCodeForSession(code: string): Promise<AuthResult<AuthSession>> {
    const { data, error } = await this.supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return { data: null, error: { message: error.message, status: error.status } };
    }

    if (!data.session) {
      return { data: null, error: { message: 'Code exchange failed' } };
    }

    return { data: mapSupabaseSession(data.session), error: null };
  }

  // ============================================
  // Admin Operations (requires service_role key)
  // ============================================

  /**
   * Get user by ID (admin only - requires service_role key)
   */
  async getUserById(userId: string): Promise<AuthResult<AuthUser>> {
    const { data, error } = await this.supabase.auth.admin.getUserById(userId);

    if (error) {
      return { data: null, error: { message: error.message, status: error.status } };
    }

    if (!data.user) {
      return { data: null, error: { message: 'User not found' } };
    }

    return { data: mapSupabaseUser(data.user), error: null };
  }

  /**
   * Delete user (admin only - requires service_role key)
   */
  async deleteUser(userId: string): Promise<AuthResult<{ success: boolean }>> {
    const { error } = await this.supabase.auth.admin.deleteUser(userId);

    if (error) {
      return { data: null, error: { message: error.message, status: error.status } };
    }

    return { data: { success: true }, error: null };
  }
}

/**
 * Create a new Supabase Auth client
 */
export function createAuthClient(config: AuthConfig): SupabaseAuthClient {
  return new SupabaseAuthClient(config);
}

/**
 * Create auth client from environment variables
 */
export function createAuthClientFromEnv(): SupabaseAuthClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required');
  }

  return createAuthClient({
    supabaseUrl: url,
    supabaseAnonKey: key,
  });
}
