<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-18 -->

# Daily Promo Gather Agent — Design Spec

Status: Approved (design)  
Owner: founder (solo)  
Surface: `tiltcheck.me/bonuses` (primary); API `GET /bonuses/daily-feed`  
Related: CollectClock bonus feed, email inbox bonus intel, channel-watcher Discord drops, operator-facts promote pattern, MVP patch `docs/migration/tiltcheckmvp-patches/daily-bonus-feed/`

## Problem

Users want a trustworthy list of **free spins and other daily promotions** at relevant casinos. Today `/bonuses` merges CollectClock + email inbox, but there is no dedicated gatherer for rotating free-spin / daily promo inventory, no proposal lane for public-page finds, and no unified daily-feed contract on main.

## Goals

- Hybrid gather: **email inbox + Discord drops + public promo pages** (+ CollectClock as merge source)
- Priority **Sweeps** operators from `docs/ops/operator-facts-priority.json` (v1)
- Auto-publish from trusted sources (email + Discord); public-page scrapes → proposals until promote
- Primary UI: **`/bonuses`** showing free spins and daily promos with filters
- Canonical API: **`GET /bonuses/daily-feed`**
- No invented offers — omit when unknown; label source + freshness

## Non-goals (v1)

- Auto-promote public-page scrapes
- Full `casinos.json` coverage
- Crypto operators in v1 feed (priority JSON includes crypto; **v1 allowlist = Sweeps category only**)
- Discord or extension as primary UI (may consume the same API later)
- Login-walled or authenticated casino scrapes
- Replacing CollectClock timers / claim UX
- Operator-facts welcome-bonus store (different job: cited durable facts, not daily inventory)

## Decisions (locked)

| Topic | Choice |
|-------|--------|
| Primary surface | `tiltcheck.me/bonuses` |
| Gather mode | Hybrid: email + public pages + Discord |
| Casino scope | Priority list Sweeps only (~19 from operator-facts-priority) |
| Publish gate | Auto-live: email + Discord; propose: public-page |
| Architecture | Extend existing bonus stack + live/proposals JSON + promote CLI |
| CollectClock | Remains a merge source in daily-feed aggregator |

## Allowlist (v1)

Derived from `docs/ops/operator-facts-priority.json` where `category === "Sweeps"`:

Chumba, Global Poker, LuckyLand Slots, Pulsz, WOW Vegas, High 5 Casino, Stake.us, McLuck, Fortune Coins, Hello Millions, Modo Casino, MyPrize US, Crown Coins Casino, Funrize, Zula Casino, Real Prize, Jackpota, NoLimitCoins, Rolla.

Tracked as `docs/ops/daily-promos-priority.json` (generated or hand-copied from that filter) so promo ops do not silently pick up crypto rows.

## Data stores

| Path | Visibility | Writers |
|------|------------|---------|
| `data/trust-engine/daily-promos.live.json` | Merged into `/bonuses` via daily-feed | Email + Discord auto-ingest; promote CLI |
| `data/trust-engine/daily-promos.proposals.json` | Ops only | Public-page gather agent |

### Entry schema

```ts
type PromoSource = 'email-inbox' | 'discord' | 'public-page' | 'collectclock';
type PromoBonusType = 'free_spins' | 'daily_login' | 'deposit_match' | 'code' | 'other';

interface DailyPromoRecord {
  id: string;              // stable hash or uuid
  brand: string;
  slug: string;            // casino slug aligned with trust/casinos
  bonus: string;           // human offer text
  bonusType: PromoBonusType;
  code: string | null;
  url: string;             // claim / promo URL
  source: PromoSource;
  verified: string;        // ISO date (discovery / last confirm)
  asOf: string;            // ISO datetime
  expiresAt: string | null;
  expiryMessage: string | null;
  imageUrl: string | null;
  status: 'live' | 'proposed' | 'rejected' | 'expired';
}
```

File wrappers:

```json
{
  "copyright": "© 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: YYYY-MM-DD",
  "updatedAt": "ISO",
  "promos": []
}
```

### Freshness rules

- Hide when `expiresAt` is in the past (status → `expired` or filtered out of feed)
- If no `expiresAt` and `verified` older than **7 days** without refresh → show **stale** badge; still list until 14 days, then drop from feed
- Dedupe key: `normalize(brand) + normalize(bonus) + normalize(url)` (same idea as existing BonusGrid merge)

## Promo Gather agent

### Responsibilities

1. **Ingest email** — read new email-bonus-feed entries; if brand/slug on Sweeps allowlist → upsert **live** with `source: email-inbox`
2. **Ingest Discord** — consume channel-watcher / bonus-drop payloads; allowlist → upsert **live** with `source: discord`
3. **Scrape public pages** — for each allowlist casino with a configured public promo URL, fetch HTML/JSON, extract candidate offers → upsert **proposals** with `source: public-page` (never auto-live)
4. **Normalize** — map free-spin language, codes, expiry strings into schema; refuse garbage / empty bonus text
5. **Report** — stdout or ops log: counts live/proposed/stale/skipped

### Configuration

- `docs/ops/daily-promos-priority.json` — allowlist + optional `promoUrl` per casino
- Env: reuse existing email/Discord paths; optional `DAILY_PROMOS_LIVE_PATH` / `DAILY_PROMOS_PROPOSALS_PATH` overrides
- Rate limits: polite delays between public-page fetches; no auth cookies; skip non-200 / challenge pages

### Promote CLI

`pnpm ops:promos:promote` (script under `scripts/ops/promote-daily-promos.mjs`):

- `list` — show proposals
- `accept <id>` — move proposal → live
- `reject <id>` — mark rejected
- Same human-gate spirit as `pnpm ops:facts:promote`

### Cursor agent doc

`.cursor/agents/` (or extend casino-public-data-scraper notes) — **Promo Gather** instructions: allowlist, propose vs live rules, never invent offers, atomic docs.

## API

### `GET /bonuses/daily-feed`

Land aggregator inspired by `docs/migration/tiltcheckmvp-patches/daily-bonus-feed/`:

**Merge order (deduped):** daily-promos.live → email inbox → CollectClock → local fallback  

**Query:** `usOnly` default true; optional `bonusType=free_spins`

**Response:** `{ updatedAt, total, data[], sources[] }` where each entry includes `sources[]`, `bonusType`, `expiresAt`, trust/category enrichment when available.

Existing `GET /bonuses` and `GET /bonuses/inbox` remain; daily-feed becomes the preferred consumer for the public page.

## UI (`/bonuses`)

- Hero: daily promo tracker framing (free spins + daily offers at priority sweeps)
- Filter chips: All · Free spins · Daily login · Codes · Other
- Cards: brand, offer, type, code (if any), source badge, verified/stale, CTA to claim URL; secondary link to `/casinos/[slug]` when known
- Empty state: honest — “No live promos yet for the priority set. CollectClock fallback may still show.”
- Footer: Made for Degens. By Degens.
- Do not imply affiliate endorsement; not financial advice

## Components / files (expected)

| Path | Role |
|------|------|
| `data/trust-engine/daily-promos.live.json` | Live promos |
| `data/trust-engine/daily-promos.proposals.json` | Proposed scrapes |
| `docs/ops/daily-promos-priority.json` | Sweeps allowlist + promo URLs |
| `docs/ops/DAILY-PROMOS.md` | Ops runbook |
| `scripts/ops/gather-daily-promos.mjs` | Gather agent entry |
| `scripts/ops/promote-daily-promos.mjs` | Promote CLI |
| `apps/api/src/lib/daily-bonus-feed.ts` | Aggregator |
| `apps/api/src/routes/bonuses.ts` | `GET /bonuses/daily-feed` |
| `apps/web/src/app/bonuses/page.tsx` | Consume daily-feed |
| `apps/web/src/components/DailyBonusFeed.tsx` (or BonusGrid evolution) | List UI |
| `.cursor/agents/` promo-gather notes | Agent instructions |
| `docs/bonuses.md` or `docs/api/bonuses.md` | Public/API docs (atomic) |

## Threat / risk notes

| Risk | Mitigation |
|------|------------|
| False or expired promo | TTL/stale rules; source badges; scrape propose-only |
| Scrape ToS / blocks | Public URLs only; rate limit; skip challenges; no credentials |
| Affiliate-looking UI | Blunt copy: tracker not endorsements |
| Secret leakage | No tokens in git; env for Discord/email only |
| Empty product | CollectClock fallback + empty state; coverage grows with ingest |

## Rollback

- Feature-flag or route `/bonuses` back to CollectClock+inbox-only merge
- Empty live JSON → feed ignores that leg
- Revert PR if aggregator regresses

## Success criteria

- [ ] Priority Sweeps allowlist file exists
- [ ] Live + proposals JSON stores exist (may start empty)
- [ ] Email/Discord allowlisted hits auto-upsert live
- [ ] Public-page finds land in proposals only
- [ ] `pnpm ops:promos:promote` accept/reject works
- [ ] `GET /bonuses/daily-feed` returns merged feed
- [ ] `/bonuses` shows free-spin filter and source badges
- [ ] Docs + copyright headers atomic with code

## Out of band (later)

- Expand allowlist to crypto / full catalog
- Discord digest consuming daily-feed
- Extension sidebar switch to daily-feed
- Auto-expiry sweeper cron on Railway/VPS
