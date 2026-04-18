<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-17 -->
# VPS-Free Deployment Plan (MVP)

This plan replaces the old VPS strategy after production instability and loss of host access.

## Goals

- Keep MVP online without managing servers.
- Prevent memory-related outages from taking down all services.
- Minimize moving parts and cost while preserving rollback options.

## MVP Service Scope

Keep only services needed for current launch:

1. `apps/web` (landing + tool pages)
2. `apps/api` (health + vault/auth routes)
3. `apps/discord-bot` (core bot commands)
4. `apps/trust-rollup` (only if required by API/bot paths)

Everything else is non-MVP and should remain disabled until explicitly needed.

## Hosting Strategy

### 1) Web Layer: Vercel

Deploy `apps/web` as static marketing + tool pages.

- Root directory: `apps/web`
- Build command: `pnpm --filter @tiltcheck/landing-page build`
- Output: Vite `dist` output
- Domain: point `tiltcheck.me` here

### 2) Runtime Services: Railway (or Render as fallback)

Deploy API + bot (+ trust-rollup if needed) as separate services.

- `apps/api`
- `apps/discord-bot`
- `apps/trust-rollup` (optional)

Set per-service hard memory limits in provider settings:

- API: 512 MB
- Discord bot: 384 MB
- Trust rollup: 256 MB

Enable restart-on-failure and health checks for each service.

## Mandatory Safety Guardrails

Before public traffic:

1. Memory limits per service (hard caps, not just alerts)
2. Log retention caps / rotation
3. Health checks wired to restart policy
4. Uptime alerts for:
   - `/health` (API)
   - bot health endpoint
   - landing page availability
5. Separate staging + production environments

## Release Workflow (No VPS)

1. Merge to `main`
2. Deploy web on Vercel
3. Deploy API/bot on Railway
4. Run MVP smoke tests:
   - `/beta-tester`
   - `/tools/justthetip`
   - `/tools/domain-verifier`
   - `/tools/collectclock`
   - `/tools/verify`
   - `GET /health` on API
5. Verify Discord commands:
   - `/vault lock`
   - `/vault status`
   - `/vault unlock`

## Rollback

- Web: redeploy previous Vercel deployment
- Runtime: rollback each service to previous Railway deployment
- If only one service regresses, rollback only that service

## Local/Backup Runtime Option

If a container host is needed again, use `docker-compose.mvp.yml` only.
It includes real memory and log caps suitable for `docker compose` (non-Swarm).
