<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-17 -->

# TiltCheck Web Sitemap — v1 + MVP

Canonical production host: **https://tiltcheck.me**

This document maps user-facing pages across **v1** (`TiltCheck-ME/tiltcheck-monorepo`, production today) and **MVP** (`jmenichole/tiltcheckmvp`, cutover target). Machine-readable sitemaps:

| Stack | Human (styled) | Machine (crawlers) | Source |
|-------|----------------|-------------------|--------|
| v1 | `https://tiltcheck.me/site-map` | `https://tiltcheck.me/sitemap.xml` (+ XSL in Firefox) | `apps/web/src/app/site-map/`, `sitemap.xml/route.ts`, `public/sitemap.xsl` |
| MVP | same | same | [apply guide](./migration/tiltcheckmvp-web-seo/README.md) |

**Chrome note:** Chrome does not render XSL. Use `/site-map` for a styled index; `/sitemap.xml` remains for bots.

---

## Domain map

| Host | v1 app | MVP app | Notes |
|------|--------|---------|-------|
| `tiltcheck.me` | `apps/web` | `apps/web` | Primary HTML surface |
| `dashboard.tiltcheck.me` | `apps/user-dashboard` | **301 → `/dashboard`** (planned) | v1: separate Express dashboard |
| `api.tiltcheck.me` | `apps/api` | `apps/api` (Hono) | API only — not in sitemap |
| `hub.tiltcheck.me` | 308 → dashboard | N/A | Legacy redirect |
| `docs.tiltcheck.me` | 308 → `/docs/*` | N/A | Docs subdomain alias |
| `control.tiltcheck.me` | rewrite → `/admin/*` | TBD | Control room |
| `arena.tiltcheck.me` | rewrite → `/arena/*` | Not in MVP | Game arena |

---

## v1 — `tiltcheck.me` (`apps/web`)

### Core & product

| Path | Index | Purpose |
|------|-------|---------|
| `/` | Yes | Landing |
| `/extension` | Yes | Chrome extension |
| `/login` | No | Discord / magic login |
| `/onboarding` | No | In-web onboarding quiz |
| `/getting-started` | Yes | Quick start |
| `/how-it-works` | Yes | Product flow + FAQ |
| `/about` | Yes | Mission / principles |
| `/dashboard` | Handoff | Redirects to `dashboard.tiltcheck.me` |

### Trust & intel

| Path | Index | Purpose |
|------|-------|---------|
| `/casinos` | Yes | Casino directory |
| `/casinos/[slug]` | Yes | ~116 casino proof pages |
| `/bonuses` | Yes | Daily bonus feed |
| `/ask` | Yes | Intel chat Q&A |
| `/ask/v/[token]` | No | Shared intel snapshot |
| `/intel/rtp` | Yes | RTP reference |
| `/intel/scanner` | Yes | Bonus scanner |
| `/intel/scams` | Yes | Scam blacklist |

### Tools

| Path | Index | Purpose |
|------|-------|---------|
| `/tools` | Yes | Tools index |
| `/tools/auto-vault` | Yes | AutoVault explainer |
| `/tools/auto-vault/android` | Yes | Android install |
| `/tools/auto-vault/share` | Yes | Share helper |
| `/tools/buddy-system` | Yes | Buddy accountability |
| `/tools/collectclock` | Yes | CollectClock audit |
| `/tools/degens-arena` | Yes | Degen Arena |
| `/tools/domain-verifier` | Yes | Domain checker |
| `/tools/geo-laws` | Yes | Geo law reference |
| `/tools/house-edge-scanner` | Yes | House edge |
| `/tools/justthetip` | Yes | JustTheTip |
| `/tools/scan-scams` | Yes | Scam scanner |
| `/tools/session-stats` | Yes | Session stats |
| `/tools/session-wager` | Yes | Session wager (beta) |
| `/tools/tarot-flip-comparison` | Yes | Tarot Flip compare |
| `/tools/verify` | Yes | Fairness verifier |

### Casino setup

| Path | Index | Purpose |
|------|-------|---------|
| `/stake` | Yes | Stake.us AutoVault guide |
| `/nuts` | Yes | nuts.gg AutoVault guide |

### Operators (B2B)

| Path | Index | Purpose |
|------|-------|---------|
| `/operators` | Yes | Operator landing |
| `/operators/keys` | Yes | API keys |
| `/operators/pricing` | Yes | Pricing |
| `/operators/verify` | Yes | Verification |

### Community & docs

| Path | Index | Purpose |
|------|-------|---------|
| `/blog` | Yes | Intel feed |
| `/blog/[slug]` | Yes | Blog posts (API-backed) |
| `/docs` | Yes | Docs index |
| `/docs/[...slug]` | Yes | Monorepo markdown docs |
| `/collab` | Yes | Partners / press |
| `/beta-tester` | Yes | Beta signup |
| `/microgrant` | Yes | Recovery microgrant |
| `/pay/jackpot` | No | Trivia treasury funding |

### Legal & RG

| Path | Index | Purpose |
|------|-------|---------|
| `/legal` | Yes | Legal hub |
| `/legal/limit` | Yes | Risk limits |
| `/terms` | Yes | ToS |
| `/privacy` | Yes | Privacy |
| `/touch-grass` | Yes | RG / crisis resources |
| `/site-map` | Yes | Styled human-readable sitemap index |

### Proxied (not Next pages — excluded from sitemap)

| Path | Backend |
|------|---------|
| `/arena/*` | `arena.tiltcheck.me` |
| `/admin/*` | Control room |
| `/api/*` | API gateway |

### Static (`public/`)

| Path | Purpose |
|------|---------|
| `/userscripts/install.html` | AutoVault one-link install |
| `/userscripts/android-install.html` | Android install |
| `/llms.txt` | LLM crawler summary |

---

## v1 — `dashboard.tiltcheck.me` (`apps/user-dashboard`)

Separate app — **not** in `apps/web` sitemap. `robots`: disallow all or noindex recommended.

| Path | Auth | Purpose |
|------|------|---------|
| `/` | Yes | Dashboard shell |
| `/dashboard` | Yes | Profile, vault, safety, buddies, bonuses, agent |
| `/onboarding` | Yes | Onboarding wizard |
| `/onboard.html` | Yes | Static onboarding |
| `/premium` | Yes | Premium / crypto claim |
| `/safety-resume` | Yes | Proof of Responsible Play |
| `/preview` | Redirect | → Discord auth → dashboard |

---

## MVP — `tiltcheck.me` (`tiltcheckmvp/apps/web`)

Dashboard and settings live **on the same host** (no `dashboard.tiltcheck.me` post-cutover).

### Public (in sitemap)

| Path | Priority | Purpose |
|------|----------|---------|
| `/` | 1.0 | Landing / command center |
| `/extension` | 0.9 | Extension install guide |
| `/casinos` | 0.9 | Trust directory |
| `/casinos/[slug]` | 0.8 | Casino detail (from `@tiltcheck/trust` CASINOS) |
| `/bonuses` | 0.9 | Daily bonus feed |
| `/stake` | 0.7 | Stake AutoVault setup |
| `/nuts` | 0.7 | nuts AutoVault setup |
| `/touch-grass` | 0.4 | Break / lockout hub |
| `/terms` | 0.3 | ToS |
| `/privacy` | 0.3 | Privacy |
| `/site-map` | 0.5 | Styled sitemap index |

### Auth-gated (excluded from sitemap; disallowed in robots)

| Path | Purpose |
|------|---------|
| `/login` | Discord OAuth |
| `/dashboard` | Vault, session cap, Touch Grass, onboarding |
| `/settings` | Tilt sensitivity, game exclusions |

### Noindex by layout (excluded from sitemap)

| Path | Purpose |
|------|---------|
| `/tools/domain-verifier` | Domain checker (`robots: noindex` in tools layout) |
| `/tools/scan-scams` | Scam search |

### Redirects

| Path | Destination |
|------|-------------|
| `/legal` | `/terms` |

---

## v1 vs MVP route parity

| Category | v1 | MVP |
|----------|----|-----|
| Page count | ~51 static + dynamic docs/casinos/blog | 16 routes |
| Dashboard | `dashboard.tiltcheck.me` | `/dashboard` on same host |
| Settings | Dashboard tabs | `/settings` |
| Intel / Ask | `/ask`, `/intel/*` | Not yet |
| Tools | 15+ pages | 2 (noindex) |
| Docs / blog | Yes | Not yet |
| Operators B2B | Yes | Not yet |
| `sitemap.xml` | Yes | Yes (post this doc) |
| `robots.txt` | Yes | Yes (post this doc) |

### MVP gaps (v1 routes with no MVP equivalent yet)

`/ask`, `/intel/*`, most `/tools/*`, `/docs`, `/blog`, `/about`, `/how-it-works`, `/getting-started`, `/operators/*`, `/collab`, `/beta-tester`, `/microgrant`, `/onboarding`, `/arena/*`, `/admin/*`

---

## Cutover checklist (DNS / redirects)

Per `tiltcheckmvp/docs/manual-tasks.md`:

1. `dashboard.tiltcheck.me` → **301** `https://tiltcheck.me/dashboard`
2. `hub.tiltcheck.me` → **301** `https://tiltcheck.me/dashboard`
3. Update v1 `sitemap.ts` handoff URLs when dashboard consolidates

---

## Maintenance

- **v1:** Update `apps/web/src/app/sitemap.ts` `PAGES` when adding App Router pages.
- **MVP:** Update `apps/web/src/app/sitemap.ts` `PAGES` when adding public routes.
- **This doc:** Update both tables when routes ship or cutover changes host mapping.

**Made for Degens. By Degens.**
