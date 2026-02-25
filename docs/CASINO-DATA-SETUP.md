# Casino Data Setup Guide

## 1. Database Schema

Ensure you have run the schema creation script for `casino_data` (see previous steps or `docs/migrations/002-seed-casino-data.sql`).

## 2. Seeding Data

Run the migration script `docs/migrations/002-seed-casino-data.sql` in your Supabase SQL Editor to populate the table with initial casino data (Stake, Rollbit, etc.).

## 3. Connecting Discord Bot

The Discord bot can access these tables using the Supabase client.

### Using @tiltcheck/database (Recommended)

If you are using the shared database package, add a method to `DatabaseClient`:

```typescript
// packages/database/src/index.ts

async getCasino(domain: string) {
  const { data, error } = await this.supabase
    .from('casino_data')
    .select('*')
    .eq('domain', domain)
    .single();
  
  if (error) return null;
  return data;
}
```

### Direct Connection

Or use the Supabase client directly in your bot handlers:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!, 
  process.env.SUPABASE_ANON_KEY!
);

const { data: casino } = await supabase
  .from('casino_data')
  .select('*')
  .eq('domain', 'stake.com')
  .single();
```