/**
 * Supabase Auth Client Tests
 */

import { describe, it, expect } from 'vitest';
import {
  mapSupabaseUser,
  mapSupabaseSession,
} from '../src/types.js';
import type { AuthUser, AuthSession } from '../src/types.js';

// Mock Supabase user object
const mockSupabaseUser = {
  id: 'user-123',
  email: 'test@example.com',
  email_confirmed_at: '2024-01-01T00:00:00Z',
  phone: '+1234567890',
  phone_confirmed_at: null,
  created_at: '2024-01-01T00:00:00Z',
  last_sign_in_at: '2024-01-15T00:00:00Z',
  app_metadata: {
    provider: 'discord',
    roles: ['user'],
  },
  user_metadata: {
    full_name: 'Test User',
    avatar_url: 'https://example.com/avatar.png',
  },
  identities: [
    {
      id: 'identity-1',
      provider: 'discord',
      identity_data: {
        id: 'discord-123',
        username: 'testuser#1234',
      },
    },
  ],
  aud: 'authenticated',
  role: 'authenticated',
};

// Mock Supabase session object
const mockSupabaseSession = {
  access_token: 'access-token-123',
  refresh_token: 'refresh-token-456',
  expires_at: 1704067200,
  token_type: 'bearer',
  user: mockSupabaseUser,
};

describe('mapSupabaseUser', () => {
  it('should map basic user properties', () => {
    const result = mapSupabaseUser(mockSupabaseUser as any);

    expect(result.id).toBe('user-123');
    expect(result.email).toBe('test@example.com');
    expect(result.emailConfirmed).toBe(true);
    expect(result.phone).toBe('+1234567890');
    expect(result.phoneConfirmed).toBe(false);
    expect(result.createdAt).toBe('2024-01-01T00:00:00Z');
    expect(result.lastSignInAt).toBe('2024-01-15T00:00:00Z');
  });

  it('should extract Discord identity', () => {
    const result = mapSupabaseUser(mockSupabaseUser as any);

    expect(result.discordId).toBe('discord-123');
    expect(result.discordUsername).toBe('testuser#1234');
  });

  it('should map provider from app_metadata', () => {
    const result = mapSupabaseUser(mockSupabaseUser as any);

    expect(result.provider).toBe('discord');
  });

  it('should map avatar URL', () => {
    const result = mapSupabaseUser(mockSupabaseUser as any);

    expect(result.avatarUrl).toBe('https://example.com/avatar.png');
  });

  it('should handle user without identities', () => {
    const userWithoutIdentities = {
      ...mockSupabaseUser,
      identities: [],
    };

    const result = mapSupabaseUser(userWithoutIdentities as any);

    expect(result.discordId).toBeUndefined();
    expect(result.discordUsername).toBe('Test User'); // Falls back to full_name
  });

  it('should handle user without email confirmation', () => {
    const userUnconfirmed = {
      ...mockSupabaseUser,
      email_confirmed_at: null,
    };

    const result = mapSupabaseUser(userUnconfirmed as any);

    expect(result.emailConfirmed).toBe(false);
  });
});

describe('mapSupabaseSession', () => {
  it('should map session properties', () => {
    const result = mapSupabaseSession(mockSupabaseSession as any);

    expect(result.accessToken).toBe('access-token-123');
    expect(result.refreshToken).toBe('refresh-token-456');
    expect(result.expiresAt).toBe(1704067200);
    expect(result.tokenType).toBe('bearer');
  });

  it('should include mapped user in session', () => {
    const result = mapSupabaseSession(mockSupabaseSession as any);

    expect(result.user).toBeDefined();
    expect(result.user.id).toBe('user-123');
    expect(result.user.email).toBe('test@example.com');
  });

  it('should handle missing expires_at', () => {
    const sessionNoExpiry = {
      ...mockSupabaseSession,
      expires_at: undefined,
    };

    const result = mapSupabaseSession(sessionNoExpiry as any);

    expect(result.expiresAt).toBe(0);
  });
});

describe('AuthUser type', () => {
  it('should have correct structure', () => {
    const user: AuthUser = {
      id: 'user-123',
      email: 'test@example.com',
      emailConfirmed: true,
      phoneConfirmed: false,
      userMetadata: {},
      appMetadata: {},
      createdAt: '2024-01-01T00:00:00Z',
    };

    expect(user.id).toBe('user-123');
    expect(user.emailConfirmed).toBe(true);
    expect(user.phoneConfirmed).toBe(false);
  });

  it('should allow optional properties', () => {
    const user: AuthUser = {
      id: 'user-123',
      emailConfirmed: false,
      phoneConfirmed: false,
      userMetadata: {},
      appMetadata: {},
      createdAt: '2024-01-01T00:00:00Z',
    };

    expect(user.email).toBeUndefined();
    expect(user.phone).toBeUndefined();
    expect(user.discordId).toBeUndefined();
    expect(user.avatarUrl).toBeUndefined();
  });
});

describe('AuthSession type', () => {
  it('should have correct structure', () => {
    const session: AuthSession = {
      accessToken: 'token',
      refreshToken: 'refresh',
      expiresAt: 1234567890,
      tokenType: 'bearer',
      user: {
        id: 'user-123',
        emailConfirmed: true,
        phoneConfirmed: false,
        userMetadata: {},
        appMetadata: {},
        createdAt: '2024-01-01T00:00:00Z',
      },
    };

    expect(session.accessToken).toBe('token');
    expect(session.user.id).toBe('user-123');
  });
});
