# Separate Starlight™ Hyperlift Instances

This document lists the recommended subdomain and Dockerfile path for deploying separate Hyperlift instances of the TiltCheck ecosystem.

## ✅ Is this viable?

**Yes!** The TiltCheck monorepo is designed for multi-instance deployment. Each service has its own Dockerfile optimized for containerized deployment. You can run each as a separate Hyperlift app with its own subdomain.

---

## Instance Reference Table

| Subdomain | Service | Dockerfile Path | Description | Default Port | Size |
|-----------|---------|-----------------|-------------|--------------|------|
| `tiltcheck.me` | Landing Page | `services/landing/Dockerfile` | Main marketing/info site | 8080 | xsm |
| `dashboard.tiltcheck.me` | Trust Dashboard | `services/dashboard/Dockerfile` | Trust metrics analytics API | 5055 → 8080 | sm |
| `bot.tiltcheck.me` | Discord Bot (apps) | `apps/discord-bot/Dockerfile` | Main TiltCheck Discord bot | worker (no port) | xsm |
| `justthetip.tiltcheck.me` | Discord Bot (bot) | `bot/Dockerfile` | Alternate bot with game modules | worker (no port) | xsm |
| `api.tiltcheck.me` | Backend API | `backend/Dockerfile` | Backend REST API | 7071 → 8080 | sm |
| `app.tiltcheck.me` | Frontend | `frontend/Dockerfile` | Web application frontend | 3000 → 8080 | sm |
| `trust.tiltcheck.me` | Trust Rollup | `services/trust-rollup/Dockerfile` | Trust score aggregation | 8082 → 8080 | xsm |
| `ai.tiltcheck.me` | AI Gateway | `services/ai-gateway/Dockerfile` | AI processing service | 8080 | sm |

---

## Unified Deployment Option

If you prefer a single container with Landing + Dashboard + nginx proxy:

| Subdomain | Service | Dockerfile Path | Description | Port |
|-----------|---------|-----------------|-------------|------|
| `tiltcheck.me` | Unified (All-in-One) | `Dockerfile.unified` | Landing + Dashboard + nginx proxy | 8080 |

---

## Discord Bot Instances

You can run multiple Discord bot instances for different purposes:

### Option A: Full-featured bot (`apps/discord-bot`)
- **Dockerfile:** `apps/discord-bot/Dockerfile`
- **Subdomain:** `bot.tiltcheck.me` (worker, no HTTP needed)
- **Size:** xsm (256MB RAM)
- **Features:** Complete TiltCheck bot with all modules

### Option B: Game-focused bot (`bot/`)
- **Dockerfile:** `bot/Dockerfile`
- **Subdomain:** `justthetip.tiltcheck.me` (worker, no HTTP needed)
- **Size:** xsm (256MB RAM)
- **Features:** Game-focused bot with poker, dad jokes, and gambling modules

---

## Environment Variables Per Instance

### Discord Bots (apps/discord-bot or bot/)
```env
DISCORD_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id
DISCORD_GUILD_ID=your_server_id
DASHBOARD_URL=https://dashboard.tiltcheck.me
NODE_ENV=production
```

### Dashboard
```env
PORT=8080
NODE_ENV=production
DASHBOARD_POLL_MS=30000
DASHBOARD_EVENTS_KEEP_DAYS=7
DISCORD_WEBHOOK_URL=your_webhook_url
```

### Landing
```env
PORT=8080
NODE_ENV=production
```

### Backend API
```env
PORT=8080
NODE_ENV=production
MONGODB_URI=your_mongodb_uri
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
```

### Frontend
```env
PORT=8080
NODE_ENV=production
API_URL=https://api.tiltcheck.me
WS_URL=wss://api.tiltcheck.me
```

### Trust Rollup
```env
PORT=8080
NODE_ENV=production
```

### AI Gateway
```env
PORT=8080
NODE_ENV=production
```

---

## Setup Steps for Each Instance

1. **Create New App in Hyperlift Manager**
   - Log in to [Hyperlift Manager](https://www.spaceship.com)
   - Click **New App**
   - Select the `jmenichole/tiltcheck-monorepo` repository

2. **Configure Dockerfile Path**
   - Use the Dockerfile path from the table above
   - Branch: `main`

3. **Set Environment Variables**
   - Add the required environment variables for that service
   - Important: Set `PORT=8080` (Hyperlift default)

4. **Configure Custom Domain (Optional)**
   - In app settings, add your subdomain
   - Configure DNS to point to Hyperlift

5. **Deploy**
   - Click **Build & Deploy**
   - Enable auto-deploy for the `main` branch if desired

---

## Service Communication

Configure inter-service communication via environment variables:

```env
# In Discord Bot
DASHBOARD_URL=https://dashboard.tiltcheck.me

# In Frontend
API_URL=https://api.tiltcheck.me

# In Trust Rollup
DASHBOARD_URL=https://dashboard.tiltcheck.me
```

---

## Notes

- **Port Configuration:** All services should use `PORT=8080` for Hyperlift compatibility
- **Worker Services:** Discord bots are worker-type services (no HTTP port exposed)
- **Size Recommendations:** 
  - `xsm`: Discord bots, landing page, trust rollup
  - `sm`: Dashboard, backend API, frontend, AI gateway
- **Auto-builds:** Enable on `main` branch for production deployments

---

**TiltCheck Ecosystem © 2024–2025 jmenichole**
