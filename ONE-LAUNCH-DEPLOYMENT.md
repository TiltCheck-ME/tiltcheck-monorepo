# TiltCheck One-Launch Deployment

Deploy all TiltCheck services with a single command.

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/jmenichole/tiltcheck-monorepo.git
cd tiltcheck-monorepo

# 2. Copy and configure environment
cp .env.docker.example .env
nano .env  # Add your Discord credentials

# 3. Deploy everything with one command
docker-compose up -d

# 4. Verify deployment
docker-compose ps
curl http://localhost/proxy-health
```

## What Gets Deployed

| Service | Internal Port | Access Path | Purpose |
|---------|---------------|-------------|---------|
| **Reverse Proxy** | 80, 443 | `http://tiltcheck.me` | Routes all traffic |
| **Landing** | 8080 | `/` | Main website with SusLink, tools pages |
| **Dashboard** | 5055 | `/dashboard/` | Admin control room |
| **Discord Bot** | N/A | N/A | Discord integration |
| **Trust Rollup** | 8082 | `/trust-api/` | Trust score aggregation |

## Architecture

```
                    ┌─────────────────┐
                    │   Internet      │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  Reverse Proxy  │ :80/:443
                    │    (nginx)      │
                    └────────┬────────┘
                             │
        ┌────────────┬───────┴───────┬────────────┐
        │            │               │            │
   ┌────▼────┐ ┌─────▼─────┐ ┌───────▼───────┐ ┌──▼──┐
   │ Landing │ │ Dashboard │ │ Trust Rollup  │ │ Bot │
   │  :8080  │ │   :5055   │ │     :8082     │ │     │
   └─────────┘ └───────────┘ └───────────────┘ └─────┘
```

## Environment Variables

Create a `.env` file with:

```env
# Required for Discord Bot
DISCORD_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id
DISCORD_GUILD_ID=your_server_id

# Optional
DISCORD_WEBHOOK_URL=your_webhook_url
DASHBOARD_POLL_MS=30000
DASHBOARD_EVENTS_KEEP_DAYS=7
SUSLINK_AUTO_SCAN=true
TRUST_THRESHOLD=60

# Admin IPs (optional)
ADMIN_IP_1=127.0.0.1
ADMIN_IP_2=
ADMIN_IP_3=
```

## Deployment Options

### Option 1: Full Deployment (All Services)
```bash
docker-compose up -d
```

### Option 2: Minimum Viable (Landing Only)
```bash
docker-compose up -d landing
```

### Option 3: Web Services Only (No Discord Bot)
```bash
docker-compose up -d reverse-proxy landing dashboard trust-rollup
```

### Option 4: With External Port Access
If you need direct port access for debugging:
```bash
# Edit docker-compose.yml to expose ports:
# landing: ports: ["8080:8080"]
# dashboard: ports: ["5055:5055"]
docker-compose up -d
```

## Useful Commands

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f landing
docker-compose logs -f discord-bot

# Restart a service
docker-compose restart dashboard

# Rebuild after code changes
docker-compose build --no-cache
docker-compose up -d

# Stop all services
docker-compose down

# Stop and remove all data (⚠️ destructive)
docker-compose down -v
```

## Health Checks

```bash
# Proxy health
curl http://localhost/proxy-health

# Dashboard health
curl http://localhost/dashboard/api/health

# Direct service health (if ports exposed)
curl http://localhost:8080/health
curl http://localhost:5055/api/health
```

## Domain Configuration

For production with your own domain:

1. Update DNS A record to point to your server
2. Update `nginx.conf` server_name if needed
3. Replace self-signed SSL with Let's Encrypt:

```bash
# Install certbot
apt install certbot

# Get certificate (stop nginx first)
docker-compose stop reverse-proxy
certbot certonly --standalone -d tiltcheck.me -d www.tiltcheck.me

# Update nginx.conf to use:
# ssl_certificate /etc/letsencrypt/live/tiltcheck.me/fullchain.pem;
# ssl_certificate_key /etc/letsencrypt/live/tiltcheck.me/privkey.pem;
```

## Troubleshooting

### Services not starting
```bash
# Check logs for errors
docker-compose logs

# Ensure all images built correctly
docker-compose build

# Check if ports are in use
netstat -tlnp | grep -E '80|443|5055|8080'
```

### Discord bot not connecting
```bash
# Verify environment variables
docker-compose exec discord-bot env | grep DISCORD

# Check bot logs
docker-compose logs discord-bot
```

### Nginx proxy errors
```bash
# Test nginx config
docker-compose exec reverse-proxy nginx -t

# View nginx logs
docker-compose logs reverse-proxy
```

## Cloud Deployment

### Render.com
Use the unified Dockerfile at root with Render's native Docker support.

### Railway
```bash
railway up
```

### Fly.io
```bash
fly deploy
```

### DigitalOcean App Platform
Connect GitHub repo and use Docker Compose deployment.

## Files Reference

| File | Purpose |
|------|---------|
| `docker-compose.yml` | One-launch orchestration |
| `services/reverse-proxy/nginx.conf` | Routing configuration |
| `.env.docker.example` | Environment template |
| `Dockerfile` | Unified monorepo build |
| `Procfile` | Process orchestration (Heroku) |
| `fly.toml` | Fly.io configuration |

---

**TiltCheck © 2024-2025 jmenichole**
