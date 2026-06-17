<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-17 -->

# Launch Checklist — Operator Steps (M0 → M5)

Follow top to bottom. Do **not** skip M1 before M2 DNS. Full rationale: [launch-cutover-plan spec](./superpowers/specs/2026-06-17-launch-cutover-plan.md).

**North-star KPI:** Protected sessions/week — authed user, enabled `session_cap`, enforcement fired ≥1× in 7d. Track in [metrics-weekly.md](./metrics-weekly.md).

---

## How to use this doc

| Symbol | Meaning |
|--------|---------|
| `[ ]` | You do this manually |
| `[agent]` | Cloud agent or dev implements (see [execution plan](./superpowers/plans/2026-06-17-launch-cutover-execution.md)) |
| **BLOCKER** | Must be green before next milestone |

Detailed env vars and URLs: [manual-tasks.md](./manual-tasks.md).

---

## M0 — Freeze policy (do first)

**Goal:** Stop duplicate work; lock v1 to ops-only.

### Policy

- [ ] **Agree:** v1 monorepo = ops + crawler only; no new product features
- [ ] **Agree:** MVP repo = all forward product (bonuses, copilot, dashboard depth)
- [ ] **Agree:** No DNS cutover until M1 staging gate passes

### v1 production secrets (post-PR #591)

- [ ] Railway v1 API: `EMAIL_INGEST_SECRET` set (non-empty, not default)
- [ ] Railway v1 API: `INTERNAL_SERVICE_TOKEN` set
- [ ] Smoke: email ingest rejects requests without secret (401/403)

### Triage open v1 PRs

- [ ] **#596** — merge if you want sitemap + 404 on v1 before cutover (optional)
- [ ] **#590** — close or merge as short bridge; MVP owns bonuses long-term
- [ ] **#595** — merge doc-only (copilot spec fixes)

### Push MVP branches (403 blocker for cursor bot)

From a machine with write access to `jmenichole/tiltcheckmvp`:

```bash
git clone git@github.com:jmenichole/tiltcheckmvp.git
cd tiltcheckmvp
git fetch origin
git checkout cursor/daily-bonus-feed-port-ec58
git push -u origin cursor/daily-bonus-feed-port-ec58

git checkout cursor/web-sitemap-ec58
git push -u origin cursor/web-sitemap-ec58
```

- [ ] MVP branch `cursor/daily-bonus-feed-port-ec58` on remote
- [ ] MVP branch `cursor/web-sitemap-ec58` on remote
- [ ] Open PRs on MVP repo for each (or merge to `main` when ready)

**M0 exit:** Policy agreed, secrets set, MVP branches pushed, PRs triaged.

---

## M1 — Staging Phase 2 gate **BLOCKER**

**Goal:** Prove login → vault → enforcement on staging before any prod DNS move.

Reference: [cutover-checklist.md](./cutover-checklist.md) Phase 2, [manual-tasks.md § H–I](./manual-tasks.md).

### Infrastructure (mostly done — verify)

- [ ] Staging Supabase: migration applied, `pnpm seed:casino-scores` run
- [ ] Staging API health: `GET …/health` → 200
- [ ] Staging API scores: `GET …/rgaas/casino-scores` → `source: supabase`
- [ ] Staging web loads: home, `/casinos`, `/extension`, `/login`
- [ ] Discord OAuth redirect URIs include staging API callback

### Extension staging build

```powershell
$env:EXTENSION_API_URL = "https://tiltcheck-api-production.up.railway.app"
$env:EXTENSION_WEB_URL = "https://tiltcheckmvp-production.up.railway.app"
cd apps/extension
node build.js
```

- [ ] Load unpacked `apps/extension/dist` in Chrome
- [ ] Discord login via extension → `tc_demo: false`, token in storage

### Vault persistence

- [ ] Web `/dashboard` → Vault tab → save **session cap**
- [ ] Refresh page — rule still present (not `stub: true`)
- [ ] Extension **Refresh rules** — syncs vault from API

### Enforcement gate (required)

On a test casino with extension enabled:

- [ ] Tilt reaches **critical** (sustained fast-click or configured test)
- [ ] **Touch Grass** fullscreen overlay appears (`#tiltcheck-lockdown-root`)
- [ ] Betting/spin controls blocked until timer ends
- [ ] Overlay not dismissible early
- [ ] Service worker console: `[TiltCheck] Enforcement fired`

Full checklist: [real-accounts-signoff.md](./superpowers/reports/2026-05-27-real-accounts-signoff.md)

### CI

- [ ] MVP `main`: `pnpm test:e2e` green (or run locally and note commit SHA)

**M1 exit:** All Phase 2 items checked; sign-off date recorded in [metrics-weekly.md](./metrics-weekly.md).

---

## M2 — DNS cutover

**Prerequisite:** M1 complete.

### Production Supabase + Railway

- [ ] Production Supabase: run migration + `pnpm seed:casino-scores`
- [ ] Production Railway API env: `WEB_URL`, `API_URL`, Discord, Supabase, `SESSION_SECRET`
- [ ] Production Railway web env: `NEXT_PUBLIC_*`, `BONUSES_UPSTREAM_URL` (v1 API until M3)
- [ ] Discord prod redirect: `https://api.tiltcheck.me/auth/discord/callback`

### DNS

- [ ] `tiltcheck.me` → Railway **web** (MVP)
- [ ] `api.tiltcheck.me` → Railway **api** (MVP)
- [ ] `dashboard.tiltcheck.me` → **301** → `https://tiltcheck.me/dashboard`

### Chrome Web Store

- [ ] Extension update published with `EXTENSION_API_URL=https://api.tiltcheck.me`
- [ ] Store listing still points to same extension ID (no broken install links)

### Prod smoke (throwaway session)

- [ ] `/` and `/casinos` load
- [ ] Discord login → dashboard
- [ ] Save vault rule
- [ ] One enforcement test on test casino

### v1 parallel (during M2)

- [ ] Email crawler still on v1: `CRAWLER_API_URL=https://api.tiltcheck.me` (until M3)
- [ ] MVP `/bonuses` works via upstream or local feed

**M2 exit:** Prod DNS on MVP; core loop works on production hostnames.

**Rollback:** Revert DNS to v1 Railway; document incident in metrics weekly notes.

---

## M3 — Decommission v1

**Prerequisite:** M2 stable ≥1 week (recommended).

### Email ingest on MVP [agent]

- [ ] `POST /rgaas/email-ingest` live on MVP API with shared secret auth
- [ ] Crawler moved: `CRAWLER_API_URL` → MVP API host
- [ ] Run crawler with limit if backlog: `pnpm crawl:emails -- --limit 100`
- [ ] Remove `BONUSES_UPSTREAM_URL` proxy; bonuses read from MVP Supabase

### Archive v1

- [ ] Confirm no production traffic to v1 Railway web/api
- [ ] GitHub: archive `TiltCheck-ME/tiltcheck-monorepo` (read-only)
- [ ] Keep local clone for reference until M5

**M3 exit:** Single repo (`tiltcheckmvp`) owns prod stack + ingest.

---

## M4 — Phase 3 + Degen Copilot (post-cutover)

Ship in order per [phases.md](./phases.md):

### Dashboard depth [agent]

- [ ] Analytics tab + API endpoints
- [ ] Buddies (simplified social/accountability)
- [ ] Dashboard **Bonuses** tab (full inbox list)

### Degen Copilot [agent]

Spec: v1 monorepo `docs/superpowers/specs/2026-06-17-degen-copilot-design.md` (copy to MVP when implementing)

- [ ] API: `POST /copilot/chat`, `POST /copilot/confirm`, tool registry
- [ ] Web: `/dashboard/copilot`
- [ ] Extension: FAB chat bubble
- [ ] Discord: `/copilot` or DM flow

**M4 exit:** Phase 3 tabs live; copilot Phase 1 (configure) on at least one surface.

---

## M5 — Tools + Discord bot

- [ ] **session-stats** — web page + API module
- [ ] **verify** — domain/casino verifier
- [ ] **house-edge** — calculator/tool page
- [ ] Discord bot on Railway: `/vault status`, alert webhook
- [ ] Retire v1 `discord-bot` Railway service

**M5 exit:** v1 fully retired; MVP runs marketing, API, extension, crawler, Discord.

---

## Weekly rhythm (after M2)

Every Monday (or your chosen day):

1. Fill [metrics-weekly.md](./metrics-weekly.md)
2. Check protected sessions/week vs prior week
3. Note blockers in checklist margin or MVP issues

---

## Quick links

| Doc | Path |
|-----|------|
| Strategy spec | [superpowers/specs/2026-06-17-launch-cutover-plan.md](./superpowers/specs/2026-06-17-launch-cutover-plan.md) |
| Engineering tasks | [superpowers/plans/2026-06-17-launch-cutover-execution.md](./superpowers/plans/2026-06-17-launch-cutover-execution.md) |
| Manual ops | [manual-tasks.md](./manual-tasks.md) |
| Smoke definition | [cutover-checklist.md](./cutover-checklist.md) |
| v1 crawler ops | [v1-ops.md](./v1-ops.md) |
| Phase backlog | [phases.md](./phases.md) |

Made for Degens. By Degens.
