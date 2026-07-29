<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-18 -->

# Daily Promos Ops Runbook

Hybrid gatherer for free spins / daily promotions on priority Sweeps casinos. Primary UI: `tiltcheck.me/bonuses`.

## Stores

| File | Role |
|------|------|
| `docs/ops/daily-promos-priority.json` | Sweeps allowlist + optional `promoUrl` |
| `data/trust-engine/daily-promos.live.json` | Auto + promoted live rows |
| `data/trust-engine/daily-promos.proposals.json` | Public-page scrape proposals |

## Commands

```bash
# Ingest email feed + Discord drops JSON → live (allowlist only)
pnpm ops:promos:gather

# Also fetch public promo URLs → proposals only (never auto-live)
pnpm ops:promos:gather -- --scrape

# Dry run
pnpm ops:promos:gather -- --dry-run

# Promote proposals
pnpm ops:promos:promote -- --list
pnpm ops:promos:promote -- --accept <id>
pnpm ops:promos:promote -- --reject <id>
```

## Trusted auto-live sources

1. `data/email-bonus-feed.json` (or `EMAIL_BONUS_FEED_PATH`)
2. `data/bonus-discord-drops.json` (or `DISCORD_BONUS_DROPS_PATH`) — shape: `{ "drops": [ { "brand", "bonus", "url", "code?" } ] }`

Brand must match a Sweeps allowlist name/slug or the row is skipped.

## Public-page scrapes

`--scrape` fetches each allowlist `promoUrl`. Only creates a proposal when the page title/body clearly mentions free spins / daily bonus language. No inventing.

## API

`GET /bonuses/daily-feed` merges live promos + email inbox + CollectClock (+ local `data/bonus-data.json` fallback).

## Rules

- Never auto-promote `public-page` sources
- Expired / >14d unverified rows drop from feed
- 7–14d unverified → stale badge
- Not affiliate endorsements — tracker only
