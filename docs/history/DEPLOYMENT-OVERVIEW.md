# TiltCheck Deployment Overview

**Where does each part get deployed?**

This document provides a clear map of the TiltCheck ecosystem components and where they should be deployed.

---

## Quick Reference

| Component | Type | Deploy To | Notes |
|-----------|------|-----------|-------|
| **Browser Extension** | Chrome Extension | Chrome Web Store / Local | Runs in user's browser |
| **Discord Bot** | Server Application | Railway/Hyperlift/VPS | Always-on Node.js process |
| **Dashboard** | Web Service | Railway/Hyperlift/Vercel | API + Static UI |
| **Landing Page** | Static Site | GitHub Pages / Vercel | Marketing/docs site |
| **AI Gateway** | Serverless | Cloudflare Workers / Vercel | API endpoint for AI features |
| **Trust Rollup** | Service | Railway/Hyperlift/VPS | Aggregates trust data |
| **Casino Data API** | Service | Railway/Hyperlift/VPS | Provides casino data |

---

## 🔌 Browser Extension (`apps/chrome-extension/`)

**What it is:** TiltGuard - a Chrome extension with a **sidebar UI** (not popup) that injects into casino sites to monitor gameplay, detect tilt, and protect users.

**Architecture:**
- `content.ts` → Main content script, injects into casino pages
- `sidebar.ts` → Sidebar UI component (the main interface)
- `popup.html/popup.js` → Secondary popup (legacy, basic controls)
- `manifest.json` → Chrome extension manifest

**How it works:**
1. User installs extension in Chrome
2. When visiting supported casino sites (Stake, Roobet, BC.Game, etc.)
3. Extension injects **sidebar** on the right side of the page
4. Sidebar shows: Auth, session stats, P/L graph, tilt score, vault controls
5. Content script monitors bets, detects tilt, triggers interventions

**Deployment:**

```bash
# Build the extension
cd apps/chrome-extension
pnpm build

# Output: dist/ folder with:
# - manifest.json
# - content.js (compiled from content.ts + sidebar.ts)
# - popup.html + popup.js
# - icons/

# To install locally:
# 1. Chrome → chrome://extensions/
# 2. Enable "Developer mode"
# 3. "Load unpacked" → select dist/ folder

# For Chrome Web Store:
# 1. Zip the dist/ folder
# 2. Upload to Chrome Developer Dashboard
```

**API Endpoints Used:**
- `https://api.tiltcheck.me/auth/discord` - Discord OAuth
- `https://api.tiltcheck.me/auth/guest` - Guest auth
- `https://api.tiltcheck.me/vault/{userId}` - Vault operations
- `https://api.tiltcheck.me/dashboard/{userId}` - User dashboard
- `https://api.tiltcheck.me/premium/plans` - Premium plans
- `wss://api.tiltcheck.me/analyzer` - WebSocket for real-time analysis

---

## 🤖 Discord Bot (`apps/discord-bot/`)

**What it is:** Main TiltCheck Discord bot for server integration.

**Commands:**
- `/ping`, `/help` - Basic commands
- `/scan <url>` - SusLink URL scanning
- `/trust casino <name>` - Casino trust score
- `/trust user <@user>` - Degen trust score
- `/submitpromo` - Submit promo for FreeSpinScan
- `/qualify` - QualifyFirst survey routing
- `/justthetip` - Non-custodial tipping

**Deployment Options:**

### Railway (Recommended)
```bash
# Railway uses the Procfile
# Procfile: discord-bot: node apps/discord-bot/dist/index.js

# Set environment variables in Railway Dashboard:
DISCORD_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id
DISCORD_GUILD_ID=your_server_id
```

### Hyperlift (Spaceship)
```bash
# Uses Dockerfile at apps/discord-bot/Dockerfile
# Configure in Hyperlift Manager
```

### Docker
```bash
docker build -f apps/discord-bot/Dockerfile -t tiltcheck-bot .
docker run -d --env-file .env tiltcheck-bot
```

**Required Environment Variables:**
```env
DISCORD_TOKEN=         # Bot token from Discord Developer Portal
DISCORD_CLIENT_ID=     # Application ID
DISCORD_GUILD_ID=      # Server ID (for dev commands)
DASHBOARD_URL=         # URL to dashboard service (optional)
```

---

## 📊 Dashboard (`services/dashboard/`)

**What it is:** Web dashboard and API for trust metrics, alerts, and monitoring.

**Endpoints:**
- `GET /api/health` - Health check
- `GET /api/config` - Configuration
- `GET /api/snapshot` - Current trust snapshot
- `POST /api/request-snapshot` - Request new snapshot
- Discord webhook alerts for trust changes

**Deployment Options:**

### Railway
```bash
# Procfile: dashboard: node services/dashboard/dist/server.js
# Port: 5055 (configure via PORT env var)
```

### Hyperlift
```bash
# Uses Dockerfile at services/dashboard/Dockerfile
```

### Vercel (Serverless)
```bash
# Configure vercel.json for serverless functions
```

**Required Environment Variables:**
```env
PORT=5055
NODE_ENV=production
DISCORD_WEBHOOK_URL=   # Webhook for trust alerts (optional)
DASHBOARD_POLL_MS=30000
DASHBOARD_EVENTS_KEEP_DAYS=7
```

---

## 🌐 Landing Page (`services/landing/`)

**What it is:** Static marketing and documentation site.

**Deployment:**
- **GitHub Pages** (current): Auto-deploys from `main` branch
- **Vercel**: Connect repo for automatic deploys
- **Netlify**: Similar to Vercel

**URL:** https://jmenichole.github.io/tiltcheck-monorepo/

---

## 🧠 AI Gateway (`services/ai-gateway/`)

**What it is:** Serverless AI endpoint for:
- Survey matching (QualifyFirst)
- Card generation (DA&D)
- Content moderation
- Tilt detection
- Natural language commands
- Recommendations
- Support

**Deployment:**

### Cloudflare Workers (Recommended)
```bash
# Configure wrangler.toml
# Deploy: wrangler publish
```

### Vercel Edge Functions
```bash
# Configure in vercel.json
# Auto-deploys with repo
```

**Required Environment Variables:**
```env
OPENAI_API_KEY=sk-...   # For production AI
OPENAI_MODEL=gpt-4o-mini
```

---

## 📈 Trust Rollup (`services/trust-rollup/`)

**What it is:** Aggregates trust data from multiple sources (CasinoGuru, AskGamblers) and calculates unified trust scores.

**Deployment:** Same as Dashboard (Railway/Hyperlift/VPS)

**Required Environment Variables:**
```env
CASINO_GURU_API_KEY=    # Optional, uses mock data without
ASKGAMBLERS_API_KEY=    # Optional, uses mock data without
USE_MOCK_TRUST_DATA=false
```

---

## 🎰 Casino Data API (`services/casino-data-api/`)

**What it is:** Provides casino information, RTP data, and game details.

**Deployment:** Same as other services

---

## Complete Deployment Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    USER'S BROWSER                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Chrome Extension (TiltGuard)                        │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐│   │
│  │  │ content.js  │ │ sidebar.ts  │ │ popup (legacy) ││   │
│  │  └─────────────┘ └─────────────┘ └─────────────────┘│   │
│  └─────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────┘
                            │ API Calls
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                 CLOUD INFRASTRUCTURE                         │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │  Discord Bot     │  │  Dashboard       │                 │
│  │  (Railway)       │  │  (Railway/Vercel)│                 │
│  └────────┬─────────┘  └────────┬─────────┘                 │
│           │                      │                           │
│           └──────────┬───────────┘                           │
│                      ▼                                       │
│  ┌──────────────────────────────────────────┐               │
│  │             Event Router                  │               │
│  │  (Pub/Sub for module communication)      │               │
│  └────────────────────┬─────────────────────┘               │
│                       │                                      │
│     ┌─────────────────┼─────────────────┐                   │
│     ▼                 ▼                 ▼                   │
│  ┌─────────┐    ┌─────────┐    ┌──────────────┐            │
│  │ AI      │    │ Trust   │    │ Casino Data  │            │
│  │ Gateway │    │ Rollup  │    │ API          │            │
│  │ (CF/VCL)│    │ (Rail)  │    │ (Railway)    │            │
│  └─────────┘    └─────────┘    └──────────────┘            │
│                                                              │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                 DISCORD                                       │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  TiltCheck Bot                                           │ │
│  │  /scan /trust /submitpromo /qualify /justthetip         │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                 GITHUB PAGES                                  │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Landing Page / Docs                                     │ │
│  │  https://jmenichole.github.io/tiltcheck-monorepo/       │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

---

## Recommended Deployment Stack

For the simplest deployment:

1. **Browser Extension**: Local install for testing, Chrome Web Store for production
2. **Discord Bot + Dashboard + Trust Rollup**: Railway (all in one project)
3. **AI Gateway**: Cloudflare Workers (free tier)
4. **Landing Page**: GitHub Pages (already configured)

---

## API Domain: api.tiltcheck.me

The extension and services expect API at `https://api.tiltcheck.me`. You'll need to:

1. Register the domain (or use a subdomain)
2. Configure DNS to point to your Railway/Hyperlift deployment
3. Enable HTTPS (Railway provides this automatically)

Or for local development:
- Run services on localhost
- Update `API_BASE` in `sidebar.ts` to `http://localhost:5055`

---

## Questions?

- See individual service README files for detailed configuration
- Check `QUICKSTART.md` for local development setup
- Review `docs/tiltcheck/` for architecture details
