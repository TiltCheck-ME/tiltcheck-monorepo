# Render Deployment Guide

## Overview
This repository uses a **unified container** approach for Render deployment. All services (Nginx reverse proxy, landing, dashboard) run in a single container orchestrated by `supervisord`.

**Note**: Discord bot and trust-rollup services are disabled by default (require additional dependencies). This web-only deployment includes landing pages + dashboard API.

## Quick Deploy

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://api.render.com/deploy/srv-d4fd8o8dl3ps73csbk0g?key=TcUjS-BJrdo)

Click the button above to deploy directly, or use the manual steps below.

---

## Prerequisites
1. Render account (free tier works initially).
2. GitHub repo connected to Render.
3. Environment variables configured (see below).

## Deployment Steps

### 1. Create New Web Service (Manual)
- Dashboard → **New** → **Web Service**
- Connect your GitHub repo: `jmenichole/tiltcheck-monorepo`
- **Name**: `tiltcheck-unified` (or your choice)
- **Region**: Choose closest to your users (US West/East recommended)
- **Branch**: `main`
- **Root Directory**: Leave blank (uses repo root)
- **Runtime**: Docker
- **Dockerfile Path**: `Dockerfile.render` (without `./` prefix)

### 2. Configure Build & Deploy Settings
- **Build Command**: (leave empty; Docker handles build)
- **Start Command**: (leave empty; Dockerfile CMD uses supervisord)
- **Health Check Path**: `/proxy-health`
- **Instance Type**: Starter (512MB) or Standard (2GB recommended for production)

**Direct Deploy URL**: `https://api.render.com/deploy/srv-d4fd8o8dl3ps73csbk0g?key=TcUjS-BJrdo`

### 3. Environment Variables
Add these in Render dashboard under **Environment**:

**Required for Web-Only Deployment**:
```
NODE_ENV=production
```

**Optional (Dashboard Configuration)**:
```
DASHBOARD_POLL_MS=30000
DASHBOARD_EVENTS_KEEP_DAYS=7
```

**Discord Bot** (currently disabled; re-enable after fixing dependencies):
```
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id
DISCORD_GUILD_ID=your_guild_id (optional for guild commands)
SUSLINK_AUTO_SCAN=true
TRUST_THRESHOLD=60
```

**Solana / JustTheTip** (if bot enabled):
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
- Click **Create Web Service** (or use deploy button at top)
- Render will:
  1. Build Docker image from `Dockerfile.render`
  2. Start container with `supervisord` orchestrating processes (Nginx, landing, dashboard)
  3. Health check `/proxy-health` every 30s
  4. Auto-redeploy on GitHub pushes to `main`

### 6. Verify Deployment
Once live, test endpoints:
```bash
curl https://tiltcheck.it.com/proxy-health
# Expected: {"status":"ok","proxy":"nginx","render":true}

curl https://tiltcheck.it.com/
# Expected: Landing page HTML

curl https://tiltcheck.it.com/api/health
# Expected: {"lastSnapshotTs":null,...}
```

## Process Architecture
`supervisord` orchestrates three processes (web-only deployment):
- **nginx**: Reverse proxy (listens on port 8080 internally, Render maps to external port)
- **landing**: Express server (port 3000 internal, serves marketing pages + metrics)
- **dashboard**: Dashboard API (port 5055 internal, events + health endpoints)

**Disabled** (can re-enable after adding dependencies):
- **bot**: Discord bot (needs `@solana/web3.js`, trust-engines build)
- **rollup**: Trust rollup service (needs additional workspace builds)

All services communicate via localhost; Nginx is the sole external entry point.

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
- Render maps container port 8080 to external dynamic port automatically
- Test locally: `docker build -f Dockerfile.render -t tiltcheck-render . && docker run -p 8888:8080 tiltcheck-render`
- Verify `/proxy-health` returns `{"status":"ok","proxy":"nginx","render":true}`

### Discord Bot Not Connecting
- Verify `DISCORD_TOKEN` is correct
- Check bot has required intents enabled in Discord Developer Portal
- Inspect logs for connection errors

### Dashboard 404
- Ensure dashboard built successfully (`pnpm run build` in build logs)
- Check `services/dashboard/dist/server.js` exists in image (not `index.js`)
- Verify dashboard process started (supervisord logs show all processes)
- Dashboard API is at `/api/*` routes, not `/dashboard/` (static UI not included)

## Local Testing
Test the unified container locally:
```bash
# Build
docker build -f Dockerfile.render -t tiltcheck-render .

# Run (minimal web-only config)
docker run -d --name tiltcheck-test -p 8888:8080 tiltcheck-render

# Test endpoints
curl http://localhost:8888/proxy-health
# Expected: {"status":"ok","proxy":"nginx","render":true}

curl http://localhost:8888/api/health
# Expected: {"lastSnapshotTs":null,...}

curl http://localhost:8888/
# Expected: Landing page HTML

# Clean up
docker rm -f tiltcheck-test
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

## Re-enabling Discord Bot & Rollup

The bot and rollup services are disabled to avoid build failures. To re-enable:

1. **Add Missing Dependencies**:
   ```bash
   # In apps/discord-bot/package.json, add:
   "@solana/web3.js": "^1.95.0",
   "@tiltcheck/trust-engines": "workspace:*"
   ```

2. **Build Trust Engines**:
   ```dockerfile
   # In Dockerfile.render, add before dashboard build:
   cd /app/services/trust-engines && pnpm run build && \
   ```

3. **Uncomment in supervisord.conf**:
   ```ini
   [program:bot]
   command=/usr/local/bin/node /app/apps/discord-bot/dist/index.js
   ...
   
   [program:rollup]
   command=/usr/local/bin/node /app/services/trust-rollup/dist/server.js
   ...
   ```

4. **Rebuild & Redeploy**:
   ```bash
   git add -A
   git commit -m "Enable bot + rollup services"
   git push origin main
   ```

## Next Steps
- Add persistent disk for `/app/data` (Render Disks) to survive container restarts
- Integrate external log sink (Loki, Datadog) for long-term retention
- Set up monitoring alerts (Render Notifications or webhooks)
- Enable auto-deploy previews for PRs
- Complete bot dependency fixes and re-enable Discord commands
