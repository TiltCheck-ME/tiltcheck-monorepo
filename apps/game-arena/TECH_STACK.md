# Game Arena Tech Stack Recommendations

## Current vs Recommended Stack

### ✅ Keep (Already Good)
- **pnpm**: Fast, efficient package manager with workspace support
- **TypeScript**: Type safety and better DX
- **Vitest**: Fast, modern testing framework
- **Express**: Battle-tested, simple HTTP server
- **Socket.IO**: Best-in-class WebSocket library with fallbacks
- **Event Router**: Existing cross-service communication

### 🔄 Upgrade Recommendations

#### 1. Real-time Communication (CRITICAL for gameplay)
**Current**: Socket.IO (good)
**Recommendation**: Keep Socket.IO BUT add:
- **Redis adapter** for Socket.IO to enable:
  - Horizontal scaling across multiple instances
  - Persistent pub/sub for cross-instance events
  - Better integration with event-router
  
**Benefit**: Players on different server instances can play together

```typescript
// Upgrade from in-memory to Redis adapter
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();
io.adapter(createAdapter(pubClient, subClient));
```

#### 2. Session Management (CRITICAL for auth)
**Current**: express-session with memory store
**Recommendation**: 
- **@tiltcheck/database** (Supabase) for session storage
- OR **connect-redis** for Redis sessions
- OR **@supabase/auth-helpers** for Supabase Auth

**Benefit**: Sessions persist across restarts, enable multi-instance deployment

```typescript
// Option 1: Supabase (already in monorepo)
import { SupabaseStore } from '@tiltcheck/database';
app.use(session({
  store: new SupabaseStore({ /* config */ }),
  // ...
}));

// Option 2: Redis (if adding Redis anyway)
import RedisStore from 'connect-redis';
app.use(session({
  store: new RedisStore({ client: redisClient }),
  // ...
}));
```

#### 3. Authentication (SECURITY + UX)
**Current**: passport-discord (deprecated warning in old repo)
**Recommendation**: 
- **Supabase Auth with Discord provider** (unified with TiltCheck ecosystem)
- OR **arctic** (modern, lightweight OAuth library)

**Benefit**: 
- No deprecated dependencies
- Unified user management across TiltCheck
- Built-in JWT handling

```typescript
// Supabase Auth (recommended)
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Sign in with Discord
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'discord',
});
```

#### 4. State Management (PERFORMANCE)
**Current**: In-memory Maps
**Recommendation**: Add **ioredis** for game state with TTL

**Benefit**:
- Games auto-cleanup after timeout
- Shared state across instances
- Fast lookups with indexing

```typescript
import Redis from 'ioredis';

class GameStateManager {
  private redis = new Redis(process.env.REDIS_URL);
  
  async saveGameState(gameId: string, state: GameState) {
    await this.redis.setex(
      `game:${gameId}`,
      3600, // 1 hour TTL
      JSON.stringify(state)
    );
  }
}
```

#### 5. Frontend Framework (DEVELOPER EXPERIENCE)
**Current**: Vanilla JS + manual DOM manipulation
**Recommendation**: 
- **Svelte** (lightest, fastest, perfect for real-time UIs)
- OR **Preact** (React-like but 3KB)
- OR keep Vanilla but use **lit-html** for templating

**Benefit**: 
- Reactive UI updates from WebSocket events
- Less boilerplate code
- Better maintainability

```typescript
// Svelte example (recommended for new features)
<script lang="ts">
  import { onMount } from 'svelte';
  import { io } from 'socket.io-client';
  
  let games = [];
  const socket = io();
  
  onMount(() => {
    socket.on('lobby-update', (data) => {
      games = data.games; // Auto re-renders
    });
  });
</script>

{#each games as game}
  <GameCard {game} />
{/each}
```

#### 6. Build System (PERFORMANCE)
**Current**: tsc (TypeScript compiler)
**Recommendation**: 
- **esbuild** for bundling (100x faster than webpack)
- **tsx** for dev mode (already using it)

**Benefit**:
- Near-instant builds
- Tree-shaking for smaller bundles
- Built-in minification

```json
{
  "scripts": {
    "build": "esbuild src/server.ts --bundle --platform=node --outfile=dist/server.js --external:express --external:socket.io",
    "build:client": "esbuild public/scripts/**/*.ts --bundle --outdir=public/dist --minify"
  }
}
```

#### 7. Leaderboard/Stats Storage (DATA)
**Current**: Not implemented
**Recommendation**: 
- **@tiltcheck/database** (Supabase) with optimized indexes
- **Supabase Realtime** for live leaderboard updates

**Benefit**:
- Real-time leaderboard without polling
- Efficient queries with indexes
- Already integrated in monorepo

```typescript
// Subscribe to leaderboard changes
const leaderboard = supabase
  .channel('leaderboard')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'user_stats' },
    (payload) => {
      updateLeaderboard(payload.new);
    }
  )
  .subscribe();
```

#### 8. API Layer (DEVELOPER EXPERIENCE)
**Current**: Express routes
**Recommendation**: 
- **tRPC** for type-safe API calls
- OR **Hono** (faster than Express, Edge-compatible)

**Benefit**:
- End-to-end type safety
- Auto-complete in frontend
- No manual API documentation

```typescript
// tRPC example
const appRouter = router({
  games: {
    list: publicProcedure.query(async () => {
      return await gameManager.getActiveGames();
    }),
    create: protectedProcedure
      .input(z.object({ gameType: z.string() }))
      .mutation(async ({ input }) => {
        return await gameManager.createGame(input);
      }),
  },
});
```

#### 9. Deployment (SCALABILITY)
**Current**: Various options (Railway, Render, Vercel)
**Recommendation**: 
- **Railway** for main deployment (best free tier, WebSocket support)
- **Cloudflare Workers** for static assets + edge caching
- **Supabase Edge Functions** for serverless game logic

**Benefit**:
- Global CDN for assets
- Auto-scaling
- Pay only for what you use

#### 10. Monitoring (OBSERVABILITY)
**Current**: None
**Recommendation**: 
- **Sentry** for error tracking (free tier)
- **Grafana Cloud** for metrics (free tier)
- OR **Axiom** for logs (generous free tier)

**Benefit**:
- Catch bugs in production
- Monitor performance
- Track user behavior

```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Express({ app }),
  ],
  tracesSampleRate: 0.1,
});
```

## Recommended Implementation Plan

### Phase 1: Core Functionality (MVP)
1. ✅ Express + Socket.IO (keep simple)
2. ✅ Passport Discord auth (use existing, migrate later)
3. ✅ In-memory game state (optimize later)
4. ✅ Vanilla JS frontend (fastest to ship)
5. ✅ Event-router integration

### Phase 2: Production Ready
1. Add Redis for sessions + game state
2. Add Supabase for user stats + leaderboards
3. Implement proper error handling + Sentry
4. Add esbuild for faster builds

### Phase 3: Scale & Optimize
1. Migrate to Supabase Auth
2. Add Svelte for complex UI components
3. Implement Redis adapter for Socket.IO
4. Add monitoring + analytics

## Quick Wins (Implement Now)

### 1. Environment-based Config
```typescript
// src/config.ts
export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  discord: {
    clientId: process.env.DISCORD_CLIENT_ID!,
    clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    callbackUrl: process.env.DISCORD_CALLBACK_URL!,
  },
  session: {
    secret: process.env.SESSION_SECRET || 'dev-secret',
  },
  redis: {
    url: process.env.REDIS_URL,
  },
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
  },
};
```

### 2. Graceful Shutdown
```typescript
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing gracefully');
  await io.close();
  await redisClient?.quit();
  process.exit(0);
});
```

### 3. Health Check Endpoint
```typescript
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now(),
  });
});
```

### 4. Rate Limiting
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

## Database Schema for User Stats

```sql
-- User stats table (Supabase)
CREATE TABLE user_stats (
  discord_id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  avatar TEXT,
  
  -- Global stats
  total_games INTEGER DEFAULT 0,
  total_wins INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  
  -- DA&D stats
  dad_games INTEGER DEFAULT 0,
  dad_wins INTEGER DEFAULT 0,
  dad_score INTEGER DEFAULT 0,
  
  -- Poker stats
  poker_games INTEGER DEFAULT 0,
  poker_wins INTEGER DEFAULT 0,
  poker_chips_won INTEGER DEFAULT 0,
  
  -- Metadata
  last_played_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for leaderboards
CREATE INDEX idx_total_score ON user_stats(total_score DESC);
CREATE INDEX idx_dad_score ON user_stats(dad_score DESC);
CREATE INDEX idx_poker_chips ON user_stats(poker_chips_won DESC);

-- Game history table
CREATE TABLE game_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id TEXT NOT NULL,
  game_type TEXT NOT NULL, -- 'dad' or 'poker'
  platform TEXT NOT NULL, -- 'web' or 'discord'
  channel_id TEXT, -- for Discord games
  
  winner_id TEXT REFERENCES user_stats(discord_id),
  player_ids TEXT[] NOT NULL,
  
  duration INTEGER, -- seconds
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_game_history_winner ON game_history(winner_id);
CREATE INDEX idx_game_history_type ON game_history(game_type);
```

## Conclusion

**For MVP (this PR)**: Keep it simple with existing tech, add Redis for state if needed.

**For Production**: Gradually adopt Supabase Auth, Redis, and monitoring.

**For Scale**: Add proper caching, CDN, and consider edge deployment.
