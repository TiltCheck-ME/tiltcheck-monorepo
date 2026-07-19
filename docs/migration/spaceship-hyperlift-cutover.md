<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-19 -->

# Spaceship Hyperlift Cutover (Phase 1)

Canonical ops runbook for restoring `tiltcheck.me` and `api.tiltcheck.me` on Spaceship Starlight Hyperlift behind Cloudflare DNS. No cap — this is the source of truth for phase 1. Stale `docs/history/HYPERLIFT*.md` paths are dead; do not follow them.

## Scope

Phase 1 ships **web** and **api** only:

| In scope | Out of scope (phase 1) |
|----------|------------------------|
| `apps/web` → `tiltcheck.me`, `www.tiltcheck.me` | Discord bots (`discord-bot`, `justthetip-bot`, `dad-bot`) |
| `apps/api` → `api.tiltcheck.me` | Cloudflare Tunnel / `cloudflared` |
| Cloudflare DNS → Hyperlift origins (no tunnel) | Durable Gmail crawl / daily-promo persistence |
| Dual Hyperlift apps from existing Dockerfiles | Dashboard, activity, arena, control-room, trust-rollup |
| GitHub → Hyperlift build/deploy | Unified all-in-one container rebuild |

Railway is parked — not the production target. GitHub Pages twin stays a static mirror, not apex production.

## Architecture diagram

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

Parallel / unchanged:

- GitHub Pages twin (shareable static) — not apex production
- `apps/hub` Cloudflare Worker — independent
- VPS compose plan — path B; same public hostnames later (`docs/migration/exit-railway-plan.md`)

## Prerequisites

Before touching Hyperlift or DNS:

1. **Spaceship Hyperlift account** — Starlight tier with pay-as-you-go billing active (trial alone may not cut it for monorepo builds).
2. **GitHub connected** — Hyperlift linked to the TiltCheck monorepo; deploy branch chosen (`main` or release branch).
3. **Cloudflare zone** — `tiltcheck.me` active; nameservers remain Cloudflare (registrar stays Spaceship).
4. **Secrets ready offline** — API boot requires `JWT_SECRET`, `DISCORD_CLIENT_ID`, and `DISCORD_CLIENT_SECRET` (real Discord OAuth app creds from the developer portal). Add DB/API keys only if routes you enable need them. Store in a password manager or local `.env` scratch file. **Never commit secrets to git or this repo.**

Optional but recommended: note current Cloudflare records (screenshot or export) so rollback has a known-good snapshot.

## Create Hyperlift apps

Create two applications in the Spaceship Hyperlift dashboard. Connect the monorepo; set build context to repository root.

| App name (suggested) | Dockerfile | Build context | Public host |
|----------------------|------------|---------------|-------------|
| `tiltcheck-web` | `apps/web/Dockerfile` | repository root `.` | `tiltcheck.me`, `www` |
| `tiltcheck-api` | `apps/api/Dockerfile` | repository root `.` | `api.tiltcheck.me` |

Build settings:

- **Web:** monorepo root context is required — the Dockerfile copies workspace packages. If Micro tier OOMs, bump to Small.
- **API:** same root context. Production bind is `0.0.0.0`; default `PORT` resolves to `8080` when unset (see `apps/api/tests/runtime-config.test.ts`).

Attach custom domains in Hyperlift after the first successful build on default Hyperlift URLs.

## Environment variables

### Web (set as **build-time** where Hyperlift requires for Next)

Hyperlift must receive `NEXT_PUBLIC_*` at **image build** time. Changing these later requires a rebuild — not a runtime-only tweak.

```bash
NODE_ENV=production
PORT=8080
HOSTNAME=0.0.0.0
SITE_URL=https://tiltcheck.me
PUBLIC_BASE_URL=https://tiltcheck.me
NEXT_PUBLIC_API_URL=https://api.tiltcheck.me
# NEXT_PUBLIC_DASHBOARD_URL optional in phase 1 — omit or point at future host
```

### API (runtime)

The API process **fails fast at boot** if any of the three required vars below are missing (`apps/api/src/index.ts`). Set all three in Hyperlift before the first deploy.

```bash
NODE_ENV=production
PORT=8080
HOST=0.0.0.0
JWT_SECRET=<generate>
DISCORD_CLIENT_ID=<Discord OAuth app client id>
DISCORD_CLIENT_SECRET=<Discord OAuth app client secret>
```

Generate `JWT_SECRET` with a cryptographically random 32+ byte value (e.g. `openssl rand -hex 32`). Use the same Discord OAuth application you use for production login (developer portal → OAuth2). Paste values into the Hyperlift dashboard only.

Add other API env vars (database URL, Redis, etc.) only if the routes you enable require them. Phase 1 health and public web flows should work without Discord **bots** deployed — but the API still needs Discord **OAuth** creds to start.

**`SKIP_ENV_VALIDATION`:** Used elsewhere in the monorepo (`packages/config`) for local/dev shortcuts. It does **not** bypass the API gateway's startup required-env check. Do not set it on Hyperlift expecting to omit `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, or `JWT_SECRET` — the API will exit before listening.

## Cloudflare DNS

Keep **Spaceship as registrar** and **Cloudflare as nameservers**. Update records in the Cloudflare dashboard for `tiltcheck.me`:

| Name | Type | Target | Proxy |
|------|------|--------|-------|
| `@` / `tiltcheck.me` | CNAME (or A/AAAA per Hyperlift docs) | Hyperlift web origin | Proxied OK |
| `www` | CNAME | Hyperlift web origin or apex | Proxied OK |
| `api` | CNAME | Hyperlift api origin | Proxied OK |

Use the exact origin hostname Hyperlift provides after app creation (often a `*.hyperlift.spaceship.com` or platform-specific CNAME target — confirm in Hyperlift UI).

**Before cutover:** remove or disable old Railway and Cloudflare Tunnel CNAMEs for `@`, `www`, and `api`. Dual-origin DNS fights are a big yikes — traffic splits unpredictably and smoke tests lie.

Leave unrelated subdomains (dashboard, activity, arena, admin) untouched unless you know their new target.

## Deploy order

Execute in this sequence. Do not flip public DNS until Hyperlift default URLs pass smoke checks.

1. **Create `tiltcheck-api` app** — Dockerfile `apps/api/Dockerfile`, context `.`, runtime env set.
2. **Build and deploy API** — wait for green build.
3. **Smoke Hyperlift default URL** — `GET /health` returns success on the platform-assigned hostname (not custom domain yet).
4. **Create `tiltcheck-web` app** — Dockerfile `apps/web/Dockerfile`, context `.`, build-time env including all `NEXT_PUBLIC_*` vars.
5. **Build and deploy web** — wait for green build (monorepo Next builds are slow; plan for it).
6. **Smoke Hyperlift default URL** — `GET /` returns the product home on the platform-assigned hostname.
7. **Attach custom domains** in Hyperlift for `tiltcheck.me`, `www`, and `api.tiltcheck.me` if the platform requires explicit domain binding before DNS.
8. **Update Cloudflare DNS** — point `@`, `www`, and `api` at Hyperlift origins; remove dead Railway/tunnel records.
9. **Smoke custom domains** — run Verification checks below on production hostnames.

API before web: web's build bakes `NEXT_PUBLIC_API_URL=https://api.tiltcheck.me`. API should exist (or at least its Hyperlift URL should health-check) before you trust end-to-end flows, but custom DNS for API can wait until step 8.

## Verification

Run after custom domains are live. All must pass before calling cutover done.

| Check | Pass criteria |
|-------|----------------|
| Apex | `https://tiltcheck.me/` returns product home |
| API health | `https://api.tiltcheck.me/health` succeeds |
| Bonuses page | `https://tiltcheck.me/bonuses` loads (CollectClock/empty OK) |
| No Discord dependency | Apex works with bots undeployed |
| No tunnel dependency | Apex works with `cloudflared` off |

Quick curl sanity:

```bash
curl -fsS -o /dev/null -w '%{http_code}\n' https://api.tiltcheck.me/health
curl -fsS -o /dev/null -w '%{http_code}\n' https://tiltcheck.me/
curl -fsS -o /dev/null -w '%{http_code}\n' https://tiltcheck.me/bonuses
```

Expect `200` (or `3xx` only if Hyperlift/CF redirects are intentional and land on the same content).

## Rollback

If cutover fails or prod is worse than down:

1. **Revert Cloudflare DNS** — restore prior CNAME/A records from your pre-cutover snapshot. Point `@` / `www` back to last known-good origin.
2. **GitHub Pages twin** — may serve marketing-only static content on apex if that was the fallback; product features that need API will be broken. Lowkey acceptable for a temporary "we're fixing it" state.
3. **API** — may stay down until DNS points at a working API origin. Do not pretend rollback is painless if Railway billing is dead.
4. **Hyperlift** — keep the last green deployment in Hyperlift if the platform supports instant rollback to a prior image; DNS revert alone does not help if you need Hyperlift-side rollback instead.
5. **Re-enable Railway** — only if account/billing is restored; not assumed for this cutover.

Document what broke and whether the failure was DNS, build, or env — future you will thank present you.

## Path B

Hyperlift phase 1 does not lock you in forever. If you outgrow Hyperlift pricing, need Discord bots 24/7 on the same box, or want full compose control:

**See [Exit Railway — Full Stack Migration Plan](./exit-railway-plan.md)** for VPS + Docker Compose + Cloudflare Tunnel. Same public hostnames (`tiltcheck.me`, `api.tiltcheck.me`); different compute backend. Execute path B when Hyperlift stops fitting — not on day one unless phase 1 already failed.

## Deferred

Explicitly not phase 1. Ship the host first; persistence and bots come later.

| Item | Notes |
|------|-------|
| Gmail crawl / daily promo ingest | Ephemeral Hyperlift disk will rinse JSON on redeploy — accepted for now |
| Promo durability | Supabase or volume-backed store — design after apex is live |
| Discord bots | Separate Hyperlift apps or VPS compose stack — optional product choice |
| Remaining subdomains | dashboard, activity, arena, admin, trust-rollup — path B or later Hyperlift apps |
| `deploy-railway.yml` | Park in repo (later task) — Railway is not prod |

When promo persistence lands, update this runbook or add a phase-2 doc — do not silently assume Hyperlift volumes behave like a database.

## Founder execution checklist

- [ ] Connect GitHub repo to Hyperlift
- [ ] Create `tiltcheck-api` app (Dockerfile `apps/api/Dockerfile`, context `.`)
- [ ] Set API env; build; confirm `/health` on Hyperlift URL
- [ ] Create `tiltcheck-web` app (Dockerfile `apps/web/Dockerfile`, context `.`)
- [ ] Set web build/runtime env including `NEXT_PUBLIC_API_URL`; build; confirm `/` on Hyperlift URL
- [ ] Attach custom domains in Hyperlift if required
- [ ] Cloudflare: point apex/`www`/`api` at Hyperlift; remove tunnel/Railway leftovers
- [ ] Smoke `https://tiltcheck.me/`, `https://api.tiltcheck.me/health`, `https://tiltcheck.me/bonuses`
- [ ] Confirm `deploy-railway.yml` is parked on `main`
