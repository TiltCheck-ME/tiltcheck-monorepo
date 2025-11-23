# Supabase Integration Summary

## What Was Added

Complete Supabase database integration for persistent user stats, game history, and leaderboards.

### Database Package (`@tiltcheck/database`)

**Updated:** `packages/database/src/index.ts`
- Full Supabase client implementation
- User stats management (get, create, update)
- Leaderboard queries (global, DA&D, Poker)
- Game history recording and retrieval
- Health check with connection status

**Added:** `packages/database/schema.sql` (5.2KB)
- `user_stats` table - Cumulative stats per Discord user
- `game_history` table - Individual game records
- Indexes for performance (leaderboards, player searches)
- Row Level Security policies
- Leaderboard views (global, DA&D, Poker)
- Triggers for auto-updating timestamps

### Stats Service (`services/game-arena`)

**Added:** `src/stats-service.ts` (4.5KB)
- Event-driven stats tracking
- Subscribes to `game.completed` events from event-router
- Automatically creates/updates user stats
- Records games in history
- No manual tracking needed

**Updated:** `src/server.ts`
- Initialize stats service on startup
- Added API endpoints:
  - `GET /api/stats/:discordId` - Get user stats
  - `GET /api/leaderboard?type=dad|poker&limit=100` - Get leaderboard
  - `GET /api/history/:discordId?limit=50` - Get game history

## Database Schema

### user_stats Table

Tracks cumulative statistics for each Discord user across all platforms (web + Discord bot).

**Columns:**
- `discord_id` (PK) - Discord user ID
- `username` - Current Discord username
- `avatar` - Discord avatar URL
- `total_games`, `total_wins`, `total_score` - Global stats
- `dad_games`, `dad_wins`, `dad_score` - DA&D stats
- `poker_games`, `poker_wins`, `poker_chips_won` - Poker stats
- `last_played_at`, `created_at`, `updated_at` - Timestamps

**Indexes:**
- `idx_user_stats_total_score` - Global leaderboard
- `idx_user_stats_dad_score` - DA&D leaderboard
- `idx_user_stats_poker_chips` - Poker leaderboard

### game_history Table

Records individual completed games for history and analytics.

**Columns:**
- `id` (PK, UUID) - Unique game history ID
- `game_id` - Game instance ID
- `game_type` - 'dad' or 'poker'
- `platform` - 'web' or 'discord'
- `channel_id` - Discord channel (if applicable)
- `winner_id` - Discord ID of winner
- `player_ids` - Array of all player Discord IDs
- `duration` - Game duration in seconds
- `completed_at` - Completion timestamp

**Indexes:**
- `idx_game_history_winner` - Winner lookups
- `idx_game_history_type` - Game type filtering
- `idx_game_history_players` - GIN index for player searches

### Leaderboard Views

Pre-computed views for efficient queries:

- `leaderboard_global` - Top 100 by total score
- `leaderboard_dad` - Top 100 DA&D players
- `leaderboard_poker` - Top 100 Poker players

All include: discord_id, username, avatar, games, wins, score/chips, win rate %.

## How It Works

### Automatic Stats Tracking

1. Game completes (DA&D or Poker)
2. Game module emits `game.completed` event to event-router
3. Stats service receives event
4. Stats service:
   - Checks if users exist, creates if needed
   - Updates stats for all players
   - Records game in history
   - Calculates scores/chips from game data

### Cross-Platform

Both web arena and Discord bot:
- Use same game modules
- Emit same events
- Track to same Discord user ID
- Stats combine automatically

### Row Level Security

- **Read**: Public access (for leaderboards)
- **Write**: Service role only (backend enforces data integrity)

## Setup Instructions

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Wait for provisioning (~2 minutes)

### 2. Run Database Schema

1. Supabase Dashboard → SQL Editor
2. Copy `packages/database/schema.sql` contents
3. Run SQL
4. Verify tables created in Table Editor

### 3. Get Credentials

Supabase Dashboard → Settings → API:
- **Project URL**: `https://xxxxx.supabase.co`
- **Anon/Public Key**: `eyJhbGc...`

### 4. Configure Environment

Add to `.env`:
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
```

### 5. Verify

```bash
# Start game-arena
pnpm --filter @tiltcheck/game-arena dev

# Check health
curl http://localhost:3010/health
# Should show: { "database": { "connected": true, "ok": true } }
```

## API Usage

### Get User Stats

```bash
curl http://localhost:3010/api/stats/DISCORD_USER_ID
```

Response:
```json
{
  "discord_id": "123456789",
  "username": "Player#1234",
  "total_games": 42,
  "total_wins": 15,
  "total_score": 156,
  "dad_games": 30,
  "dad_wins": 12,
  "dad_score": 156,
  "poker_games": 12,
  "poker_wins": 3,
  "poker_chips_won": 450,
  "last_played_at": "2025-11-23T15:30:00Z"
}
```

### Get Leaderboard

```bash
# Global leaderboard
curl http://localhost:3010/api/leaderboard

# DA&D leaderboard
curl http://localhost:3010/api/leaderboard?type=dad&limit=50

# Poker leaderboard  
curl http://localhost:3010/api/leaderboard?type=poker
```

### Get Game History

```bash
curl http://localhost:3010/api/history/DISCORD_USER_ID?limit=25
```

## Migration Notes

**From In-Memory:**
- Previous stats not migrated
- Users start with fresh stats
- Set env vars and restart - automatic from there

**Scaling:**
- Free tier: 500MB database
- Paid tier: Unlimited database
- Connection pooling via Supabase
- Auto-scaling

## Dependencies Added

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0"
  }
}
```

## Files Changed

- `packages/database/package.json` - Added Supabase dependency
- `packages/database/src/index.ts` - Implemented Supabase client (100+ lines)
- `packages/database/schema.sql` - Complete database schema (150+ lines)
- `packages/database/README.md` - Updated documentation
- `services/game-arena/src/stats-service.ts` - New stats service (160+ lines)
- `services/game-arena/src/server.ts` - Added stats service + API endpoints
- `services/game-arena/README.md` - Added Supabase setup docs

## Commits

1. `d9f14d8` - Add implementation summary documentation
2. `f93ab07` - Add Supabase database integration with stats tracking

## Status

🎮 **FULLY INTEGRATED** - Supabase database ready for production deployment with automatic stats tracking across all platforms.

## Next Steps

Optional enhancements:
- [ ] Supabase Realtime subscriptions for live leaderboard updates
- [ ] Time-based leaderboards (daily, weekly, monthly)
- [ ] Achievement system
- [ ] Detailed game analytics
- [ ] Player comparison endpoints
- [ ] Admin tools for stat corrections
