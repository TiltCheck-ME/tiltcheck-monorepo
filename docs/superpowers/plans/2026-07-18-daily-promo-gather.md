# Daily Promo Gather Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hybrid promo gatherer (email + Discord auto-live, public-page proposals) feeding `GET /bonuses/daily-feed` and `tiltcheck.me/bonuses` for priority Sweeps free spins / daily promos.

**Architecture:** JSON live/proposals stores under `data/trust-engine/`, ops gather + promote CLIs, API aggregator merging live promos + email inbox + CollectClock, web `/bonuses` consuming daily-feed with type filters.

**Tech Stack:** Node ESM scripts, Express API (`apps/api`), Next.js web (`apps/web`), vitest, existing email-bonus-feed + CollectClock URLs.

**Spec:** [docs/superpowers/specs/2026-07-18-daily-promo-gather-design.md](../specs/2026-07-18-daily-promo-gather-design.md)

## Global Constraints

- Copyright header: `© 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-18`
- No emojis; footer on user UI: `Made for Degens. By Degens.`
- Sweeps-only allowlist in v1; never auto-promote `public-page` sources
- No invented offers; omit when unknown
- Atomic docs with code (`docs/ops/DAILY-PROMOS.md`, API note)
- Avoid brand-law false “custodial” hits in source comments (do not phrase as holding user funds)

## File map

| Path | Responsibility |
|------|----------------|
| `docs/ops/daily-promos-priority.json` | Sweeps allowlist + optional promoUrl |
| `data/trust-engine/daily-promos.live.json` | Live promos |
| `data/trust-engine/daily-promos.proposals.json` | Proposed scrapes |
| `apps/api/src/lib/daily-promos-store.ts` | Load/save/normalize/dedupe/freshness |
| `apps/api/src/lib/daily-bonus-feed.ts` | Aggregator for daily-feed |
| `apps/api/src/routes/bonuses.ts` | `GET /bonuses/daily-feed` |
| `scripts/ops/gather-daily-promos.mjs` | Ingest email/discord → live; public-page → proposals |
| `scripts/ops/promote-daily-promos.mjs` | list/accept/reject |
| `apps/web/src/lib/daily-bonus-feed.ts` | Client types + fetch helper |
| `apps/web/src/components/DailyBonusFeed.tsx` | Filtered list UI |
| `apps/web/src/app/bonuses/page.tsx` | Wire daily-feed |
| `docs/ops/DAILY-PROMOS.md` | Ops runbook |
| `docs/api/bonuses.md` | API contract |
| `.cursor/agents/promo-gather.md` | Agent instructions |
| `package.json` | `ops:promos:gather`, `ops:promos:promote` |
| `tests/ops/daily-promos-store.test.ts` or api unit tests | Store + merge tests |

---

### Task 1: Priority list + empty stores + store helpers

**Files:**
- Create: `docs/ops/daily-promos-priority.json`
- Create: `data/trust-engine/daily-promos.live.json`
- Create: `data/trust-engine/daily-promos.proposals.json`
- Create: `apps/api/src/lib/daily-promos-store.ts`
- Create: `apps/api/src/lib/daily-promos-store.test.ts` (or under tests/)

**Interfaces:**
- Produces: `DailyPromoRecord`, `loadDailyPromosLive()`, `loadDailyPromosProposals()`, `upsertPromo()`, `isPromoStale()`, `isPromoExpired()`, `normalizePromoDedupeKey()`, `filterFeedPromos()`

- [x] Write store tests (expire/stale/dedupe/allowlist)
- [x] Implement store + empty JSON files + priority JSON (Sweeps only)
- [x] Commit

### Task 2: Gather + promote CLIs

**Files:**
- Create: `scripts/ops/gather-daily-promos.mjs`
- Create: `scripts/ops/promote-daily-promos.mjs`
- Modify: `package.json`
- Create: `docs/ops/DAILY-PROMOS.md`

- [x] Promote CLI mirror facts promote (list/accept/reject by id)
- [x] Gather: read email feed file if present + bonus-drops JSON if present → live; optional `--scrape` stub that writes proposals from priority `promoUrl` titles only when fetch succeeds with clear text (no invent)
- [x] Commit

### Task 3: API daily-feed

**Files:**
- Create: `apps/api/src/lib/daily-bonus-feed.ts`
- Modify: `apps/api/src/routes/bonuses.ts`
- Create: `docs/api/bonuses.md`
- Test: aggregator unit test

- [x] Merge live + inbox + CollectClock (+ local fallback)
- [x] Route `GET /bonuses/daily-feed`
- [x] Commit

### Task 4: Web `/bonuses` UI

**Files:**
- Create: `apps/web/src/lib/daily-bonus-feed.ts`
- Create: `apps/web/src/components/DailyBonusFeed.tsx`
- Modify: `apps/web/src/app/bonuses/page.tsx`
- Create: `.cursor/agents/promo-gather.md`

- [x] Fetch daily-feed with CollectClock+inbox fallback if API missing
- [x] Filters: All / Free spins / Daily / Codes / Other
- [x] Source + stale badges; footer degen line
- [x] Commit + push + update PR
