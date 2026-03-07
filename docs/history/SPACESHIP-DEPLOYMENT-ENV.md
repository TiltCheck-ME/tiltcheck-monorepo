# TiltCheck Spaceship/Hyperlift Deployment - Environment Variables Guide

This document lists **ALL environment variables** you need to configure in the Spaceship/Hyperlift deployment manager to successfully deploy the TiltCheck ecosystem.

> **Single Deployment:** Everything runs on `tiltcheck.me`
> - Landing pages, dashboard, and API endpoints all served from one deployment
> - Dockerfile: `services/landing/Dockerfile`

> **Note:** A 503 error typically indicates the server isn't responding properly. Ensure all **REQUIRED** variables are set correctly.

---

## Quick Start Checklist

Before deploying, verify you have configured:

1. ✅ **PORT** (must be `8080` for Hyperlift)
2. ✅ **NODE_ENV** (set to `production`)
3. ✅ **DISCORD_TOKEN** and **DISCORD_CLIENT_ID**
4. ✅ **SUPABASE_URL** and **SUPABASE_ANON_KEY**
5. ✅ **JWT_SECRET** and **SESSION_SECRET**

---

## Landing Service (tiltcheck.me) - Primary Deployment

The landing service is the main website. These are the variables to configure:

### REQUIRED Variables

| Variable | Example Value | Description |
|----------|---------------|-------------|
| `PORT` | `8080` | **CRITICAL**: Hyperlift requires port 8080 |
| `NODE_ENV` | `production` | Set to `production` for live deployment |

### RECOMMENDED Variables

| Variable | Example Value | Description |
|----------|---------------|-------------|
| `PUBLIC_BASE_URL` | `https://tiltcheck.me` | Base URL for sitemap generation and canonical links |
| `LANDING_LOG_PATH` | `/tmp/landing-requests.log` | Path for request logging (use `/tmp` in containers) |

### OPTIONAL - Admin Access Control

| Variable | Example Value | Description |
|----------|---------------|-------------|
| `ADMIN_IP_1` | `203.0.113.50` | First admin IP address for /control-room access |
| `ADMIN_IP_2` | `192.168.1.100` | Second admin IP (optional) |
| `ADMIN_IP_3` | `10.0.0.5` | Third admin IP (optional) |

### OPTIONAL - Newsletter Security

| Variable | Example Value | Description |
|----------|---------------|-------------|
| `NEWSLETTER_SALT` | `your_random_salt_here` | Salt for hashing subscriber emails |

---

## Discord Bot Service

If deploying the Discord bot separately or as part of the monorepo:

### REQUIRED Variables

| Variable | Example Value | Description |
|----------|---------------|-------------|
| `TILT_DISCORD_TOKEN` | `MTAx...` | Main TiltCheck Bot token |
| `TILT_DISCORD_CLIENT_ID` | `1234...` | Main TiltCheck Client ID |
| `TIP_DISCORD_TOKEN` | `MTAx...` | JustTheTip Bot token |
| `TIP_DISCORD_CLIENT_ID` | `1234...` | JustTheTip Client ID |
| `PORT` | `8080` | Health check port (Hyperlift requires 8080) |
| `NODE_ENV` | `production` | Environment setting |
| Variable | Example Value | Description |
|----------|---------------|-------------|
| `TILT_DISCORD_TOKEN` | `MTAx...` | Main TiltCheck Bot token |
| `TILT_DISCORD_CLIENT_ID` | `1234...` | Main TiltCheck Client ID |
| `TIP_DISCORD_TOKEN` | `MTAx...` | JustTheTip Bot token |
| `TIP_DISCORD_CLIENT_ID` | `1234...` | JustTheTip Client ID |
| `PORT` | `8080` | Health check port (Hyperlift requires 8080) |
| `NODE_ENV` | `production` | Environment setting |

### RECOMMENDED Variables

| Variable | Example Value | Description |
|----------|---------------|-------------|
| `DISCORD_GUILD_ID` | `9876543210987654321` | Server ID for development commands |
| `DASHBOARD_URL` | `https://tiltcheck.me/dashboard` | URL to dashboard service |

### OPTIONAL Variables

| Variable | Example Value | Description |
|----------|---------------|-------------|
| `DISCORD_CLIENT_SECRET` | `abc123xyz...` | OAuth client secret (for web login) |
| `DISCORD_CALLBACK_URL` | `https://tiltcheck.me/auth/discord/callback` | OAuth callback URL |
| `DISCORD_REDIRECT_URI` | `https://tiltcheck.me/auth/discord/callback` | OAuth redirect URI |
| `DISCORD_WEBHOOK_URL` | `https://discord.com/api/webhooks/...` | Webhook for notifications |
| `COMMAND_PREFIX` | `!` | Legacy command prefix |
| `SUSLINK_AUTO_SCAN` | `true` | Auto-scan links in messages |
| `TRUST_THRESHOLD` | `60` | Minimum trust score threshold |

---

## Dashboard Service

If deploying the dashboard/control room:

### REQUIRED Variables

| Variable | Example Value | Description |
|----------|---------------|-------------|
| `PORT` | `8080` | HTTP port (Hyperlift requires 8080) |
| `NODE_ENV` | `production` | Environment setting |

### OPTIONAL Variables

| Variable | Example Value | Description |
|----------|---------------|-------------|
| `DASHBOARD_POLL_MS` | `30000` | Snapshot poll interval in milliseconds |
| `DASHBOARD_EVENTS_KEEP_DAYS` | `7` | Event data retention period |
| `DISCORD_WEBHOOK_URL` | `https://discord.com/api/webhooks/...` | Webhook for alerts |

---

## Database Configuration (Supabase)

If your deployment uses database features:

### REQUIRED for Database Features

| Variable | Example Value | Description |
|----------|---------------|-------------|
| `SUPABASE_URL` | `https://xxxxx.supabase.co` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | `eyJhbGc...` | Supabase anonymous key |

### OPTIONAL Database Variables

| Variable | Example Value | Description |
|----------|---------------|-------------|
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGc...` | Service role key for admin operations |
| `DATABASE_URL` | `postgresql://user:pass@host:5432/db` | PostgreSQL connection (alternative to Supabase) |
| `REDIS_URL` | `redis://localhost:6379` | Redis for caching/sessions |

---

## Solana/Blockchain Configuration

If using JustTheTip or other blockchain features:

### REQUIRED for Blockchain Features

| Variable | Example Value | Description |
|----------|---------------|-------------|
| `SOLANA_RPC_URL` | `https://api.mainnet-beta.solana.com` | Solana RPC endpoint |
| `JUSTTHETIP_FEE_WALLET` | `ABC123...` | Fee collection wallet address |

### OPTIONAL Blockchain Variables

| Variable | Example Value | Description |
|----------|---------------|-------------|
| `GAS_WALLET_PUBLIC` | `DEF456...` | Gas fee wallet public key |

---

## Security & Authentication

### REQUIRED for Authenticated Services

| Variable | Example Value | Description |
|----------|---------------|-------------|
| `JWT_SECRET` | `32+_character_random_string` | JWT signing secret (min 32 chars) |
| `SESSION_SECRET` | `32+_character_random_string` | Session encryption (min 32 chars) |
| `ADMIN_PASSWORD` | `your_secure_password` | Admin panel password |

### OPTIONAL Security Variables

| Variable | Example Value | Description |
|----------|---------------|-------------|
| `ALLOWED_ORIGINS` | `https://tiltcheck.me` | CORS allowed origins |
| `GAUGE_ADMIN_TOKEN` | `random_token` | Admin token for gauge config |
| `REQUIRED_TRUST_LEVEL` | `0` | Minimum trust level (0-100) |

---

## External API Keys

### OPTIONAL API Integrations

| Variable | Example Value | Description |
|----------|---------------|-------------|
| `OPENAI_API_KEY` | `sk-...` | OpenAI API key for AI features |

> **Note:** Pricing oracle uses Jupiter Price API (https://price.jup.ag) for Solana token prices. No API key required.

---

## Internal Service Communication

### For Multi-Service Deployments

| Variable | Example Value | Description |
|----------|---------------|-------------|
| `TILTCHECK_API_URL` | `https://tiltcheck.me/api` | TiltCheck API base URL |
| `TILTCHECK_API_KEY` | `your_api_key` | Internal API key |
| `CASINO_API_KEY` | `tiltcheck-casino-collector-2024` | Casino data API key |
| `CASINO_API_PORT` | `6002` | Casino API port |

---

## Data Storage Paths

### Container Path Configuration

| Variable | Default Value | Description |
|----------|---------------|-------------|
| `LOCKVAULT_STORE_PATH` | `./data/lockvault-store.json` | LockVault storage path |
| `PENDING_TIPS_STORE_PATH` | `./data/pending-tips-store.json` | Pending tips storage |
| `COLLECTCLOCK_LOG_DIR` | `./logs/collectclock` | CollectClock log directory |
| `LANDING_LOG_PATH` | `./logs/landing.log` | Landing page log path |
| `EVIDENCE_RETENTION_DAYS` | `30` | Evidence package retention |
| `EVIDENCE_MAX_COUNT` | `1000` | Max evidence packages |

---

## Feature Flags

| Variable | Default | Description |
|----------|---------|-------------|
| `SKIP_DISCORD_LOGIN` | `false` | Skip Discord OAuth (for testing) |
| `ENABLE_CASINO_VERIFICATION` | `true` | Enable casino verification scheduler |
| `CI` | `false` | Set to `true` in CI environments |

---

## Service Health Check Ports

| Variable | Default | Description |
|----------|---------|-------------|
| `DISCORD_BOT_HEALTH_PORT` | `8081` | Discord bot health check |
| `DAD_BOT_HEALTH_PORT` | `8082` | DAD bot health check |
| `EVENT_ROUTER_HEALTH_PORT` | `8083` | Event router health check |

---

## Hyperlift-Specific Configuration

### Important Notes for Spaceship/Hyperlift

1. **Port 8080 is required** - Hyperlift expects apps to listen on port 8080
   ```
   PORT=8080
   ```

2. **NODE_ENV must be production** for optimal performance
   ```
   NODE_ENV=production
   ```

3. **Health endpoints** - Ensure your service responds to health checks:
   - Landing: `GET /health`
   - Dashboard: `GET /api/health`
   - Discord Bot: Built-in Discord connection status

4. **HTTPS is automatic** - Hyperlift provides SSL/TLS automatically

5. **Environment variables are case-sensitive** - Double-check spelling

---

## Minimum Viable Deployment

For the simplest landing page deployment with just the static site:

```bash
# MINIMUM REQUIRED
PORT=8080
NODE_ENV=production

# RECOMMENDED
PUBLIC_BASE_URL=https://tiltcheck.me
```

---

## Full Production Deployment

For a complete deployment with all features:

```bash
# Core
PORT=8080
NODE_ENV=production
PUBLIC_BASE_URL=https://tiltcheck.me

# Discord Bots
TILT_DISCORD_TOKEN=your_tilt_bot_token
TILT_DISCORD_CLIENT_ID=your_tilt_client_id
TIP_DISCORD_TOKEN=your_tip_bot_token
TIP_DISCORD_CLIENT_ID=your_tip_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_GUILD_ID=your_server_id
DISCORD_WEBHOOK_URL=your_webhook_url

# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key

# Security
JWT_SECRET=minimum_32_character_secret_here
SESSION_SECRET=minimum_32_character_secret_here
ADMIN_PASSWORD=your_secure_admin_password

# Blockchain (optional)
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
JUSTTHETIP_FEE_WALLET=your_wallet_address

# External APIs (optional)
OPENAI_API_KEY=sk-your_key
# Note: Pricing oracle uses Jupiter Price API (https://price.jup.ag) - no API key required

# Admin IPs (optional)
ADMIN_IP_1=your_public_ip
```

---

## Troubleshooting 503 Errors

If you're seeing a 503 error on tiltcheck.me, check:

### 1. Is `PORT=8080` set?
This is the most common issue. Hyperlift requires port 8080.

### 2. Is `NODE_ENV=production` set?
Required for production builds.

### 3. Verify Health Endpoint
Access `https://tiltcheck.me/health` directly. 

**Expected successful response:**
```json
{
  "status": "ok",
  "service": "landing",
  "ready": true,
  "ts": 1700000000000,
  "uptimeSeconds": 3600,
  "memory": {
    "rssMB": "45.00",
    "heapUsedMB": "20.00"
  }
}
```

If you get:
- **503 error**: Service not running or port misconfigured
- **404 error**: Wrong Dockerfile or path issue
- **No response**: Build failed or startup crash

### 4. Check Hyperlift Build Logs
In the Hyperlift Manager, look for these error patterns:
- `ENOENT` - Missing files or wrong paths
- `Cannot find module` - Missing dependencies
- `EADDRINUSE` - Port conflict (ensure PORT=8080)
- `Error: listen EACCES` - Permission issue (use PORT=8080)

### 5. Check Container Runtime Logs
Look for:
- `Landing service listening on port 8080` - Successful startup
- `pnpm install failed` - Dependency issue
- `tsc: command not found` - Build tool missing

### 6. Verify Dockerfile Path
For landing page, use: `services/landing/Dockerfile`

### 7. Rebuild After Changes
Environment variable changes require a new build. Click "Build & Deploy" in Hyperlift.

### 8. Check Memory/Resources
If the app starts then crashes, you may need more resources or check for memory leaks.

---

## Getting Help

- [Hyperlift Documentation](https://www.spaceship.com/knowledgebase/category/starlight-hyperlift-help-articles/)
- [TiltCheck GitHub Issues](https://github.com/jmenichole/tiltcheck-monorepo/issues)
- See also: `HYPERLIFT.md`, `DEPLOYMENT.md`, `ENV-SETUP.md`

---

**TiltCheck Ecosystem © 2024–2025 jmenichole**
