# TiltCheck Deployment Runbook

<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-16 -->

## Services Overview

| Service         | Port  | Health Endpoint              | Deploy Target     |
|-----------------|-------|------------------------------|-------------------|
| api             | 3001  | GET /health                  | Railway / VPS     |
| discord-bot     | 8085  | GET /health                  | Railway / VPS     |
| justthetip-bot  | 8080  | GET /health                  | Railway / VPS     |
| dad-bot         | 8080  | GET /health                  | Railway / VPS     |
| control-room    | 3002  | GET /health                  | Railway / VPS     |
| trust-rollup    | 8082  | GET /health                  | Railway / VPS     |
| user-dashboard  | 6001  | GET /health                  | Railway / VPS     |
| game-arena      | 7071  | GET /health                  | Railway / VPS     |
| activity        | 8080  | GET / (nginx 200)            | Railway / VPS     |
| landing (web)   | 80    | GET /status.html             | Vercel / VPS      |
| cloudflared     | N/A   | Tunnel daemon (no HTTP)      | Railway / VPS     |

---

## Pre-Deploy Checklist

- [ ] `pnpm build` passes with no errors
- [ ] `pnpm test` passes with no failures
- [ ] No `REPLACE_ME` or `changeme` values in `.env`
- [ ] Discord slash commands synced: `pnpm discord:setup`
- [ ] `TUNNEL_TOKEN` is set if deploying cloudflared
- [ ] Docker images build locally: `docker compose build`

---

## Deploy: Railway (API + Bots)

Railway auto-deploys on push to `main`. To trigger manually:

1. Push to `main` or open the Railway dashboard at https://railway.app
2. Select the service (api, discord-bot, justthetip-bot, etc.)
3. Click **Deploy** -> **Trigger Deployment**
4. Watch logs for startup errors — look for `Listening on port` lines
5. Run health checks (see section below) after deploy completes

For first-time service setup:
```bash
railway login
railway link
railway up --service api
```

---

## Deploy: Web (Vercel)

Landing and web app deploy automatically on push to `main` via Vercel GitHub integration.

To deploy manually:
```bash
pnpm build
npx vercel --prod
```

Set required environment variables in Vercel dashboard under **Settings -> Environment Variables**.

---

## Deploy: Docker / VPS

Build and push images, then bring services up on VPS:

```bash
# Build all images locally
docker compose -f docker-compose.yml -f docker-compose.prod.yml build

# Copy .env to VPS (first time only)
scp .env user@VPS_IP:/home/user/tiltcheck-monorepo/.env

# Pull latest code on VPS
ssh user@VPS_IP "cd /home/user/tiltcheck-monorepo && git pull && \
  docker compose -f docker-compose.yml -f docker-compose.prod.yml pull && \
  docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d"
```

The `deploy-vps.sh` script is deprecated. Use the Railway/Vercel path unless explicitly targeting legacy VPS.
Set `ALLOW_LEGACY_VPS_DEPLOY=1` to bypass the guard if you need legacy mode.

---

## Sync Discord Slash Commands

Run after any change to slash command definitions:

```bash
# Sync to a specific guild (fast — dev/staging use)
DISCORD_GUILD_ID=YOUR_GUILD_ID pnpm discord:setup

# Sync globally (takes up to 1 hour to propagate)
pnpm discord:setup
```

Applies to: discord-bot, justthetip-bot, dad-bot — each has its own `deploy:commands` script.
Run from the workspace root to use the pnpm filter.

---

## Health Check Verification

Run after every deploy:

```bash
curl -sf http://localhost:3001/health   # api
curl -sf http://localhost:8082/health   # trust-rollup
curl -sf http://localhost:6001/health   # user-dashboard
curl -sf http://localhost:7071/health   # game-arena
curl -sf http://localhost:3002/health   # control-room
wget -qO- http://localhost:8080/        # activity (nginx 200)
```

For Railway-deployed services, replace `localhost:PORT` with the Railway public URL.

---

## Rollback Procedure

**Railway rollback:**
1. Open Railway dashboard
2. Select the service
3. Go to **Deployments** tab
4. Find the last known-good deploy
5. Click **Redeploy** on that entry

**VPS rollback:**
```bash
ssh user@VPS_IP "cd /home/user/tiltcheck-monorepo && \
  git log --oneline -10"   # find the good commit hash

ssh user@VPS_IP "cd /home/user/tiltcheck-monorepo && \
  git checkout <COMMIT_HASH> && \
  docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build"
```

---

## Secret Rotation Checklist

| Secret               | Rotate Every | Breaks If Expired                        |
|----------------------|--------------|------------------------------------------|
| DISCORD_TOKEN        | On compromise| All bots go offline immediately          |
| JWT_SECRET           | 90 days      | All active user sessions invalidated     |
| SESSION_SECRET       | 90 days      | All sessions invalidated                 |
| SUPABASE_ANON_KEY    | On compromise| API read/write fails                     |
| SUPABASE_SERVICE_KEY | On compromise| Admin-level DB operations fail           |
| TUNNEL_TOKEN         | On compromise| Cloudflare tunnel drops                  |
| OPENAI_API_KEY       | 90 days      | AI features disabled                     |

After rotating any key: update in Railway/Vercel dashboard AND in VPS `.env`, then redeploy affected services.

---

## Contacts / Escalation

| Area             | Owner             |
|------------------|-------------------|
| API / Auth       | [backend owner]   |
| Discord bots     | [bot owner]       |
| Web / Landing    | [frontend owner]  |
| Infrastructure   | [devops owner]    |
| Database (Supabase) | [db owner]     |
