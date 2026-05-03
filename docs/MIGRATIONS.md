<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-03 -->

# Migrations

## Supabase onboarding to canonical Postgres

The canonical onboarding store is now the `user_onboarding` table behind `apps/api` / `@tiltcheck/db`.
Discord bot onboarding no longer writes directly to Supabase.

### One-shot backfill

Run the migration from the repo root:

```bash
pnpm exec tsx scripts/migrate-onboarding-supabase-to-postgres.ts
```

### What it does

- Reads rows from Supabase `user_onboarding`
- Ensures a matching `users` row exists for each Discord ID
- Upserts into the canonical Postgres `user_onboarding` table keyed by `discord_id`
- Preserves `joined_at` when Supabase already has it

### Why it is idempotent

- The script uses `upsertOnboarding()` keyed on `discord_id`
- Re-running the script updates the same canonical row instead of creating duplicates
- Existing `users` rows are reused, not duplicated

### Required environment

These vars must exist in the root `.env`:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- Postgres env vars already used by `@tiltcheck/db`

### Verification

After the script runs:

1. Spot-check a Discord ID in Postgres `user_onboarding`
2. Call `GET /me/onboarding-status` for that user through the API
3. Confirm `completedSteps` and `completedAt` match the expected migrated state
