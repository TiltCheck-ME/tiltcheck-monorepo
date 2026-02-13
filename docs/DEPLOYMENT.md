# TiltCheck Deployment Guide

Complete guide for deploying the TiltCheck ecosystem with Discord integration.

> 📦 **Quick Start:** For one-command deployment of all services, see [ONE-LAUNCH-DEPLOYMENT.md](./ONE-LAUNCH-DEPLOYMENT.md)
> 
> 🚂 **Railway Production:** For production deployment to Railway with full monitoring, see [docs/RAILWAY-DEPLOYMENT-GUIDE.md](./docs/RAILWAY-DEPLOYMENT-GUIDE.md)
> 
> ✅ **Production Checklist:** For comprehensive deployment verification, see [docs/PRODUCTION-DEPLOYMENT-CHECKLIST.md](./docs/PRODUCTION-DEPLOYMENT-CHECKLIST.md)

---

## Deployment Options

Choose the deployment strategy that fits your needs:

### 1. Railway (Recommended for Production)

**Best for:** Full production deployment with monitoring

- **[Railway Deployment Guide](./docs/RAILWAY-DEPLOYMENT-GUIDE.md)** - Complete Railway setup
- **[AI Gateway Production](./docs/AI-GATEWAY-PRODUCTION.md)** - OpenAI integration guide
- **[Trust Rollup Production](./docs/TRUST-ROLLUP-PRODUCTION.md)** - Real data integration
- **[Production Checklist](./docs/PRODUCTION-DEPLOYMENT-CHECKLIST.md)** - Deployment verification

**Deployment:**
```bash
railway login
railway link
railway variables set DISCORD_TOKEN="your_token"
railway up
bash scripts/verify-railway-deployment.sh
```

### 2. Docker Compose (Quick Local/Staging)

**Best for:** Local development, staging, or self-hosted

See [ONE-LAUNCH-DEPLOYMENT.md](./ONE-LAUNCH-DEPLOYMENT.md) for details.

### 3. Split Deployment (Advanced)

**Best for:** Optimized performance with CDN static hosting

Details below in this document.

---

## Deployment Architecture

TiltCheck uses a **hybrid deployment** for optimal performance:

| Component | Type | Why | Recommended Host |
|-----------|------|-----|------------------|
| Landing page (`services/landing`) | Static | Marketing pages, instant loading | Vercel, Netlify, Cloudflare Pages |
| Dashboard (`apps/dashboard`) | Next.js SSR | User auth, interactive tools | Railway, Render |
| Game Arena (`services/game-arena`) | Node.js | Real-time games (DA&D, poker) | Railway, Render |
| Discord Bot (`apps/discord-bot`) | Node.js | Always-on bot | Railway, Render |
| API Services | Node.js | Backend APIs | Railway, Render |

### Why Split Deployment?

- **Landing page** = Static HTML/CSS/JS → Deploy to CDN for **instant** page loads (0ms cold start)
- **Dashboard/Games** = Need server for auth, database, real-time → Deploy to web service

---

## Quick Deploy: Landing Page (Instant Loading)

The marketing landing page at `services/landing/public` is static and loads instantly when deployed to a CDN:

### Option 1: Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy (uses vercel.json config automatically)
vercel --prod
```

### Option 2: Netlify
```bash
# Install Netlify CLI  
npm i -g netlify-cli

# Deploy
netlify deploy --prod --dir=services/landing/public
```

### Option 3: Cloudflare Pages
1. Connect your GitHub repo to Cloudflare Pages
2. Set build output directory: `services/landing/public`
3. No build command needed

---

## Quick Deploy: Dashboard & App Services

For the interactive parts (user accounts, games, tools), you need a server:

### Option 1: Render Blueprint (Easiest)
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New" → "Blueprint"
3. Connect this repo - it will use `render.yaml` automatically
4. This deploys both the static landing AND the dynamic services

### Option 2: Railway
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway up
```

> ⚠️ **Cold Start Warning:** Railway's free tier may experience brief delays during startup. For production, use a paid plan ($5/month minimum).

---

## Prerequisites

- Node.js 18+ and pnpm
- Discord account with developer access
- (Optional) PostgreSQL database for persistence
- (Optional) Solana RPC endpoint for blockchain features

---

## 1. Initial Setup

### Clone and Install
```bash
git clone https://github.com/jmenichole/tiltcheck-monorepo.git
cd tiltcheck-monorepo
pnpm install
pnpm run build
```

### Run Tests
```bash
pnpm test
```

---

## 2. Discord Bot Configuration

### A. Create Discord Application
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Name it "TiltCheck" and create
4. Go to "Bot" tab → "Add Bot"
5. Copy the **Bot Token** (keep this secret!)
6. Go to "OAuth2" → "General"
7. Copy the **Client ID**

### B. Invite Bot to Server
1. OAuth2 → URL Generator
2. Scopes: `bot`, `applications.commands`
3. Bot Permissions: `Send Messages`, `Embed Links`, `Use Slash Commands`
4. Copy generated URL and open in browser
5. Select your server and authorize

### C. Get Server ID
1. In Discord, enable Developer Mode (User Settings → Advanced → Developer Mode)
2. Right-click your server → "Copy Server ID"

### D. Configure Bot Environment
```bash
cd apps/discord-bot
cp .env.example .env
```

Edit `.env`:
```bash
DISCORD_TOKEN=your_bot_token_from_step_A5
DISCORD_CLIENT_ID=your_client_id_from_step_A7
DISCORD_GUILD_ID=your_server_id_from_step_C
DASHBOARD_URL=http://localhost:5055
```

---

## 3. Dashboard Service Configuration

### A. Create Discord Webhook (Optional - for alerts)
1. Discord Server Settings → Integrations → Webhooks
2. Click "New Webhook"
3. Name it "TiltCheck Alerts"
4. Select channel for alerts (e.g., `#trust-alerts`)
5. Copy Webhook URL

### B. Configure Dashboard Environment
```bash
cd services/dashboard
cp .env.example .env
```

Edit `.env`:
```bash
PORT=5055
DASHBOARD_POLL_MS=30000
DASHBOARD_EVENTS_KEEP_DAYS=7
DISCORD_WEBHOOK_URL=your_webhook_url_from_step_A5
```

---

## 4. Start Services

### Development Mode (Local Testing)

**Terminal 1 - Dashboard:**
```bash
pnpm --filter @tiltcheck/dashboard dev
```

**Terminal 2 - Discord Bot:**
```bash
pnpm --filter discord-bot dev
```

**Terminal 3 - Trust Rollup Service (optional):**
```bash
pnpm --filter @tiltcheck/trust-rollup dev
```

### Production Mode

```bash
# Build all packages
pnpm run build

# Start dashboard
pnpm --filter @tiltcheck/dashboard start

# Start bot (in separate process/container)
pnpm --filter discord-bot start
```

---

## 5. Verify Deployment

### Test Discord Bot
In your Discord server:
```
/ping
```
Should respond with latency.

```
/trust dashboard
```
Should show live metrics if dashboard is running.

### Test Dashboard Alerts
1. Visit `http://localhost:5055` in browser
2. Manually trigger a test alert via API:
```bash
curl -X POST http://localhost:5055/api/request-snapshot
```
3. Check Discord channel for webhook alerts

### Test Trust Flow
```
/scan https://example.com
```
Should scan URL and emit trust events to dashboard.

---

## 6. Production Deployment Options

### Option A: Starlight™ Hyperlift (Easy Deployment)

Deploy directly from GitHub with no DevOps setup required using [Starlight Hyperlift](https://www.spaceship.com/starlight-cloud/hyperlift/).

**Prerequisites:**
- GitHub repository connected to Hyperlift Manager
- Hyperlift account on [spaceship.com](https://www.spaceship.com)

**Quick Deployment Steps:**

1. **Connect GitHub to Hyperlift**
   - Go to Hyperlift Manager dashboard
   - Connect your GitHub account
   - Select the `jmenichole/tiltcheck-monorepo` repository

2. **Configure Build Settings**
   - Dockerfile path: `Dockerfile` (for full monorepo) or service-specific:
     - Dashboard: `services/dashboard/Dockerfile`
     - Discord Bot: `apps/discord-bot/Dockerfile`
     - Landing: `services/landing/Dockerfile`
   - Branch: `main`

3. **Set Environment Variables** (in Hyperlift Manager):
   ```
   PORT=8080
   NODE_ENV=production
   DISCORD_TOKEN=your_bot_token
   DISCORD_CLIENT_ID=your_client_id
   DISCORD_GUILD_ID=your_server_id
   ```

4. **Deploy**
   - Enable automatic builds on push (optional)
   - Click "Build & Deploy"

**Port Configuration:**
- Default Hyperlift port: `8080`
- Configure via environment variable, not Dockerfile `EXPOSE`

**Multi-Service Deployment:**
For the full TiltCheck ecosystem, deploy each service separately:

| Service | Dockerfile Path | Default Port |
|---------|-----------------|--------------|
| Dashboard | `services/dashboard/Dockerfile` | 5055 |
| Discord Bot | `apps/discord-bot/Dockerfile` | 8081 |
| Landing Page | `services/landing/Dockerfile` | 8080 |
| Trust Rollup | `services/trust-rollup/Dockerfile` | 8082 |

See [HYPERLIFT.md](./HYPERLIFT.md) for detailed Starlight Hyperlift deployment guide.

### Option B: Docker Compose (Self-Hosted)

See [DOCKER.md](./DOCKER.md) for detailed Docker deployment guide.

Quick start:
```bash
# Copy environment template
cp .env.docker.example .env

# Edit .env with your Discord credentials
nano .env

# Build and start all services
docker-compose up -d

# Check status
docker-compose ps
docker-compose logs -f
```

Configuration via `.env` file:
```bash
DISCORD_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id
DISCORD_WEBHOOK_URL=your_webhook_url
DASHBOARD_EVENTS_KEEP_DAYS=14
```

### Option B: PM2 (Node Process Manager)

```bash
# Install PM2
npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'dashboard',
      cwd: './services/dashboard',
      script: 'dist/server.js',
      env: {
        PORT: 5055,
        NODE_ENV: 'production'
      }
    },
    {
      name: 'discord-bot',
      cwd: './apps/discord-bot',
      script: 'dist/index.js',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
EOF

# Start all services
pm2 start ecosystem.config.js

# Save and auto-restart on reboot
pm2 save
pm2 startup
```

### Option C: Systemd Services

Create `/etc/systemd/system/tiltcheck-dashboard.service`:
```ini
[Unit]
Description=TiltCheck Dashboard
After=network.target

[Service]
Type=simple
User=tiltcheck
WorkingDirectory=/opt/tiltcheck/services/dashboard
Environment="PORT=5055"
Environment="NODE_ENV=production"
ExecStart=/usr/bin/node dist/server.js
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable tiltcheck-dashboard
sudo systemctl start tiltcheck-dashboard
sudo systemctl status tiltcheck-dashboard
```

---

## 7. Monitoring & Maintenance

### Health Checks
```bash
# Dashboard health
curl http://localhost:5055/api/health

# View metrics
curl http://localhost:5055/api/config
```

### Log Management
```bash
# PM2 logs
pm2 logs dashboard
pm2 logs discord-bot

# Docker logs
docker-compose logs -f dashboard

# Systemd logs
journalctl -u tiltcheck-dashboard -f
```

### Database Maintenance
```bash
# Prune old event files (runs automatically, but can trigger manually)
find ./data/events -name "trust-events-*.json" -mtime +7 -delete
```

---

## 8. Environment Variables Reference

### Dashboard Service
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `5055` | HTTP server port |
| `DASHBOARD_POLL_MS` | No | `30000` | Snapshot poll interval (ms) |
| `DASHBOARD_EVENTS_KEEP_DAYS` | No | `7` | Event retention days |
| `DISCORD_WEBHOOK_URL` | No | - | Discord webhook for alerts |
| `NODE_ENV` | No | `development` | Environment mode |

### Discord Bot
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DISCORD_TOKEN` | **Yes** | - | Bot token from Discord |
| `DISCORD_CLIENT_ID` | **Yes** | - | Application client ID |
| `DISCORD_GUILD_ID` | No | - | Guild ID for dev commands |
| `DASHBOARD_URL` | No | `http://localhost:5055` | Dashboard API URL |
| `COMMAND_PREFIX` | No | `!` | Legacy command prefix |
| `SUSLINK_AUTO_SCAN` | No | `true` | Auto-scan links in messages |
| `TRUST_THRESHOLD` | No | `60` | Minimum trust score |

---

## 9. Troubleshooting

### Bot Not Responding
- Verify bot is online in Discord server members list
- Check `DISCORD_TOKEN` is correct
- Ensure bot has proper permissions in channel
- Check logs: `pm2 logs discord-bot` or `docker-compose logs discord-bot`

### Dashboard 404 Errors
- Verify service is running: `curl http://localhost:5055/api/health`
- Check firewall rules if accessing remotely
- Verify `DASHBOARD_URL` in bot `.env` matches actual URL

### Alerts Not Sending
- Verify `DISCORD_WEBHOOK_URL` is set in dashboard `.env`
- Test webhook manually:
```bash
curl -X POST "YOUR_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"content":"Test alert"}'
```
- Check webhook channel permissions

### Trust Events Not Flowing
- Verify EventRouter is initialized: check startup logs
- Ensure trust-rollup service is running
- Check data directory permissions
- Run test suite: `pnpm test`

---

## 10. Security Best Practices

1. **Never commit `.env` files** - Use `.env.example` templates only
2. **Rotate Discord tokens** periodically via Developer Portal
3. **Restrict webhook URLs** - Keep them secret, they're like passwords
4. **Use environment secrets** in production (e.g., GitHub Secrets, AWS Secrets Manager)
5. **Enable rate limiting** on dashboard endpoints if exposing publicly
6. **Run services as non-root user** in production
7. **Use HTTPS/TLS** for production deployments (nginx reverse proxy recommended)

---

## 11. Scaling Considerations

### High Traffic Scenarios
- Use Redis for shared state across multiple dashboard instances
- Implement queue-based processing for webhook delivery (e.g., Bull/BullMQ)
- Add CDN for static dashboard assets
- Use read replicas for trust score snapshots

### Multi-Server Bot Deployment
- Share event router via message broker (RabbitMQ, Redis Pub/Sub)
- Use shared database for trust scores and user data
- Implement service discovery for dashboard endpoints

---

## Support

For issues or questions:
- GitHub Issues: https://github.com/jmenichole/tiltcheck-monorepo/issues
- Documentation: `/docs/tiltcheck/`
- Discord: (Add your community Discord server invite)

---

**TiltCheck Ecosystem © 2024–2025 jmenichole**
