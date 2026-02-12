# JWT Authentication Implementation

This document describes the JWT authentication system implemented across the TiltCheck monorepo.

## Overview

A complete JWT-based authentication system has been implemented with:
- **API**: JWT auth endpoints with bcrypt password hashing
- **Shared SDK**: Type-safe API client with Zod validation
- **CLI**: Command-line interface with token management
- **Web**: React Query integration with auth state management

## Architecture

### 1. Database Layer (`packages/db`)

**Changes:**
- Added `hashed_password` field to User type
- Updated CreateUserPayload and UpdateUserPayload interfaces
- All existing user queries support password field

**Files Modified:**
- `packages/db/src/types.ts`

### 2. API Layer (`apps/api`)

**New Endpoints:**

```bash
POST /auth/register
Body: { "email": "user@example.com", "password": "password123" }
Response: { "success": true, "token": "jwt...", "user": {...} }

POST /auth/login
Body: { "email": "user@example.com", "password": "password123" }
Response: { "success": true, "token": "jwt...", "user": {...} }

GET /auth/me
Headers: { "Authorization": "Bearer jwt..." }
Response: { "userId": "...", "email": "...", "roles": [...] }
```

**New Middleware:**
- `apps/api/src/middleware/auth.ts`: JWT verification middleware
- Attaches decoded user to `req.user`
- Validates token signature and expiration
- Checks user exists in database

**Files Added:**
- `apps/api/src/middleware/auth.ts`

**Files Modified:**
- `apps/api/src/routes/auth.ts` - Added register/login endpoints
- `apps/api/package.json` - Added jsonwebtoken, bcryptjs

**Dependencies Added:**
```json
{
  "jsonwebtoken": "^9.0.2",
  "bcryptjs": "^3.0.3",
  "@types/jsonwebtoken": "^9.0.10"
}
```

### 3. Shared SDK (`packages/shared`)

**New Package**: `@tiltcheck/shared`

**Features:**
- Zod schemas for request/response validation
- Type-safe API client with auto-token management
- Fetch-based requests with auth headers
- Error handling with custom error class

**Example Usage:**

```typescript
import { createClient } from '@tiltcheck/shared';

const client = createClient({
  baseUrl: 'http://localhost:4000'
});

// Register
const { token, user } = await client.register({
  email: 'user@example.com',
  password: 'password123'
});

// Login
const { token } = await client.login({
  email: 'user@example.com',
  password: 'password123'
});

// Get current user (requires token)
const user = await client.me();
```

**Files Added:**
- `packages/shared/src/schemas.ts` - Zod schemas
- `packages/shared/src/client.ts` - API client
- `packages/shared/src/index.ts` - Package exports
- `packages/shared/package.json`
- `packages/shared/tsconfig.json`

### 4. CLI (`packages/cli`)

**New Package**: `@tiltcheck/cli`

**Commands:**

```bash
# Login
tiltcheck login
# Prompts for email/password, saves token to ~/.tiltcheck/token

# Show current user
tiltcheck whoami
# Displays logged-in user info

# Logout
tiltcheck logout
# Clears saved token

# Example protected command
tiltcheck checklists
# Requires authentication
```

**Features:**
- Token stored in `~/.tiltcheck/token`
- Interactive prompts for credentials
- Uses shared SDK for API calls
- Validates authentication before protected commands

**Files Added:**
- `packages/cli/src/index.ts` - CLI entry point
- `packages/cli/src/auth.ts` - Token management
- `packages/cli/src/commands/auth.ts` - Auth commands
- `packages/cli/src/commands/checklists.ts` - Example protected command
- `packages/cli/package.json`
- `packages/cli/tsconfig.json`

### 5. Web Integration (`apps/dashboard`)

**Features:**
- TanStack Query for server state management
- Token stored in localStorage
- Shared SDK integration
- Singleton API client

**Example Usage:**

```typescript
import { getApiClient, setAuthToken } from '@/lib/api-client';
import { queryClient } from '@/lib/query-client';

// Login
const client = getApiClient();
const { token } = await client.login({
  email: 'user@example.com',
  password: 'password123'
});
setAuthToken(token);

// Use with React Query
const { data: user } = useQuery({
  queryKey: ['user', 'me'],
  queryFn: () => client.me()
});
```

**Files Added:**
- `apps/dashboard/src/lib/query-client.ts` - Query client config
- `apps/dashboard/src/lib/api-client.ts` - API client setup

**Dependencies Added:**
```json
{
  "@tanstack/react-query": "^5.90.12",
  "@tiltcheck/shared": "workspace:*"
}
```

## Environment Variables

Add to `.env`:

```bash
# JWT Authentication
JWT_SECRET=supersecret  # Change in production!
JWT_EXPIRES_IN=7d

# Database (required for auth to work)
NEON_DATABASE_URL=postgresql://user:pass@host/db
```

## Database Migration

To add the `hashed_password` column to the users table:

```sql
ALTER TABLE users 
ADD COLUMN hashed_password TEXT DEFAULT NULL;
```

## Usage Examples

### 1. Protecting API Routes

```typescript
import { authMiddleware } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';

router.post('/protected', authMiddleware, async (req, res) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.id;
  
  // User is authenticated
  res.json({ message: 'Protected resource', userId });
});
```

### 2. CLI Usage

```bash
# Build packages
pnpm run build

# Use CLI
cd packages/cli
node dist/index.js login --url http://localhost:4000
# Enter credentials when prompted

# Check authentication
node dist/index.js whoami

# Run protected command
node dist/index.js checklists
```

### 3. Web Usage

```typescript
'use client';

import { useState } from 'react';
import { getApiClient, setAuthToken } from '@/lib/api-client';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const client = getApiClient();
      const { token, user } = await client.login({ email, password });
      
      setAuthToken(token);
      console.log('Logged in as:', user.email);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <button type="submit">Login</button>
    </form>
  );
}
```

## Testing

### Manual API Testing

```bash
# Start API server
cd apps/api
JWT_SECRET=supersecret NEON_DATABASE_URL=your_db_url node dist/index.js

# Register user
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Get user info (use token from login response)
curl http://localhost:4000/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### CLI Testing

```bash
cd packages/cli

# Build
pnpm build

# Test login
node dist/index.js login --url http://localhost:4000

# Test whoami
node dist/index.js whoami

# Test protected command
node dist/index.js checklists

# Test logout
node dist/index.js logout
```

## Security Considerations

1. **JWT_SECRET**: Change from default in production
2. **Password Requirements**: Minimum 6 characters (adjust as needed)
3. **Token Expiration**: Default 7 days (configurable)
4. **HTTPS**: Required in production for token transmission
5. **bcrypt**: Uses 10 salt rounds for password hashing

## Build Process

All packages build successfully with TypeScript:

```bash
# Build all packages
pnpm run build

# Build specific packages
pnpm --filter @tiltcheck/shared build
pnpm --filter @tiltcheck/cli build
pnpm --filter @tiltcheck/api build
pnpm --filter @tiltcheck/dashboard build
```

## Acceptance Criteria

✅ **Implemented:**
- JWT auth endpoints (login, register, me)
- Shared SDK with Zod validation
- CLI with token management
- Web integration with TanStack Query
- All packages build successfully
- Minimal code changes maintained

⚠️ **Requires Database:**
- Runtime testing of API endpoints
- User registration/login
- Token validation
- CLI authentication flow

## Future Enhancements

1. Add refresh token support
2. Implement password reset flow
3. Add email verification
4. Add rate limiting per user
5. Add password complexity requirements
6. Add session management
7. Add OAuth2 integration
8. Add multi-factor authentication
