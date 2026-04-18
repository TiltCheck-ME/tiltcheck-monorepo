<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-17 -->
# MVP Deployment Runbook

This runbook is tailored to the current TiltCheck repo and infra:

- VPS deploy target (`85.209.95.175`)
- Docker Compose stack at repo root (`docker-compose.yml`)
- Reverse proxy service in compose (`reverse-proxy`)
- App services in compose (`api`, `discord-bot`, `landing`, and others)

## 1) Pre-Deployment Checklist (Local)

From repo root:

```bash
pnpm --filter @tiltcheck/lockvault build
pnpm --filter @tiltcheck/lockvault test
pnpm --filter @tiltcheck/api build
pnpm --filter @tiltcheck/api test
pnpm --filter @tiltcheck/core build
pnpm --filter @tiltcheck/landing-page build
pnpm --filter @tiltcheck/discord-bot build
```

Required outcome:

- All commands pass before deployment.

## 2) Environment Readiness

Ensure `.env` contains production values before syncing:

- API/Auth:
  - `JWT_SECRET`
  - `DISCORD_CLIENT_ID`
  - `DISCORD_CLIENT_SECRET`
  - `DISCORD_REDIRECT_URI`
- Vault security:
  - `VAULT_ENCRYPTION_KEY` (32-byte hex) for production
- Data/providers:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY` (or service key variant used by API)
- Any Stripe/bot/runtime keys required in current production setup

## 3) Recommended Deployment Order

1. API + dependencies
2. Discord bot
3. Web landing
4. Reverse proxy validation
5. Chrome extension package publish/update

Because compose builds all services together in this repo, do one coordinated deploy and then run phased smoke tests in that order.

## 4) Deploy to VPS

Use the existing Bash deploy script from repo root:

```bash
bash deploy-vps.sh
```

What it does:

- syncs `.env` to VPS path
- pulls latest `main`
- runs `docker compose up -d --build`
- prunes old images
- runs beta-tool smoke checks against landing (`/beta-tester` + core `/tools/*` pages)

Current VPS target and path (from script):

- host: `jme@85.209.95.175`
- path: `/home/jme/tiltcheck-monorepo`

## 5) Post-Deploy Service Checks (VPS)

SSH in:

```bash
ssh jme@85.209.95.175
cd /home/jme/tiltcheck-monorepo
```

Check containers:

```bash
docker compose ps
docker compose logs --tail=200 api
docker compose logs --tail=200 discord-bot
docker compose logs --tail=200 landing
docker compose logs --tail=200 reverse-proxy
```

Health checks:

```bash
curl -fsS http://localhost:3001/health
curl -I http://localhost:8080/
```

Optional full stream:

```bash
docker compose logs -f
```

## 6) MVP Smoke Tests (After Deploy)

### API

- `GET /health` returns success.
- Vault flow:
  - lock request succeeds
  - lock status returns deterministic fields (`amount`, `amountUnit`, `readyToRelease`)
  - release succeeds after expiry or ready state

### Discord Bot

- Bot is online in guild.
- Commands respond:
  - `/vault lock`
  - `/vault status`
  - `/vault unlock`
- No command-registration or runtime import errors in logs.

### Web

- Home and key MVP pages load.
- No archived features shown as active in user-facing MVP paths.
- Beta testing surfaces load:
  - `/beta-tester`
  - `/tools/justthetip`
  - `/tools/domain-verifier`
  - `/tools/collectclock`
  - `/tools/verify`

### Extension

- Build artifact exists at `apps/chrome-extension/dist`.
- Manual smoke:
  - popup launcher opens and toggles sidebar
  - lock timer starts
  - timeline shows lock/extend/auto-unlock history
  - release shows SOL unit consistency

## 7) Rollback Procedure

If major issue found:

1. On VPS, reset to previous known-good commit:

```bash
cd /home/jme/tiltcheck-monorepo
git log --oneline -n 20
git checkout <known_good_commit>
docker compose up -d --build
```

1. Re-check:

```bash
docker compose ps
docker compose logs --tail=200 api
```

1. If extension release was published, re-publish prior extension package/version.

## 7.1) Rollback drill (must-pass before release)

Run these from repo root and confirm the expected markers:

```bash
ALLOW_LEGACY_VPS_DEPLOY=1 bash deploy-vps.sh --dry-run
PROJECT_ID=tiltcheck-ci bash scripts/deploy-gcloud.sh --preflight
bash scripts/deploy-gcloud-rollback.sh --dry-run
PROJECT_ID=tiltcheck-ci bash scripts/gcp/deploy-cloud-run-service.sh --preflight api
```

Expected markers:

- VPS dry-run prints `[dry-run] rsync ...` and `[dry-run] ssh ...`
- GCloud preflight prints `Preflight checks passed.`
- rollback dry-run prints `[dry-run] gcloud compute ssh ...` with `pm2 restart`
- Cloud Run preflight prints `Preflight checks passed for Cloud Run service: api`

For a validated evidence log and command outcomes, see:

- `docs/migration/deploy-post-verify-rollback.md`

## 8) Release Sign-off Criteria

Deployment is complete when all are true:

- local build/test gates pass
- compose services are healthy on VPS
- API/Discord/Web/Extension smoke tests pass
- no vault/security regressions in logs
