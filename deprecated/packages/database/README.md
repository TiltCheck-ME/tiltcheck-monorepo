# TiltCheck Database Package

Supabase integration for user stats, game history, and leaderboards across the TiltCheck ecosystem.

## Features

- **User Stats**: Cumulative statistics for each Discord user
- **Game History**: Individual game records for analytics
- **Leaderboards**: Global, DA&D, and Poker rankings
- **Cross-Platform**: Tracks stats from both web arena and Discord bot

## Quick Setup

1. Create Supabase project at [supabase.com](https://supabase.com)
2. Run `schema.sql` in SQL Editor
3. Get credentials from Settings → API
4. Set environment variables:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your_anon_key
   ```

## Usage

```typescript
import { db } from '@tiltcheck/database';

// Get stats
const stats = await db.getUserStats('discord_id');

// Update stats  
await db.updateUserStats('discord_id', 'dad', {
  won: true,
  score: 10
});

// Get leaderboard
const leaderboard = await db.getLeaderboard('dad', 100);
```

See `schema.sql` for complete database schema.
