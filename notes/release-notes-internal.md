<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-17 -->
# TiltCheck MVP Release Notes (Internal)

## Release Theme

MVP hardening and operational simplification: reduce user-facing dead paths, lock in safer vault + extension behavior, and move deployment guidance to VPS-free defaults with explicit fallback.

## Scope Included

- `apps/web` navigation/content cleanup for MVP-only paths.
- `apps/chrome-extension` wallet bridge timeout + request-response handling improvements.
- `apps/api` moderation route guard ordering update (`503` when unconfigured).
- Deployment docs and scripts:
  - `DEPLOYMENT_PLAN.md` (Vercel + Railway/Render model)
  - `docs/deploy-mvp-cheatsheet.md`
  - `docs/deploy-mvp-runbook.md`
  - `docker-compose.mvp.yml`
  - `scripts/mvp-beta-tools-smoke.sh`
  - `deploy-vps.sh` deprecation gate via `ALLOW_LEGACY_VPS_DEPLOY=1`

## Key Internal Changes

- **Web**
  - Replaced legacy `/dashboard` references with `/getting-started`.
  - Replaced placeholder login links with `/login`.
  - Removed archived tool links from primary navs; promoted `/beta-tester`.
  - Normalized tool and landing references to current Next.js routes.
- **Extension**
  - `wallet-bridge.ts` now clears timeout on success and prevents dangling waiters.
  - Request ID correlation remains enforced for transaction responses.
- **API**
  - `apps/api/src/routes/mod.ts`: early unconfigured-service return before field validation.
- **Ops**
  - Added executable smoke test script for beta/core tool public URLs.
  - Added compose fallback with practical memory/log caps for non-Swarm usage.
  - Deployment narrative now defaults to managed runtimes and per-service rollback.

## Verification Status

- `@tiltcheck/core build` ✅
- `@tiltcheck/api build` ✅
- `@tiltcheck/lockvault build` ✅
- `@tiltcheck/lockvault test` ✅ (6/6)
- `@tiltcheck/landing-page build` ✅
- `@tiltcheck/api test` ⚠️ partial (3 failures in moderation tests vs fallback expectations)
- `@tiltcheck/discord-bot build` ⚠️ partial (pre-existing DA&D import path errors)

## Known Issues / Follow-ups

- DA&D command import path errors in `apps/discord-bot/src/commands/dad/*`.
- Moderation test expectations need alignment with current unconfigured fallback behavior (`503`).
- `deploy-vps.sh` remains available but intentionally blocked unless explicitly enabled.

## Release / Rollback Runbook

- Deploy web on Vercel (`apps/web` root).
- Deploy runtime services on Railway/Render:
  - `apps/api`
  - `apps/discord-bot`
  - `apps/trust-rollup` (if required)
- Post-deploy:
  - `bash scripts/mvp-beta-tools-smoke.sh https://tiltcheck.me`
  - API `GET /health`
  - Discord `/vault lock`, `/vault status`, `/vault unlock`
- Rollback:
  - Vercel previous deployment for web.
  - Per-service rollback on Railway/Render for runtime.
  - Optional temporary local fallback: `docker compose -f docker-compose.mvp.yml up -d --build`.
