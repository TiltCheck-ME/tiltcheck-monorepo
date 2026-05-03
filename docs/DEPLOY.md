<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-03 -->

# TiltCheck Deployment Inventory

This file is the canonical deploy map for the current repo. If a workflow, image, service, env requirement, or smoke target is not listed here, assume it is not wired for production yet.

## Current Reality

- Containerized services ship through `.github/workflows/deploy-railway.yml`.
- Images are built in GitHub Actions and pushed to GHCR as `ghcr.io/tiltcheck-me/tiltcheck-<service>`.
- Railway pulls the SHA-tagged image for each wired service.
- Public hostnames are reconciled separately through `.github/workflows/configure-tunnel.yml`.
- `.github/workflows/deploy-web.yml` is a manual Vercel fallback, not the primary production path.
- There is no active in-repo GCP deploy workflow.

## Workflow Secrets

| Workflow | Required secrets | Notes |
| :--- | :--- | :--- |
| `.github/workflows/deploy-railway.yml` | `RAILWAY_TOKEN` | `PACKAGES_TOKEN` is optional but needed if GHCR package visibility updates should succeed without warnings. |
| `.github/workflows/configure-tunnel.yml` | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_ZONE_ID` | Reconciles ingress rules and DNS records. |
| `.github/workflows/deploy-web.yml` | `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `VERCEL_TOKEN` | Manual fallback only. |

## Deploy Inventory

| Deployable | Source | Delivery | Workflow | GHCR image | Railway service | Required env (minimum confirmed in repo) | Smoke target |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `api` | `apps/api` | GHCR -> Railway | `.github/workflows/deploy-railway.yml` | `ghcr.io/tiltcheck-me/tiltcheck-api` | `api` | `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `JWT_SECRET` | `https://api.tiltcheck.me/health` |
| `web` | `apps/web` | GHCR -> Railway | `.github/workflows/deploy-railway.yml` | `ghcr.io/tiltcheck-me/tiltcheck-web` | `web` | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_DASHBOARD_URL` | `https://tiltcheck.me/` |
| `discord-bot` | `apps/discord-bot` | GHCR -> Railway | `.github/workflows/deploy-railway.yml` | `ghcr.io/tiltcheck-me/tiltcheck-discord-bot` | `discord-bot` | `DISCORD_CLIENT_ID` plus one bot token var (`TILT_DISCORD_BOT_TOKEN`, `DISCORD_TOKEN`, or `DISCORD_BOT_TOKEN`) | Railway private `/health` on port `8080` |
| `justthetip-bot` | `apps/justthetip-bot` | GHCR -> Railway | `.github/workflows/deploy-railway.yml` | `ghcr.io/tiltcheck-me/tiltcheck-justthetip-bot` | `justthetip-bot` | `DISCORD_CLIENT_ID`, `JTT_DISCORD_BOT_TOKEN` or fallback token vars, plus `JUSTTHETIP_BOT_WALLET_PRIVATE_KEY` in prod | Railway private `/health` on port `8082` |
| `dad-bot` | `apps/dad-bot` | GHCR -> Railway | `.github/workflows/deploy-railway.yml` | `ghcr.io/tiltcheck-me/tiltcheck-dad-bot` | `dad-bot` | `DISCORD_CLIENT_ID` plus one dad bot token var (`DAD_DISCORD_BOT_TOKEN`, `DISCORD_TOKEN`, or `DISCORD_BOT_TOKEN`) | Railway private `/health` on service port |
| `trust-rollup` | `apps/trust-rollup` | GHCR -> Railway | `.github/workflows/deploy-railway.yml` | `ghcr.io/tiltcheck-me/tiltcheck-trust-rollup` | `trust-rollup` | `TRUST_ROLLUP_*` config and any upstream data-source keys required by enabled fetchers | Railway private `/health` on service port |
| `control-room` | `apps/control-room` | GHCR -> Railway | `.github/workflows/deploy-railway.yml` | `ghcr.io/tiltcheck-me/tiltcheck-control-room` | `control-room` | `ADMIN_PASSWORD`, `SESSION_SECRET` | `https://admin.tiltcheck.me/health` |
| `game-arena` | `apps/game-arena` | GHCR -> Railway | `.github/workflows/deploy-railway.yml` | `ghcr.io/tiltcheck-me/tiltcheck-game-arena` | `game-arena` | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SESSION_SECRET` and/or `JWT_SECRET` | `https://arena.tiltcheck.me/health` |
| `user-dashboard` | `apps/user-dashboard` | GHCR -> Railway | `.github/workflows/deploy-railway.yml` | `ghcr.io/tiltcheck-me/tiltcheck-user-dashboard` | `user-dashboard` | `JWT_SECRET`, `MAGIC_SECRET_KEY` when Magic routes stay enabled | `https://dashboard.tiltcheck.me/health` |
| `activity` | `apps/activity` | GHCR -> Railway | `.github/workflows/deploy-railway.yml` | `ghcr.io/tiltcheck-me/tiltcheck-activity` | `activity` | `VITE_DISCORD_CLIENT_ID`, `VITE_API_URL`, `VITE_DASHBOARD_URL` | `https://activity.tiltcheck.me/` |
| `cloudflared` | `apps/cloudflared` | GHCR -> Railway tunnel daemon | `.github/workflows/deploy-railway.yml` | `ghcr.io/tiltcheck-me/tiltcheck-cloudflared` | `cloudflared` | `TUNNEL_TOKEN` | No public HTTP probe; verify Railway service health plus `.github/workflows/configure-tunnel.yml` |
| `hub` | `apps/hub` | Deprecated manual worker path | `.github/workflows/deploy-hub.yml` (blocked by design) | n/a | n/a | Wrangler bindings such as `DB`, `SESSIONS`, and `INTERNAL_API_SECRET` | Worker code exposes `/health`, but `hub.tiltcheck.me` currently routes to `user-dashboard` |
| `chrome-extension` | `apps/chrome-extension` | Browser asset | none | n/a | n/a | Build/runtime config in `apps/chrome-extension/src/config.ts` | Manual smoke: load built extension and verify API calls against `https://api.tiltcheck.me` |
| `degens-activity` | `apps/degens-activity` | Browser / Discord activity asset | none | n/a | n/a | `VITE_DISCORD_CLIENT_ID`, `VITE_TOKEN_ENDPOINT`, `VITE_ARENA_URL` | Manual smoke: build and load the SPA; no production host is wired in-repo |
| `tiltcheck-activity` | `apps/tiltcheck-activity` | Browser / Discord activity asset | none | n/a | n/a | `VITE_DISCORD_CLIENT_ID`, `VITE_TOKEN_ENDPOINT`, `VITE_HUB_URL` | Manual smoke: build and load the SPA; no production host is wired in-repo |

## Public Routing

Public hostnames come from `.github/workflows/configure-tunnel.yml`, not from the deploy workflow itself. Current mappings in-repo are:

- `api.tiltcheck.me` -> `api.railway.internal:3000`
- `tiltcheck.me` and `www.tiltcheck.me` -> `web.railway.internal:3000`
- `dashboard.tiltcheck.me` and `hub.tiltcheck.me` -> `user-dashboard.railway.internal:6001`
- `activity.tiltcheck.me` -> `activity.railway.internal:3000`
- `arena.tiltcheck.me` -> `game-arena.railway.internal:3000`
- `admin.tiltcheck.me` -> `control-room.railway.internal:3000`

## Rollback Notes

- Container services: rollback from the Railway dashboard to the prior image or release.
- Tunnel drift: rerun `.github/workflows/configure-tunnel.yml`.
- Browser assets: republish the previous extension or SPA artifact manually.

## Validation Notes

When this file changes, confirm all three checks before merging:

1. `gh workflow list` shows no `Deploy to GCP` workflow.
2. Repo search for the retired GCP runtime terms only returns archived history under `docs/history/`.
3. Every deployable row above still matches the active workflow or an explicit manual-only path.
