# PR Body

## Summary

This PR prepares the MVP release candidate across web, extension, API, bot, and deployment operations. It hardens wallet/auth behavior, aligns LockVault UX/API/Discord outputs, and shifts deployment guidance from legacy VPS-first to a VPS-free Vercel + Railway/Render path with explicit safety guardrails.

## Why

- Reduce release risk by removing stale/archived user paths and tightening runtime behavior in core MVP flows.
- Improve operational resilience after VPS instability by documenting a simpler hosting model with service-level limits, health checks, and rollback instructions.
- Keep MVP scope explicit so non-critical surfaces stay out of the release path.

## What Changed

- **Extension reliability/security**
  - Hardened message bridge behavior and response correlation for wallet transaction requests.
  - Added deterministic timeout handling for pending wallet transaction requests.
  - Prior branch work also moved auth/session state to `chrome.storage.local` and tightened trusted-origin handling.
- **Vault flow alignment (API + LockVault + Discord)**
  - Lock/release/timeline behavior and unit messaging were normalized for MVP consistency.
  - Moderation route behavior now returns `503` earlier when moderation backend is unconfigured.
- **Web MVP navigation cleanup**
  - Replaced legacy `/dashboard` and other stale/extension-archived links with active MVP destinations (for example `getting-started`, `beta`, `login`).
  - Normalized static-page links to `.html` routes in nav/footer/site-map where needed.
  - Updated CTA copy from launch/dashboard language to MVP onboarding language.
- **Deployment and release operations**
  - Replaced old deployment narrative with `DEPLOYMENT_PLAN.md` focused on VPS-free MVP hosting.
  - Added `docker-compose.mvp.yml` as optional single-host fallback with memory/log caps.
  - Added `scripts/mvp-beta-tools-smoke.sh` for beta/tools page smoke checks.
  - Updated runbook/cheatsheet docs for Vercel + Railway/Render rollout and rollback.
  - Marked `deploy-vps.sh` as deprecated by default behind `ALLOW_LEGACY_VPS_DEPLOY=1`.

## Testing

### Automated gates (recorded in repo docs)

- `pnpm --filter @tiltcheck/core build` ✅
- `pnpm --filter @tiltcheck/api build` ✅
- `pnpm --filter @tiltcheck/lockvault build` ✅
- `pnpm --filter @tiltcheck/lockvault test` ✅ (6/6)
- `pnpm --filter @tiltcheck/landing-page build` ✅
- `pnpm --filter @tiltcheck/api test` ⚠️ partial (3 moderation-route expectation failures not in MVP vault path)
- `pnpm --filter @tiltcheck/discord-bot build` ⚠️ partial (pre-existing DA&D import issues)

### Release smoke checks

- `bash scripts/mvp-beta-tools-smoke.sh https://tiltcheck.me`
- `GET /health` on API runtime
- Discord: `/vault lock`, `/vault status`, `/vault unlock`

## Risk / Notes

- Known non-MVP blockers remain documented (DA&D command imports and moderation-test expectation mismatch).
- This PR intentionally narrows visible user paths to MVP-ready pages; archived tooling remains out of primary navigation.

## Rollout Plan

1. Merge to `main`.
2. Deploy `apps/web` on Vercel.
3. Deploy runtime services (`apps/api`, `apps/discord-bot`, optional `apps/trust-rollup`) on Railway/Render with memory caps.
4. Run smoke checks and monitor health alerts.

## Rollback Plan

- Web: rollback to previous Vercel deployment.
- Runtime: rollback affected Railway/Render service(s) only.
- Optional host fallback: use `docker-compose.mvp.yml` for temporary single-host recovery.
