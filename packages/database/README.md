# TiltCheck Database Package

This package is now a **legacy compatibility layer**.

For new code, prefer **`@tiltcheck/db`** as the canonical database package. Keep `@tiltcheck/database` only for older Supabase-oriented consumers that have not been migrated yet.

Legacy Supabase integration for user stats, game history, and leaderboards across the TiltCheck ecosystem.

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

### Preferred for new work

```typescript
import { findUserByDiscordId, query } from '@tiltcheck/db';

const user = await findUserByDiscordId('discord_id');
const rows = await query('select * from users where discord_id = $1', ['discord_id']);
```

### Compatibility usage

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

## Migration stance

- `@tiltcheck/db` is the active path for new shared query helpers and active runtime consolidation.
- `@tiltcheck/database` remains in place so existing bots, dashboard code, and legacy modules do not break in one risky sweep.
- Absorption should happen as a staged migration, not a one-shot delete.

See `schema.sql` for complete database schema.
