# Production Deployment: Where Everything Runs

## 🚀 Current Production Deployment

| Component | Port | Host | Status | URL |
|-----------|------|------|--------|-----|
| **Discord Bot** | 8081 | Railway | ✅ Running | Internal |
| **API / Backend** | 3000+ | Railway | ✅ Running | https://api.tiltcheck.me |
| **Dashboard** | 3001+ | Railway | ✅ Running | https://tiltcheck.me |
| **Landing Page** | 3000 | Vercel/GitHub Pages | ✅ Deployed | https://tiltcheck.me |
| **AI Gateway** | 8000 | Railway | ✅ Running | https://ai.tiltcheck.me |
| **Trust Rollup** | 8083 | Railway | ✅ Running | Internal |

---

## 📍 Services & Where They Run

### 1. Discord Bot (`apps/discord-bot`)
**Port:** `8081` (health check endpoint)  
**Environment:** Railway  
**Status:** Always-on Node.js process  
**Entry Point:** `apps/discord-bot/dist/index.js`

**What it does:**
- Listens for Discord messages and commands
- Posts alerts to configured channels
- Manages wallets and tips
- Scans links in real-time

**Start command (local):**
```bash
DISCORD_BOT_HEALTH_PORT=9081 pnpm --filter @tiltcheck/discord-bot dev
```

**Production (Railway):**
```
Procfile: discord-bot: node apps/discord-bot/dist/index.js
Environment: DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID, etc.
Health endpoint: POST /health → checks bot readiness
```

---

### 2. Backend / API (`backend/`)
**Port:** `3000` (development), dynamic on Railway  
**Environment:** Railway  
**Status:** Always-on Node.js service  
**Entry Point:** `backend/dist/index.js`

**What it does:**
- REST API endpoints for dashboard
- User authentication (Discord OAuth)
- Database queries (Supabase)
- Integration with blockchain (Solana)

**Start command (local):**
```bash
pnpm --filter @tiltcheck/backend dev
```

**Production URLs:**
- `https://api.tiltcheck.me/health` - Health check
- `https://api.tiltcheck.me/auth/discord` - Discord OAuth
- `https://api.tiltcheck.me/dashboard/{userId}` - User data
- `https://api.tiltcheck.me/vault/{userId}` - Vault operations

---

### 3. Dashboard (`apps/dashboard`)
**Port:** `3001` (development), dynamic on Railway  
**Environment:** Railway (Next.js server)  
**Status:** Always-on Node.js + Static SSR  
**Entry Point:** `apps/dashboard/dist/index.js`

**What it does:**
- User dashboard (trust scores, history, stats)
- Personalized analytics
- Wallet management UI
- Real-time updates via WebSocket

**Start command (local):**
```bash
pnpm --filter @tiltcheck/dashboard dev
```

**Production URL:**
- `https://tiltcheck.me` - Main dashboard

---

### 4. Landing Page (`services/landing`)
**Port:** `3000` (development)  
**Environment:** Vercel OR GitHub Pages (static)  
**Status:** Static HTML/CSS/JS (CDN)  
**Entry Point:** `services/landing/public/index.html`

**What it does:**
- Marketing pages
- Documentation
- Feature showcase
- Public guides

**Start command (local):**
```bash
pnpm --filter @tiltcheck/landing dev
```

**Production URL:**
- `https://tiltcheck.me` - Landing page (served from `/`)
- OR custom subdomain if split deployed

---

### 5. API Gateway / Services

#### AI Gateway (`services/ai-gateway`)
**Port:** `8000`  
**Environment:** Railway  
**Status:** Always-on Node.js  
**Purpose:** OpenAI integration for NLP features

#### Trust Rollup (`services/trust-rollup`)
**Port:** `8083`  
**Environment:** Railway  
**Status:** Always-on aggregator  
**Purpose:** Aggregates trust events from EventRouter

#### Casino Data API (`services/casino-data-collector`)
**Port:** `6002`  
**Environment:** Railway  
**Status:** Scheduled service  
**Purpose:** Fetches casino bonus data

---

## 📊 Deployment Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    User's Computer                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Chrome Extension (apps/chrome-extension)            │  │
│  │  - Runs in browser                                   │  │
│  │  - Injects into casino sites                         │  │
│  │  - Monitors gameplay, detects tilt                   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          ↕️
                     HTTPS / WebSocket
                          ↕️
┌──────────────────────────────────────────────────────────────┐
│                   Railway Cloud Platform                     │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Discord Bot (apps/discord-bot)                      │  │
│  │  Port: 8081 (health)                                 │  │
│  │  Always-on process                                   │  │
│  │  ├─ Listens for Discord events                      │  │
│  │  └─ Posts alerts to channels                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Backend API (backend/)                              │  │
│  │  Port: 3000                                          │  │
│  │  REST API for dashboard/bot                          │  │
│  │  ├─ Authentication (Discord OAuth)                  │  │
│  │  ├─ User data (vault, tips, history)               │  │
│  │  └─ Database (Supabase)                             │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Dashboard (apps/dashboard)                          │  │
│  │  Port: 3001                                          │  │
│  │  Next.js with SSR                                    │  │
│  │  ├─ User dashboard UI                               │  │
│  │  ├─ Trust scores                                     │  │
│  │  └─ Real-time analytics                             │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  AI Gateway (services/ai-gateway)                    │  │
│  │  Port: 8000                                          │  │
│  │  OpenAI integration                                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Trust Rollup (services/trust-rollup)                │  │
│  │  Port: 8083                                          │  │
│  │  Aggregates trust events                             │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Supabase PostgreSQL Database                        │  │
│  │  Cloud-hosted (free tier available)                  │  │
│  │  Stores: users, wallets, tips, vault history        │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔧 Port Configuration

### Local Development Ports

```bash
# Main services
PORT=3000                    # Backend/API
LANDING_PORT=3000            # Landing page
CONTROL_ROOM_PORT=3001       # Dashboard

# Health check ports
DISCORD_BOT_HEALTH_PORT=8081
DAD_BOT_HEALTH_PORT=8082
EVENT_ROUTER_HEALTH_PORT=8083

# Service ports
QUALIFYFIRST_PORT=8080
CASINO_API_PORT=6002
```

### Railway Production Ports

Railway automatically assigns dynamic ports. Services communicate internally, and the main API is exposed via:
- `https://api.tiltcheck.me` - Backend API
- `https://tiltcheck.me` - Dashboard & Landing

---

## 📱 How User Requests Flow

### User in Discord Server

```
User: "/tip send @alice 1 SOL"
    ↓
Discord Bot (8081) receives command
    ↓
Calls JustTheTip module → initiates tip
    ↓
Emits "tip.created" event to EventRouter
    ↓
Trust Engines subscribe → update trust scores
    ↓
Bot posts alert to #trust-alerts channel
    ↓
User's wallet receives tip notification
```

### User on Dashboard

```
User visits: https://tiltcheck.me
    ↓
Served by: Dashboard (Next.js on Railway)
    ↓
User logs in with Discord OAuth
    ↓
Dashboard calls: https://api.tiltcheck.me/dashboard/{userId}
    ↓
Backend API (3000) queries Supabase database
    ↓
Returns: user stats, vault info, trust scores
    ↓
Dashboard renders personalized dashboard
```

### User's Chrome Extension on Casino Site

```
User visits: https://stake.com
    ↓
Extension injects sidebar
    ↓
Content script monitors bets
    ↓
If tilt detected → sends alert
    ↓
If cooldown violated → blocks action
    ↓
Real-time P/L graph updates via WebSocket
    ↓
User can lock funds via vault button (calls API)
```

---

## 🚀 How to Deploy to Production

### Option 1: Railway (Current)

```bash
# Automatic deployment from GitHub
# 1. Connect repo to Railway: https://railway.app
# 2. Set environment variables in Railway dashboard
# 3. Push to main branch → Railway auto-deploys

# Manual deployment:
railway login
railway link
railway variables set DISCORD_TOKEN="..."
railway up
```

### Option 2: Docker Compose (Self-Hosted)

```bash
docker-compose up -d
```

Deploys all services with shared networking.

---

## 🔴 Fixing the Port 8081 Error

The error means another process is already listening on port 8081.

**Solution 1: Use a different port locally**
```bash
DISCORD_BOT_HEALTH_PORT=9081 pnpm --filter @tiltcheck/discord-bot dev
```

**Solution 2: Kill the existing process**
```bash
# Find process on 8081
lsof -i :8081

# Kill it
kill -9 <PID>
```

**Solution 3: In production (Railway)**
Railway manages ports automatically. No conflicts possible.

---

## 📚 Further Reading

- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Detailed deployment guide
- **[ONE-LAUNCH-DEPLOYMENT.md](ONE-LAUNCH-DEPLOYMENT.md)** - One-command deploy
- **[DOCKER.md](DOCKER.md)** - Docker setup & troubleshooting
- **[RUN-DISCORD-BOT.md](RUN-DISCORD-BOT.md)** - Bot running guide
- **[Railway Deployment Guide](./docs/RAILWAY-DEPLOYMENT-GUIDE.md)** - Production Railway setup

---

## Summary

| What | Where | How |
|------|-------|-----|
| **Discord Bot** | Railway (always-on) | `node apps/discord-bot/dist/index.js` |
| **Backend API** | Railway (always-on) | `node backend/dist/index.js` |
| **Dashboard** | Railway (always-on) | `next start` on Railway |
| **Landing Page** | Vercel/GitHub Pages (CDN) | Static HTML |
| **Chrome Extension** | User's browser (local) | Chrome Web Store or manual load |
| **Database** | Supabase (cloud) | PostgreSQL managed service |

**Local Development:** All services run on your machine with different ports.  
**Production:** All services run on Railway with proper scaling, monitoring, and DNS routing.
