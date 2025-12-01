# TiltCheck All-In-One Hyperlift Deployment

Deploy the entire TiltCheck ecosystem in **one Hyperlift instance** using `Dockerfile.unified`.

---

## What Runs In This Container

All services run via **supervisord** (multi-process manager):

1. **nginx** - Reverse proxy (port 8080 external)
2. **Landing** - Website at `/` (internal 3000)
3. **Dashboard** - API + UI at `/dashboard` and `/api/*` (internal 5055)
4. **Discord Bot** - Main TiltCheck bot (health on 8081)
5. **DA&D Bot** - Game bot (health on 8082)
6. **AI Gateway** - AI endpoints (internal 3001)
7. **Trust Rollup** - Trust aggregation (health on 8083)

---

## Hyperlift Setup

### Instance Configuration

| Setting | Value |
|---------|-------|
| **Repository** | `jmenichole/tiltcheck-monorepo` |
| **Branch** | `main` |
| **Dockerfile Path** | `Dockerfile.unified` |
| **Port** | `8080` (auto-detected from Dockerfile) |
| **Domain** | `tiltcheck.me` (or your custom domain) |
| **Size** | **Micro** (0.25 vCPU / 0.5 GiB) or **Small** (0.5 vCPU / 1 GiB) recommended |

### Environment Variables

Set these in Hyperlift Manager → Instance Settings → Environment:

#### Core (Required)
```bash
NODE_ENV=production
PORT=8080
```

#### Discord Bots (Required for bot functionality)
```bash
# Main Discord Bot (JustTheTip + ecosystem)
DISCORD_TOKEN=your_main_bot_token_here
DISCORD_CLIENT_ID=your_main_client_id_here
DISCORD_GUILD_ID=your_server_id_optional

# DA&D Bot (separate bot token)
DAD_DISCORD_TOKEN=your_dad_bot_token_here
DAD_DISCORD_CLIENT_ID=your_dad_client_id_here
DAD_DISCORD_GUILD_ID=your_dad_server_id_optional
```

#### AI Gateway (Optional, enables AI features)
```bash
OPENAI_API_KEY=sk-your-openai-key-here
```

#### Dashboard (Optional)
```bash
DISCORD_WEBHOOK_URL=your_webhook_url_for_alerts
DASHBOARD_POLL_MS=30000
DASHBOARD_EVENTS_KEEP_DAYS=7
```

#### Trust Rollup (Optional, external data sources)
```bash
CASINO_GURU_API_KEY=your_key_optional
ASKGAMBLERS_API_KEY=your_key_optional
ENABLE_CASINO_VERIFICATION=true
```

#### Landing (Optional, admin access)
```bash
ADMIN_IP_1=your_public_ip_for_admin_pages
LANDING_LOG_PATH=/tmp/landing-requests.log
```

---

## URL Routing (nginx handles internally)

| URL Pattern | Service | Description |
|-------------|---------|-------------|
| `/` | Landing | Main website, static pages |
| `/about`, `/faq`, etc. | Landing | Content pages |
| `/dashboard` → `/dashboard/` | Dashboard | Redirects to trailing slash |
| `/dashboard/*` | Dashboard | Dashboard UI |
| `/api/*` | Dashboard | REST API endpoints |
| `/health` | Landing | Health check (public) |
| `/proxy-health` | nginx | Proxy health check |

---

## Service Health Endpoints (Internal)

For monitoring individual services (from inside the container):

- Landing: `http://localhost:3000/health`
- Dashboard: `http://localhost:5055/api/health`
- Discord Bot: `http://localhost:8081/health`
- DA&D Bot: `http://localhost:8082/health`
- AI Gateway: `http://localhost:3001/health`
- Trust Rollup: `http://localhost:8083/health`

External health check (via nginx): `https://tiltcheck.me/proxy-health`

---

## Verification Steps

After deployment completes:

```bash
# Main website
curl https://tiltcheck.me/

# Website health
curl https://tiltcheck.me/health

# Dashboard API
curl https://tiltcheck.me/api/health

# Dashboard UI
curl https://tiltcheck.me/dashboard/

# Proxy health (used by Hyperlift health checks)
curl https://tiltcheck.me/proxy-health
```

Check Discord:
- Both bots should appear online in your server
- Test commands: `/ping`, `/help`, `/play` (DA&D)

---

## Resource Requirements

### Recommended: Small (0.5 vCPU / 1 GiB)
Running 7 processes needs more than Micro if all are active simultaneously:
- **Micro (0.25 vCPU / 0.5 GiB)**: Works for low traffic, may be tight
- **Small (0.5 vCPU / 1 GiB)**: Recommended for production with both bots active
- **Medium (1 vCPU / 2 GiB)**: If AI Gateway sees heavy use or many concurrent users

### Cost (Spaceship Hyperlift pricing as of 2025)
- Micro: $3.50/month
- Small: ~$7/month (estimated)
- Medium: ~$14/month (estimated)

Start with **Small** for reliability, downgrade to Micro if monitoring shows low resource use.

---

## Logs & Monitoring

View real-time logs in Hyperlift Manager:
- Dashboard → Your Instance → **Logs** tab
- Shows output from all 7 processes via supervisord

To see which service a log line comes from, supervisord prefixes each line with the program name.

---

## Scaling Considerations

### When to Split Into Multiple Instances
- **High Discord bot traffic**: Move bots to separate instance(s)
- **AI Gateway rate limits**: Dedicated instance with more CPU
- **Geographic distribution**: Deploy regional instances

### When All-In-One Works Best
- **Low-medium traffic** (< 1000 DAU)
- **Cost optimization** (single $7/mo vs 6× $3.50 = $21/mo)
- **Simplified deployment** (one build, one domain, one env config)

---

## Troubleshooting

### Build Hangs During pnpm install
- The build includes network timeout and retry settings
- If stuck for >5 minutes, cancel and rebuild
- Hyperlift sometimes has transient network issues
- Build typically takes 5-8 minutes total

### Bot Not Connecting
- Check `DISCORD_TOKEN` and `DAD_DISCORD_TOKEN` are set correctly (no quotes in Hyperlift env UI)
- Verify bot tokens are valid in Discord Developer Portal
- Check logs for "Invalid token" errors

### Service Crashes Loop
- Logs will show which service is failing
- Common issues:
  - Missing env var (e.g., `DISCORD_TOKEN`)
  - Port conflict (shouldn't happen with current config)
  - Out of memory (upgrade to Medium)

### Dashboard Shows No Data
- Trust Rollup needs time to aggregate events (hourly windows)
- Check `/api/health` shows `eventBufferSize > 0` after some activity
- Trigger test event: run Discord commands that emit trust events

### AI Gateway Errors
- If `OPENAI_API_KEY` not set, uses mock mode (safe fallback)
- Check logs for API rate limit errors
- Verify API key is valid: `https://platform.openai.com/api-keys`

---

## DNS Setup

Point your domain to Hyperlift:

1. Get Hyperlift target from Instance → Domains → "Add Custom Domain"
2. Add DNS record:
   - **Type**: ALIAS or ANAME (for apex) or CNAME (for subdomain)
   - **Name**: `@` (for tiltcheck.me) or subdomain
   - **Target**: Hyperlift-provided URL (e.g., `xyz.hyperlift.app`)
3. Wait for DNS propagation (5-30 minutes)
4. Verify: `curl https://tiltcheck.me/health`

---

## Security Notes

- All services run as `root` inside container (isolated by Docker)
- nginx handles external traffic on 8080; internal services on high ports
- Environment variables are injected at runtime (never commit tokens to git)
- HTTPS automatically provided by Hyperlift/Spaceship
- Admin endpoints (`/admin/*`, `/control-room`) IP-restricted via `ADMIN_IP_1`

---

## Next Steps

1. **Deploy** - Connect repo, set env, deploy
2. **Test** - Verify health endpoints and Discord bot presence
3. **Monitor** - Watch logs for first 24h, check resource usage
4. **Optimize** - Adjust instance size if needed
5. **Scale** - Split services into separate instances when traffic grows

---

**Questions?** Check main deployment docs:
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Full deployment guide
- [HYPERLIFT.md](./HYPERLIFT.md) - Spaceship Hyperlift details
- [HYPERLIFT-INSTANCES.md](./HYPERLIFT-INSTANCES.md) - Multi-instance setup

---

**TiltCheck Ecosystem © 2024–2025 jmenichole**
