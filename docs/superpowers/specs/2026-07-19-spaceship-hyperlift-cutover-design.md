<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-19 -->

# Spaceship Hyperlift Cutover — Design Spec

Status: Approved (design conversation)  
Owner: founder (solo)  
Surface: `tiltcheck.me` + `api.tiltcheck.me` hosting  
Related: `docs/DEPLOY.md`, `docs/migration/exit-railway-plan.md`, `docs/history/HYPERLIFT*.md`, GitHub Pages twin, Daily Promo Gather (persistence deferred)

## Problem

Railway trial expired — `tiltcheck.me` has no live compute home. Domain is registered at Spaceship; DNS nameservers are Cloudflare. Historical Spaceship/Hyperlift docs target dead paths (`Dockerfile.unified`, `services/landing`). Need a phase-1 hosting design that restores apex + API without Discord, without Cloudflare Tunnel, and without locking out a later VPS move.

## Goals

- Host **web** and **api** on Spaceship Starlight Hyperlift
- Keep **Cloudflare nameservers**; point public hostnames at Hyperlift origins (no tunnel)
- Preserve path to documented VPS+compose exit later (same hostnames)
- Replace stale Hyperlift history with a current cutover runbook
- Park Railway as dead production target

## Non-goals (phase 1)

- Discord bots (`discord-bot`, `justthetip-bot`, `dad-bot`)
- Cloudflare Tunnel / `cloudflared`
- Durable Gmail / daily-promo persistence (Supabase or volumes) — accepted later
- Dashboard, activity, arena, control-room, trust-rollup on Hyperlift
- Rebuilding a unified all-in-one container
- Changing registrar or moving off Cloudflare NS
- Frequent GitHub Actions deploy cron (prefer Hyperlift GitHub→build)

## Decisions (locked)

| Topic | Choice |
|-------|--------|
| Phase-1 surfaces | `apps/web` + `apps/api` only |
| Discord | Optional / not deployed |
| Edge | Cloudflare DNS → Hyperlift origins (no tunnel) |
| Promo/email durability | Deferred — ship host first |
| Long-term | Keep Hyperlift-forever and VPS-later both open |
| API hostname | `api.tiltcheck.me` (separate Hyperlift app) |
| Packaging | Dual Hyperlift apps (not unified image, not Pages-as-apex) |

## Architecture

```
Spaceship (registrar)
        │
        ▼
Cloudflare NS / DNS / optional orange-cloud proxy
        │
        ├─ tiltcheck.me, www  →  Hyperlift app "web"
        │                         Dockerfile: apps/web/Dockerfile
        │                         (monorepo root build context)
        │
        └─ api.tiltcheck.me   →  Hyperlift app "api"
                                  Dockerfile: apps/api/Dockerfile
                                  (monorepo root build context)

Web → API: NEXT_PUBLIC_API_URL=https://api.tiltcheck.me
```

Unchanged / parallel:

- GitHub Pages twin (shareable static) — not apex production
- `apps/hub` Cloudflare Worker — independent
- VPS compose plan — alternate path; same public hostnames later

## What must change

### Repo / docs

| Item | Action |
|------|--------|
| `docs/migration/spaceship-hyperlift-cutover.md` | **Create** — phase-1 runbook (apps, env, DNS, smoke, rollback) |
| `docs/DEPLOY.md` | **Update** — Hyperlift dual-app as current production target; Railway dead; VPS optional later |
| `AGENTS.md` deployment table | **Update** — match DEPLOY.md reality |
| `docs/history/HYPERLIFT*.md`, `SPACESHIP-DEPLOYMENT-ENV.md` | **Mark obsolete** — point to new cutover doc; do not delete yet |
| `.github/workflows/deploy-railway.yml` | **Disable or park** — stop pretending Railway hosts prod |
| `docs/migration/exit-railway-plan.md` | **Note** — still valid as path B; phase-1 home is Hyperlift |

### Runtime / config (small, only if needed)

| Item | Action |
|------|--------|
| API `PORT` / bind | Already uses `resolveApiPort` + `0.0.0.0` (prod default 8080) — verify on Hyperlift |
| Web `PORT` | Image defaults `3000`; set Hyperlift `PORT=8080` (or whatever Hyperlift injects) |
| Web `NEXT_PUBLIC_*` | Must be present at **image build** time (`NEXT_PUBLIC_API_URL`, site URL) |
| API secrets | Minimum: `JWT_SECRET`, Discord OAuth vars if login routes stay enabled; `SKIP_ENV_VALIDATION` only for broken-dev, not as silent prod default |

### Cloudflare (ops, not code)

| Record | Target |
|--------|--------|
| `tiltcheck.me` / `www` | Hyperlift web origin (CNAME/A per Spaceship docs) |
| `api.tiltcheck.me` | Hyperlift api origin |
| Old tunnel / Railway CNAMEs | Remove or disable before cutover to avoid dual origins |

## Cutover sequence

1. Create two Hyperlift applications from GitHub (`main` or release branch).
2. Configure Dockerfile paths + root context; set env (including build-time `NEXT_PUBLIC_*` for web).
3. Build and deploy; smoke Hyperlift default URLs.
4. Attach custom domains in Hyperlift if required by platform.
5. Update Cloudflare DNS to Hyperlift origins; remove dead Railway/tunnel targets.
6. Smoke custom domains (see Verification).
7. Disable/park `deploy-railway.yml`; update `docs/DEPLOY.md` + AGENTS table.
8. Leave VPS plan linked as path B.

## Verification

| Check | Pass criteria |
|-------|----------------|
| Apex | `https://tiltcheck.me/` returns product home |
| API health | `https://api.tiltcheck.me/health` succeeds |
| Bonuses page | `https://tiltcheck.me/bonuses` loads (CollectClock/empty OK) |
| No Discord dependency | Apex works with bots undeployed |
| No tunnel dependency | Apex works with `cloudflared` off |

## Risks

| Risk | Mitigation |
|------|------------|
| Monorepo Hyperlift build OOM / timeout | Prefer Small tier if Micro fails; Dockerfiles already filter builds |
| `NEXT_PUBLIC_*` wrong/missing after deploy | Set at build; rebuild web after URL changes |
| DNS dual-origin fights | Clear tunnel/Railway records before pointing to Hyperlift |
| Ephemeral disk rinses ingest JSON | Accepted phase 1; persistence design later |
| Stale history docs cause wrong Dockerfile path | New runbook is source of truth; history marked obsolete |
| Hyperlift pricing / trial surprises | Pay-as-you-go from ~micro; two apps ≈ two instances |

## Later (explicitly out of phase 1)

1. Durable promo/email store (Supabase or volume) + Gmail automation off-laptop  
2. Optional Discord bots as separate Hyperlift apps  
3. VPS+compose+tunnel if Hyperlift stops fitting  
4. Remaining subdomains (dashboard, activity, arena, admin)

## Rollback

- Point Cloudflare DNS back to last known-good origins (Pages twin for apex marketing if needed; API may stay down).
- Re-enable Railway only if account/billing restored — not assumed.
- Keep prior Hyperlift deployment/image if platform supports instant rollback.

## Open questions (non-blocking)

None for phase 1. Persistence and Discord remain deferred product choices.
