# TiltCheck Deployment with Starlight™ Hyperlift

Deploy TiltCheck containerized apps directly from GitHub with [Starlight™ Hyperlift](https://www.spaceship.com/starlight-cloud/hyperlift/) — no DevOps or infrastructure setup required.

> 📋 **For a complete list of ALL environment variables**, see **[SPACESHIP-DEPLOYMENT-ENV.md](./SPACESHIP-DEPLOYMENT-ENV.md)**

---

## Overview

Starlight Hyperlift provides:
- **Real-time container deployment** from GitHub
- **Automatic builds** on git push
- **Zero infrastructure management**
- **Environment variable configuration** via web dashboard

---

## Prerequisites

1. **Hyperlift Account**: Sign up at [spaceship.com](https://www.spaceship.com)
2. **GitHub Repository**: Fork or clone `jmenichole/tiltcheck-monorepo`
3. **Discord Bot Credentials**: From [Discord Developer Portal](https://discord.com/developers/applications)

---

## Quick Start

### 1. Connect GitHub to Hyperlift

1. Log in to [Hyperlift Manager](https://www.spaceship.com)
2. Navigate to **Hyperlift** → **Connect GitHub**
3. Authorize Hyperlift to access your GitHub repositories
4. Select the `tiltcheck-monorepo` repository

### 2. Create New Application

1. Click **New App**
2. Select your connected GitHub repository
3. Choose branch: `main`
4. Configure Dockerfile path (see table below)

### 3. Configure Environment Variables

In the Hyperlift Manager dashboard, add these environment variables:

#### Required for Discord Bot
```
DISCORD_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id
DISCORD_GUILD_ID=your_server_id
```

#### Required for Dashboard
```
PORT=8080
NODE_ENV=production
DASHBOARD_POLL_MS=30000
DASHBOARD_EVENTS_KEEP_DAYS=7
```

#### Optional
```
DISCORD_WEBHOOK_URL=your_webhook_url
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
```

### 4. Deploy

1. Click **Build & Deploy**
2. Wait for build to complete (typically 2-5 minutes)
3. Access your app at the provided Hyperlift URL

---

## Service Dockerfiles

### Unified Deployment (Recommended for Hyperlift)

For a single container with all web services:

| Service | Dockerfile Path | Description | Port |
|---------|-----------------|-------------|------|
| **🚀 Unified (All-in-One)** | `Dockerfile.unified` | Landing + Dashboard + nginx proxy | 8080 |

This is the recommended option for Hyperlift Manager - deploys everything in one container.

### Individual Services

Deploy each TiltCheck service separately:

| Service | Dockerfile Path | Description | Port |
|---------|-----------------|-------------|------|
| **Full Monorepo** | `Dockerfile` | All services bundled | 3000 |
| **Dashboard** | `services/dashboard/Dockerfile` | Trust dashboard API | 5055 |
| **Discord Bot** | `apps/discord-bot/Dockerfile` | Main TiltCheck bot | 8081 |
| **Landing Page** | `services/landing/Dockerfile` | Marketing/info site | 8080 |
| **Trust Rollup** | `services/trust-rollup/Dockerfile` | Trust aggregation | 8082 |
| **AI Gateway** | `services/ai-gateway/Dockerfile` | AI processing | 3001 |

---

## Port Configuration

**Important**: Hyperlift uses port `8080` by default. Configure your app port via environment variables, not Dockerfile `EXPOSE`.

```
PORT=8080
```

The Dockerfiles are configured to respect the `PORT` environment variable.

---

## Automatic Builds

Enable automatic deployments on every git push:

1. In Hyperlift Manager, go to your app settings
2. Enable **Auto-build on push**
3. Select the branch to monitor (e.g., `main`)

Every push to the selected branch will trigger a new build and deployment.

---

## Multi-Service Architecture

For the complete TiltCheck ecosystem, deploy services as separate Hyperlift apps:

### Recommended Setup

1. **tiltcheck-dashboard** (services/dashboard/Dockerfile)
   - Environment: `PORT=8080`
   - Primary API for trust metrics

2. **tiltcheck-bot** (apps/discord-bot/Dockerfile)
   - Environment: `PORT=8080`, `DASHBOARD_URL=https://your-dashboard.hyperlift.app`
   - Connects to dashboard via URL

3. **tiltcheck-landing** (services/landing/Dockerfile)
   - Environment: `PORT=8080`
   - Public-facing website

### Service Communication

Configure service URLs in environment variables:
```
DASHBOARD_URL=https://tiltcheck-dashboard.hyperlift.app
AI_GATEWAY_URL=https://tiltcheck-ai.hyperlift.app
```

---

## Environment Variables Reference

### Discord Bot
| Variable | Required | Description |
|----------|----------|-------------|
| `DISCORD_TOKEN` | ✅ | Bot token from Discord Developer Portal |
| `DISCORD_CLIENT_ID` | ✅ | Application client ID |
| `DISCORD_GUILD_ID` | ⚠️ | Guild ID for dev commands (optional in prod) |
| `DASHBOARD_URL` | ⚠️ | URL to dashboard service |

### Dashboard
| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | ✅ | HTTP port (use 8080 for Hyperlift) |
| `NODE_ENV` | ✅ | Set to `production` |
| `DASHBOARD_POLL_MS` | ❌ | Snapshot interval (default: 30000) |
| `DISCORD_WEBHOOK_URL` | ❌ | Webhook for alerts |

### Database (Optional)
| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | ❌ | Supabase project URL |
| `SUPABASE_ANON_KEY` | ❌ | Supabase anonymous key |
| `DATABASE_URL` | ❌ | PostgreSQL connection string |

---

## Troubleshooting

### Build Fails
- Check Dockerfile path is correct
- Verify all dependencies are in `package.json`
- Review build logs in Hyperlift Manager

### App Not Responding
- Verify `PORT=8080` environment variable is set
- Check app logs in Hyperlift dashboard
- Ensure health check endpoint responds: `GET /api/health`

### Environment Variables Not Working
- Double-check variable names (case-sensitive)
- Rebuild after adding new variables
- Verify no trailing spaces in values

### Connection Between Services
- Use full HTTPS URLs for service communication
- Verify target service is deployed and healthy
- Check CORS settings if calling from browser

---

## Monitoring

### Health Checks
Each TiltCheck service exposes health endpoints:
- Dashboard: `GET /api/health`
- Discord Bot: Built-in Discord connection status
- Landing: `GET /health`

### Logs
View real-time logs in Hyperlift Manager:
1. Go to your app
2. Click **Logs** tab
3. Monitor build and runtime logs

---

## Cost Optimization

- Use **manual builds** for development branches
- Enable **auto-builds** only for production branches
- Consider consolidating services if traffic is low

---

## Security Best Practices

1. **Never expose secrets** in Dockerfile or git history
2. **Use Hyperlift's environment variables** for all sensitive data
3. **Rotate Discord tokens** periodically
4. **Enable HTTPS** (provided by Hyperlift automatically)
5. **Restrict CORS** to known domains in production

---

## Resources

- [Hyperlift Documentation](https://www.spaceship.com/knowledgebase/category/starlight-hyperlift-help-articles/)
- [Connect GitHub to Hyperlift](https://www.spaceship.com/knowledgebase/connect-github-to-starlight-hyperlift/)
- [Deploy from Dockerfile](https://www.spaceship.com/knowledgebase/hyperlift-deploy-app-github-dockerfile/)
- [TiltCheck GitHub Repository](https://github.com/jmenichole/tiltcheck-monorepo)

---

**TiltCheck Ecosystem © 2024–2025 jmenichole**
