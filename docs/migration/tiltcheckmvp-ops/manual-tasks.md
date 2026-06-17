# TiltCheck v2 — manual task list

Code in this repo is largely ready. These tasks are **your** steps for Supabase, Railway, Discord, DNS, and sign-off. Work top to bottom; do not cut over production DNS until **Phase 2 staging** is checked off.

---

## A. Accounts and access

- [x] GitHub: v2 repo pushed and connected to Railway (two services: web + api)
- [x] Supabase: create **staging** project (and **production** when ready)
- [x] Discord Developer Portal: app for OAuth (`DISCORD_CLIENT_ID` / `SECRET`)
- [ ] Railway: billing OK; custom domains available for staging/prod
- [ ] Chrome Web Store: access to publish extension update (when Phase 2 is ready)

---

## B. Supabase (staging first)

- [x] Open SQL editor (or Supabase CLI) for staging project
- [x] Run migration: `[supabase/migrations/20260527000000_initial.sql](../supabase/migrations/20260527000000_initial.sql)`
- [x] Copy **Project URL** → `SUPABASE_URL`
- [x] Copy **service role** key → `SUPABASE_SERVICE_ROLE_KEY` (API only; never in web or git)
- [ ] From repo root with `.env` filled:
  ```bash
  pnpm seed:casino-scores
  ```
- [ ] Confirm rows in `casino_scores` (or verify API returns `source` other than static-only)
- [ ] Repeat migration + seed for **production** Supabase when you are ready for prod (can wait until after staging sign-off)

---

## C. Railway — API service (staging)

- [x] New service from GitHub repo; use `[apps/api/railway.toml](../apps/api/railway.toml)` or commands in [deploy.md](./deploy.md)
- [ ] Set environment variables (confirm `WEB_URL` matches live web hostname):

  | Variable                    | Example (staging)                                                | Current (Railway)                                                       |
  | --------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------- |
  | `WEB_URL`                   | `https://staging.tiltcheck.me` (or `*.up.railway.app` until DNS) | *Set to your web service URL in Railway*                                |
  | `API_URL`                   | `https://api-staging.tiltcheck.me`                               | `https://tiltcheck-api-production.up.railway.app`                       |
  | `SESSION_SECRET`            | 32+ random characters                                            | *Verify set in Railway*                                                 |
  | `DISCORD_CLIENT_ID`         | From Discord app                                                 | *Verify set in Railway*                                                 |
  | `DISCORD_CLIENT_SECRET`     | From Discord app                                                 | *Verify set in Railway*                                                 |
  | `DISCORD_REDIRECT_URI_WEB`  | `https://api-staging.tiltcheck.me/auth/discord/callback`         | `https://tiltcheck-api-production.up.railway.app/auth/discord/callback` |
  | `SUPABASE_URL`              | Staging project                                                  | *Configured — casino-scores returns `source: supabase`*                 |
  | `SUPABASE_SERVICE_ROLE_KEY` | Staging service role                                             | *Configured — casino-scores returns `source: supabase`*                 |


- [x] Deploy; confirm `GET https://<api-host>/health` returns OK — **verified 2026-06-07**
- [x] Confirm `GET https://<api-host>/rgaas/casino-scores` returns casinos — **verified** (`source: supabase`, 100+ rows)

---

## D. Railway — Web service (staging)

- [x] Second service from same repo; use `[apps/web/railway.toml](../apps/web/railway.toml)`
- [x] Set environment variables:

  | Variable                     | Example (staging)                                            |
  | ---------------------------- | ------------------------------------------------------------ |
  | `NEXT_PUBLIC_WEB_URL`        | Same as `WEB_URL` above                                      |
  | `NEXT_PUBLIC_API_URL`        | Same as `API_URL` above                                      |
  | `NEXT_PUBLIC_SHOW_TOOLS_NAV` | `false`                                                      |
  | `BONUSES_UPSTREAM_URL`       | `https://api.tiltcheck.me/bonuses` (optional; v1 inbox feed) |


- [x] Deploy; open staging URL — home, `/casinos`, `/extension` load
- [x] Optional: `https://<web-host>/bonuses` shows picks (upstream or static fallback)

---

## E. Discord OAuth

- [x] Discord app → OAuth2 → Redirects — add:
  - `https://api-staging.tiltcheck.me/auth/discord/callback`
  - `https://api.tiltcheck.me/auth/discord/callback` (for prod later)
- [ ] Scopes: `identify` (and any others your v1 app used)
- [x] After deploy, test: `https://<web-host>/login` → Discord → lands on `/dashboard` with session cookie

---

## F. DNS — staging (optional but recommended)

- [ ] `staging.tiltcheck.me` → Railway **web** service
- [ ] `api-staging.tiltcheck.me` → Railway **api** service
- [ ] Update Railway env `WEB_URL`, `API_URL`, `NEXT_PUBLIC_`* to match custom hostnames
- [ ] Redeploy both services after URL changes

---

## G. Phase 1 smoke (staging)

- [ ] Home CTAs → `/extension` and `/casinos`
- [ ] Casino directory + at least one `/casinos/[slug]` page
- [ ] Extension page links to **existing** Chrome Web Store listing (legacy extension OK for Phase 1)
- [ ] Legal pages: `/privacy`, `/terms`, `/legal`
- [ ] Tools not in primary nav

---

## H. Phase 2 — extension staging build

**Staging API (verified 2026-06-07):** `https://tiltcheck-api-production.up.railway.app`  
**Design spec:** [2026-06-07-phase-2-protected-session-design.md](./superpowers/specs/2026-06-07-phase-2-protected-session-design.md)

**Vault API smoke (no auth — automated):**


| Check                       | Result                           |
| --------------------------- | -------------------------------- |
| `GET …/health`              | 200 OK                           |
| `GET …/rgaas/casino-scores` | 200, `source: supabase`          |
| `GET …/vault`               | 401 Unauthorized (expected)      |
| `POST …/vault`              | 401 Unauthorized (expected)      |
| `GET …/auth/discord/login`  | 302 → Discord (OAuth configured) |


**Vault authenticated test:** Discord login required — see spec §9.3 (dashboard save + Supabase row + extension sync).

- [ ] Build extension pointing at staging API (PowerShell):
  ```powershell
  $env:EXTENSION_API_URL = "https://tiltcheck-api-production.up.railway.app"
  $env:EXTENSION_WEB_URL = "https://tiltcheckmvp-production.up.railway.app"
  cd apps/extension
  node build.js
  ```
  If `pnpm build` fails with `EPERM` on `~\node_modules\bufferutil`, use `node build.js` — same script, no pnpm wrapper. (`pnpm` may try to self-install `9.15.0` and hit a locked global module.)
- [ ] Load unpacked `apps/extension/dist` in Chrome (Developer mode)
- [ ] Log in via extension Discord flow; confirm token in storage (`tc_demo: false`)
- [ ] On web dashboard: set **session cap** (Vault tab) — confirm `POST /vault` persists (refresh page, rule still there)

---

## I. Phase 2 — enforcement gate (required before prod DNS)

**Status:** API + vault routes live; **real-accounts sign-off pending**.

Use the full checklist (game blocks via **web Settings only**, staged tilt warnings, AutoVault on Stake/nuts):

→ **[2026-05-27-real-accounts-signoff.md](./superpowers/reports/2026-05-27-real-accounts-signoff.md)**

Minimum for Phase 2 gate (section C):

- [ ] Open a test casino site in Chrome with extension enabled
- [ ] Staged warnings (1–2 banners) then **Touch Grass** on sustained tilt
- [ ] Confirm betting UI blocked until timer ends
- [ ] Service worker console: `[TiltCheck] Enforcement fired`
- [ ] Game blocks: save on web → **Refresh rules** in extension → block fires on matching URL
- [ ] Run local or CI: `pnpm test:e2e` (green on `main`)

Full definition: [cutover-checklist.md](./cutover-checklist.md) → “Definition: enforcement fires”.

---

## J. Production Railway + Supabase

- [ ] Duplicate Railway services or promote staging → **production** env vars
- [ ] Production Supabase: run migration + `pnpm seed:casino-scores`
- [ ] Production Discord redirect: `https://api.tiltcheck.me/auth/discord/callback`
- [ ] Re-run Phase 1 + Phase 2 smoke on production hostnames (or accept staging sign-off if prod is clone)

---

## K. Production DNS cutover (only after H + I are green)

- [ ] `tiltcheck.me` → Railway **web**
- [ ] `api.tiltcheck.me` → Railway **api**
- [ ] `dashboard.tiltcheck.me` → **301** to `https://tiltcheck.me/dashboard`
- [ ] Publish Chrome Web Store update with `EXTENSION_API_URL=https://api.tiltcheck.me`
- [ ] Smoke prod: login, vault, one enforcement test on a throwaway session

---

## L. v1 parallel ops (do not forget)

- [ ] Email crawler on v1 monorepo: `CRAWLER_API_URL=https://api.tiltcheck.me` in `.env`
- [ ] Run crawler with limit if backlog: `pnpm crawl:emails -- --limit 100` (optional `--digest`)
- [ ] v2 `/bonuses` uses `BONUSES_UPSTREAM_URL` until v2 ingest exists
- [ ] After cutover stable: archive `tiltcheck-monorepo` on GitHub (read-only)
- [ ] Plan v2 `POST /rgaas/email-ingest` before moving crawler off v1

Details: [v1-ops.md](./v1-ops.md).

---

## M. Post-cutover (Phase 3+)

- [ ] Analytics tab + API
- [ ] Buddies (simplified)
- [ ] Dashboard bonuses tab (full list; public `/bonuses` already partial)
- [ ] Tools: session-stats → verify → house-edge
- [ ] Discord bot on Railway (`DISCORD_BOT_TOKEN`, `TILTCHECK_API_URL`)

Order: [phases.md](./phases.md).

---

## Quick reference


| What                   | Where                                                                                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Deploy env matrix      | [deploy.md](./deploy.md)                                                                                                               |
| Ship gates             | [phases.md](./phases.md)                                                                                                               |
| Phase 2 design spec    | [superpowers/specs/2026-06-07-phase-2-protected-session-design.md](./superpowers/specs/2026-06-07-phase-2-protected-session-design.md) |
| Enforcement definition | [cutover-checklist.md](./cutover-checklist.md)                                                                                         |
| Stack choices          | [tech-stack.md](./tech-stack.md)                                                                                                       |


### Staging Railway URLs (2026-06-07)


| Service    | URL                                                | Status                                                |
| ---------- | -------------------------------------------------- | ----------------------------------------------------- |
| API        | `https://tiltcheck-api-production.up.railway.app`  | Deployed; health + casino-scores + vault auth gate OK |
| Web        | `https://tiltcheckmvp-production.up.railway.app`   | Login + dashboard verified                            |
| Custom DNS | `staging.tiltcheck.me`, `api-staging.tiltcheck.me` | Optional; not required for Phase 2 gate               |


