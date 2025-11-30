# Separate Starlight™ Hyperlift Instances

This document lists the recommended subdomain and Dockerfile path for deploying separate Hyperlift instances of the TiltCheck ecosystem.

## ✅ Is this viable?

**Yes!** The TiltCheck monorepo is designed for multi-instance deployment. You can consolidate services to minimize the number of deployments.

---

## 🎯 How Many Instances Do You Need?

### ⭐ Recommended: 3 Instances

The recommended setup uses **3 instances**:

| # | Subdomain | Dockerfile Path | Size | What's Included |
|---|-----------|-----------------|------|-----------------|
| 1 | `tiltcheck.me` | `Dockerfile.unified` | sm | Website + Dashboard + Trust Engine (combined) |
| 2 | `api.tiltcheck.me` | `backend/Dockerfile` | sm | Backend API |
| 3 | `justthetip.tiltcheck.me` | `bot/Dockerfile` | xsm | Discord Bots |

**Routes on tiltcheck.me:**
- `/` → Landing page (website)
- `/dashboard/` → Trust dashboard
- `/api/*` → Dashboard API (trust engine)

---

### 2 Instances (Minimal)

If you don't need a separate API:

| # | Subdomain | Dockerfile Path | Size | What's Included |
|---|-----------|-----------------|------|-----------------|
| 1 | `tiltcheck.me` | `Dockerfile.unified` | sm | Website + Dashboard + Trust Engine |
| 2 | `justthetip.tiltcheck.me` | `bot/Dockerfile` | xsm | Discord Bots |

---

### 4 Instances (With Frontend App)

If you need the frontend web app separate:

| # | Subdomain | Dockerfile Path | Size | What's Included |
|---|-----------|-----------------|------|-----------------|
| 1 | `tiltcheck.me` | `Dockerfile.unified` | sm | Website + Dashboard + Trust Engine |
| 2 | `api.tiltcheck.me` | `backend/Dockerfile` | sm | Backend API |
| 3 | `app.tiltcheck.me` | `frontend/Dockerfile` | sm | Web frontend app |
| 4 | `justthetip.tiltcheck.me` | `bot/Dockerfile` | xsm | Discord Bots |

---

## 📦 What Each Dockerfile Combines

| Dockerfile | Services Included | Use When |
|------------|-------------------|----------|
| `Dockerfile.unified` | Landing + Dashboard + nginx proxy | You want 1 container for all web services |
| `Dockerfile` | Full monorepo (all services) | You want everything in 1 container |
| `bot/Dockerfile` | Discord bot + all game modules | You need the Discord bot |
| `apps/discord-bot/Dockerfile` | Discord bot (alternate) | Alternative bot setup |

---

## 🔧 Quick Reference: Subdomain → Dockerfile

| Subdomain | Dockerfile Path | Size | Purpose |
|-----------|-----------------|------|---------|
| `tiltcheck.me` | `Dockerfile.unified` | sm | Landing + Dashboard combined |
| `tiltcheck.me` | `services/landing/Dockerfile` | xsm | Landing only |
| `dashboard.tiltcheck.me` | `services/dashboard/Dockerfile` | sm | Dashboard only |
| `justthetip.tiltcheck.me` | `bot/Dockerfile` | xsm | Discord Bot |
| `api.tiltcheck.me` | `backend/Dockerfile` | sm | Backend API |
| `app.tiltcheck.me` | `frontend/Dockerfile` | sm | Web frontend |
| `trust.tiltcheck.me` | `services/trust-rollup/Dockerfile` | xsm | Trust aggregation |
| `ai.tiltcheck.me` | `services/ai-gateway/Dockerfile` | sm | AI processing |

---

## Environment Variables

### For `Dockerfile.unified` (tiltcheck.me)
```env
PORT=8080
NODE_ENV=production
DASHBOARD_POLL_MS=30000
DASHBOARD_EVENTS_KEEP_DAYS=7
DISCORD_WEBHOOK_URL=your_webhook_url
```

### For Discord Bot (justthetip.tiltcheck.me)
```env
DISCORD_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id
DISCORD_GUILD_ID=your_server_id
DASHBOARD_URL=https://tiltcheck.me
NODE_ENV=production
```

### For Backend API (api.tiltcheck.me)
```env
PORT=8080
NODE_ENV=production
MONGODB_URI=your_mongodb_uri
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
```

### For Frontend (app.tiltcheck.me)
```env
PORT=8080
NODE_ENV=production
API_URL=https://api.tiltcheck.me
WS_URL=wss://api.tiltcheck.me
```

---

## Setup Steps

1. **Create New App** in [Hyperlift Manager](https://www.spaceship.com)
2. **Select Repository:** `jmenichole/tiltcheck-monorepo`
3. **Set Dockerfile Path** from the table above
4. **Add Environment Variables** for that service
5. **Set `PORT=8080`** (required for Hyperlift)
6. **Deploy** and configure your custom subdomain

---

## Notes

- **Worker Services:** Discord bots don't need HTTP ports (background workers)
- **Size Guide:** `xsm` = 256MB RAM, `sm` = 512MB RAM
- **Auto-builds:** Enable on `main` branch for automatic deployments

---

**TiltCheck Ecosystem © 2024–2025 jmenichole**
