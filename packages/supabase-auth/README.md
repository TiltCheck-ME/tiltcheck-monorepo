# @tiltcheck/supabase-auth

Supabase Authentication integration for the TiltCheck ecosystem.

## Overview

This package provides a centralized authentication layer using [Supabase Auth](https://supabase.com/docs/guides/auth), supporting:

- Email/Password authentication
- OAuth providers (Discord, Google, GitHub, etc.)
- Magic link (passwordless) authentication
- Session management
- Express middleware for route protection
- Role-based access control

## Installation

The package is included in the TiltCheck monorepo. For external use:

```bash
pnpm add @tiltcheck/supabase-auth
```

## Configuration

Set the following environment variables:

```bash
# Required
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Optional (for admin operations)
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

## Usage

### Creating an Auth Client

```typescript
import { createAuthClient, createAuthClientFromEnv } from '@tiltcheck/supabase-auth';

// From config
const auth = createAuthClient({
  supabaseUrl: process.env.SUPABASE_URL!,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY!,
});

// Or from environment variables
const auth = createAuthClientFromEnv();
```

### Sign Up with Email/Password

```typescript
const { data, error } = await auth.signUp({
  email: 'user@example.com',
  password: 'securepassword',
  options: {
    data: { username: 'testuser' },
    emailRedirectTo: 'https://yourapp.com/confirm',
  },
});

if (error) {
  console.error('Sign up failed:', error.message);
} else {
  console.log('User created:', data.user);
}
```

### Sign In with Password

```typescript
const { data: session, error } = await auth.signInWithPassword({
  email: 'user@example.com',
  password: 'securepassword',
});

if (session) {
  console.log('Signed in! Token:', session.accessToken);
}
```

### Sign In with OAuth (Discord, Google, etc.)

```typescript
const { data, error } = await auth.signInWithOAuth({
  provider: 'discord',
  options: {
    scopes: 'identify email',
    redirectTo: 'https://yourapp.com/auth/callback',
  },
});

if (data?.url) {
  // Redirect user to OAuth provider
  res.redirect(data.url);
}
```

### Magic Link (Passwordless)

```typescript
const { data, error } = await auth.signInWithMagicLink({
  email: 'user@example.com',
  options: {
    emailRedirectTo: 'https://yourapp.com/login',
  },
});

if (data?.success) {
  console.log('Magic link sent!');
}
```

### Session Management

```typescript
// Get current session
const { data: session } = await auth.getSession();

// Get current user
const { data: user } = await auth.getUser();

// Refresh session
const { data: newSession } = await auth.refreshSession();

// Sign out
await auth.signOut();
```

### Password Reset

```typescript
// Request password reset email
await auth.resetPassword({
  email: 'user@example.com',
  options: {
    redirectTo: 'https://yourapp.com/reset-password',
  },
});

// Update password (after clicking reset link)
await auth.updatePassword({
  password: 'newSecurePassword',
});
```

### Auth State Listeners

```typescript
const { unsubscribe } = auth.onAuthStateChange((event, session) => {
  console.log('Auth event:', event);
  
  switch (event) {
    case 'SIGNED_IN':
      console.log('User signed in:', session?.user);
      break;
    case 'SIGNED_OUT':
      console.log('User signed out');
      break;
    case 'TOKEN_REFRESHED':
      console.log('Token refreshed');
      break;
  }
});

// Clean up when done
unsubscribe();
```

## Express Middleware

### Basic Authentication

```typescript
import express from 'express';
import { requireAuth, optionalAuth } from '@tiltcheck/supabase-auth';

const app = express();

// Require authentication (returns 401 if not authenticated)
app.get('/api/protected', requireAuth(), (req, res) => {
  res.json({ user: req.user });
});

// Optional authentication (continues without user if not authenticated)
app.get('/api/public', optionalAuth(), (req, res) => {
  if (req.user) {
    res.json({ message: 'Hello, ' + req.user.email });
  } else {
    res.json({ message: 'Hello, guest!' });
  }
});
```

### Role-Based Access

```typescript
import { requireAuth, requireRole } from '@tiltcheck/supabase-auth';

// Require admin role
app.get('/api/admin', requireAuth(), requireRole('admin'), (req, res) => {
  res.json({ message: 'Welcome, admin!' });
});
```

### Email Verification

```typescript
import { requireAuth, requireVerifiedEmail } from '@tiltcheck/supabase-auth';

app.get('/api/verified-only', requireAuth(), requireVerifiedEmail(), (req, res) => {
  res.json({ message: 'Your email is verified!' });
});
```

### Discord Account Required

```typescript
import { requireAuth, requireDiscordLinked } from '@tiltcheck/supabase-auth';

app.get('/api/discord-users', requireAuth(), requireDiscordLinked(), (req, res) => {
  res.json({ discordId: req.user?.discordId });
});
```

## Types

### AuthUser

```typescript
interface AuthUser {
  id: string;
  email?: string;
  emailConfirmed: boolean;
  phone?: string;
  phoneConfirmed: boolean;
  provider?: AuthProvider;
  userMetadata: Record<string, any>;
  appMetadata: Record<string, any>;
  createdAt: string;
  lastSignInAt?: string;
  discordId?: string;
  discordUsername?: string;
  avatarUrl?: string;
}
```

### AuthSession

```typescript
interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  tokenType: string;
  user: AuthUser;
}
```

## Supabase Setup

1. Create a Supabase project at https://supabase.com
2. Enable desired auth providers in Authentication > Providers
3. For Discord OAuth:
   - Create a Discord application at https://discord.com/developers/applications
   - Add OAuth2 redirect URL: `https://your-project.supabase.co/auth/v1/callback`
   - Copy Client ID and Secret to Supabase Discord provider settings

## License

UNLICENSED - TiltCheck Ecosystem
