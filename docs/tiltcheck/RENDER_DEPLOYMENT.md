# Render Deployment Guide

## Overview
This repository uses a **unified container** approach for Render deployment. All services (Nginx reverse proxy, landing, dashboard, Discord bot, trust rollup) run in a single container orchestrated by `forego`.

## Prerequisites
1. Render account (free tier works initially).
2. GitHub repo connected to Render.
3. Environment variables configured (see below).

## Deployment Steps

### 1. Create New Web Service
- Dashboard → **New** → **Web Service**
- Connect your GitHub repo: `jmenichole/tiltcheck-monorepo`
- **Name**: `tiltcheck-unified` (or your choice)
- **Region**: Choose closest to your users (US West/East recommended)
- **Branch**: `main`
- **Root Directory**: Leave blank (uses repo root)
- **Runtime**: Docker
- **Dockerfile Path**: `Dockerfile.render`

### 2. Configure Build & Deploy Settings
- **Build Command**: (leave empty; Docker handles build)
- **Start Command**: (leave empty; Dockerfile CMD uses forego)
- **Health Check Path**: `/proxy-health`
- **Instance Type**: Starter (512MB) or Standard (2GB recommended for production)

### 3. Environment Variables
Add these in Render dashboard under **Environment**:

**Required (Discord Bot)**:
```
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id
DISCORD_GUILD_ID=your_guild_id (optional for guild commands)
```

**Optional (Feature Flags)**:
```
NODE_ENV=production
SUSLINK_AUTO_SCAN=true
TRUST_THRESHOLD=60
DASHBOARD_POLL_MS=30000
DASHBOARD_EVENTS_KEEP_DAYS=7
```

**Solana / JustTheTip** (if using):
```
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
JUSTTHETIP_FEE_WALLET=your_solana_wallet_address
```

**Paths** (defaults work; override if needed):
```
PENDING_TIPS_STORE_PATH=/app/data/pending-tips.json
TRIVIA_STORE_PATH=/app/data/trivia-store.json
LANDING_LOG_PATH=/app/data/landing-requests.log
```

### 4. Custom Domain Setup (tiltcheck.it.com)
- In Render service settings → **Custom Domains** → Add `tiltcheck.it.com`
- Render will provide DNS instructions:
  - **CNAME**: `tiltcheck.it.com` → `tiltcheck-unified.onrender.com` (or your service URL)
  - For apex domain (`it.com`), use ALIAS/ANAME if your registrar supports it
- Wait for DNS propagation (5-20 min typically)
- Render auto-issues Let's Encrypt certificate (no manual certbot needed)

### 5. Deploy
- Click **Create Web Service**
- Render will:
  1. Build Docker image from `Dockerfile.render`
  2. Start container with `forego` orchestrating all processes
  3. Health check `/proxy-health` every 30s
  4. Auto-redeploy on GitHub pushes to `main`

### 6. Verify Deployment
Once live, test endpoints:
```bash
curl https://tiltcheck.it.com/proxy-health
# Expected: {"status":"ok","proxy":"nginx","render":true}

curl https://tiltcheck.it.com/
# Expected: Landing page HTML

curl https://tiltcheck.it.com/dashboard/
# Expected: Dashboard UI

curl https://tiltcheck.it.com/api/health
# Expected: {"status":"ok",...}
```

## Process Architecture
The `Procfile` orchestrates five processes:
- **nginx**: Reverse proxy (listens on Render's `$PORT`, routes traffic)
- **landing**: Express server (port 8080, serves marketing pages)
- **dashboard**: Dashboard API (port 5055, events + metrics)
- **bot**: Discord bot (connects to Discord Gateway)
- **rollup**: Trust rollup service (port 8082, aggregates trust scores)

All communicate via localhost; Nginx is the sole external entry point.

## Logs & Monitoring
- **Logs**: View in Render dashboard → your service → **Logs** tab
- **Metrics**: Render provides CPU, RAM, request count
- **Custom Metrics**: Access `/metrics` endpoint (landing service aggregates paths/UAs)
- **Structured Logs**: Nginx outputs JSON to stdout (Render captures automatically)

## Scaling
- **Vertical**: Upgrade instance type (Standard 2GB → 4GB)
- **Horizontal**: Render doesn't support horizontal scaling for single containers with stateful processes (bot). Consider splitting services if needed.

## Troubleshooting

### Build Fails
- Check `pnpm-lock.yaml` is committed
- Verify all `package.json` files exist for workspace packages
- Inspect build logs for missing dependencies

### Health Check Fails
- Ensure Nginx starts (check logs for port binding errors)
- Verify `$PORT` env is set (Render injects automatically)
- Test locally: `docker build -f Dockerfile.render -t tiltcheck-render . && docker run -p 8080:8080 tiltcheck-render`

### Discord Bot Not Connecting
- Verify `DISCORD_TOKEN` is correct
- Check bot has required intents enabled in Discord Developer Portal
- Inspect logs for connection errors

### Dashboard 404
- Ensure dashboard built successfully (`pnpm run build` in build logs)
- Check `services/dashboard/dist/index.js` exists in image
- Verify dashboard process started (forego logs show all processes)

## Local Testing
Test the unified container locally:
```bash
# Build
docker build -f Dockerfile.render -t tiltcheck-render .

# Run (set env vars)
docker run -p 8080:8080 \
  -e PORT=8080 \
  -e DISCORD_TOKEN=your_token \
  -e DISCORD_CLIENT_ID=your_id \
  tiltcheck-render

# Test health
curl http://localhost:8080/proxy-health
```

## Optional: render.yaml Blueprint
For Infrastructure-as-Code, use `render.yaml` (see `render.yaml` in repo root). This allows:
- Version-controlled service config
- Automated environment sync
- Multi-environment deployments

To use:
1. Push `render.yaml` to repo
2. Render dashboard → **Blueprint** → select repo
3. Auto-provisions services from YAML

## Security Notes
- **No Public Ports**: Only Nginx port exposed; internal services on localhost
- **HTTPS**: Render handles TLS termination; all traffic encrypted
- **Secrets**: Use Render environment variables (not committed to repo)
- **Rate Limiting**: Nginx enforces 30 req/min per IP (adjust in `nginx.render.conf` if needed)
- **Headers**: HSTS, CSP, X-Frame-Options enforced by landing server + Nginx

## Cost Estimate
- **Starter (512MB)**: Free for 750 hours/month (sleeps after 15min inactivity)
- **Standard (2GB)**: ~$25/month (always-on, better for production)
- **Database**: Not needed currently (file-based storage in `/app/data`)
- **Bandwidth**: 100GB included; overage $0.10/GB

## Next Steps
- Add persistent disk for `/app/data` (Render Disks) to survive container restarts
- Integrate external log sink (Loki, Datadog) for long-term retention
- Set up monitoring alerts (Render Notifications or webhooks)
- Enable auto-deploy previews for PRs
