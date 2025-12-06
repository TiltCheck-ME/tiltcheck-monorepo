# TiltCheck Railway Deployment Guide

**Last Updated:** December 6, 2025  
**Status:** Production Ready ✅

## Overview

This guide provides step-by-step instructions for deploying TiltCheck to Railway.app. The deployment includes all core services with proper health checks and monitoring.

## Prerequisites

- Railway CLI installed: `npm install -g @railway/cli`
- Docker installed locally (for testing)
- Access to required API keys and secrets
- Railway account with active project

## Deployment Architecture

TiltCheck deploys as multiple services on Railway:

1. **Landing Page** (`services/landing`) - Main website on port 8080
2. **Dashboard** (`services/dashboard`) - Admin dashboard on port 5055
3. **Discord Bot** (`apps/discord-bot`) - Discord integration
4. **Trust Rollup** (`services/trust-rollup`) - Trust score aggregator on port 8082

## Pre-Deployment Checklist

### 1. Verify Local Build

```bash
# Install dependencies
corepack enable
corepack prepare pnpm@9.0.0 --activate
PUPPETEER_SKIP_DOWNLOAD=true pnpm install --frozen-lockfile

# Build all packages
pnpm build

# Run tests
pnpm test
```

**Expected Results:**
- ✅ All packages build successfully (54/54)
- ✅ All tests passing (537/537)

### 2. Test Docker Builds Locally

```bash
# Build individual services
docker compose build landing
docker compose build dashboard
docker compose build discord-bot
docker compose build trust-rollup

# Test services locally
docker compose up -d landing dashboard discord-bot trust-rollup

# Wait for startup
sleep 15

# Run health checks
bash scripts/check-health.sh
```

**Expected Results:**
- ✅ All Docker images build without errors
- ✅ All health endpoints return `ready: true`

## Railway Deployment Steps

### Step 1: Login to Railway

```bash
railway login
```

This will open your browser for authentication.

### Step 2: Initialize or Link Project

For a new project:
```bash
railway init
```

To link an existing project:
```bash
railway link
```

### Step 3: Configure Environment Variables

#### Core Discord Bot Variables (Required)

```bash
railway variables set DISCORD_TOKEN="your_discord_bot_token"
railway variables set DISCORD_CLIENT_ID="your_discord_client_id"
railway variables set DISCORD_GUILD_ID="your_discord_guild_id"
railway variables set COLLECT_CLOCK_OWNER_ID="1153034319271559328"
```

#### Landing Server Security (Required)

Get your public IP from https://ifconfig.me

```bash
railway variables set ADMIN_IP_1="your_public_ip"
railway variables set ADMIN_IP_2="optional_office_ip"
railway variables set ADMIN_IP_3="optional_vpn_ip"
```

#### Environment Configuration (Required)

```bash
railway variables set NODE_ENV="production"
railway variables set PORT="8080"
railway variables set LANDING_LOG_PATH="/tmp/landing-requests.log"
```

#### AI Gateway Production Mode (Optional)

For production AI features using OpenAI:

```bash
railway variables set OPENAI_API_KEY="sk-your-api-key-here"
railway variables set OPENAI_MODEL="gpt-4o-mini"
```

**Cost Notes:**
- `gpt-4o-mini`: Most cost-efficient (~$0.15/1M input tokens, $0.60/1M output tokens)
- `gpt-4o`: Higher quality (~$2.50/1M input tokens, $10/1M output tokens)

If not set, AI Gateway uses mock responses for testing.

#### Trust Rollup Real Data (Optional)

For production trust scores with real casino data:

```bash
railway variables set CASINO_GURU_API_KEY="your_casino_guru_api_key"
railway variables set ASKGAMBLERS_API_KEY="your_askgamblers_api_key"
railway variables set USE_MOCK_TRUST_DATA="false"
```

If not set, Trust Rollup uses curated mock data.

#### Supabase Database (Optional but Recommended)

For persistent storage (wallet registrations, user onboarding):

```bash
railway variables set SUPABASE_URL="https://your-project.supabase.co"
railway variables set SUPABASE_ANON_KEY="your_supabase_anon_key"
railway variables set SUPABASE_SERVICE_ROLE_KEY="your_supabase_service_role_key"
```

Get these from your Supabase project dashboard at https://supabase.com/dashboard

**Supabase Free Tier:**
- 500MB database storage
- Unlimited API requests
- Perfect for TiltCheck's needs

### Step 4: Deploy Application

```bash
railway up
```

This command will:
1. Build your application
2. Push to Railway
3. Deploy all services
4. Start health monitoring

### Step 5: Configure Domain

Generate a Railway domain:
```bash
railway domain generate
```

Or add your custom domain:
```bash
railway domain add tiltcheck.me
```

### Step 6: Verify Deployment

#### Check Service Status

```bash
railway status
```

Expected output:
```
✅ landing - Running
✅ dashboard - Running
✅ discord-bot - Running
✅ trust-rollup - Running
```

#### Test Health Endpoints

```bash
# Get your Railway domain
RAILWAY_DOMAIN=$(railway domain)

# Test landing page
curl https://$RAILWAY_DOMAIN/health

# Test dashboard
curl https://$RAILWAY_DOMAIN:5055/api/health

# Test trust rollup
curl https://$RAILWAY_DOMAIN:8082/health
```

Expected responses:
```json
{
  "status": "ok",
  "ready": true,
  "service": "landing|dashboard|trust-rollup",
  "version": "0.1.0",
  "timestamp": "2025-12-06T20:00:00.000Z"
}
```

#### Check Discord Bot

1. Go to your Discord server
2. Look for the bot online status
3. Try a command: `/tiltcheck help`

Expected: Bot responds with help menu

## Monitoring and Maintenance

### View Logs

```bash
# All services
railway logs

# Specific service
railway logs --service=discord-bot
railway logs --service=landing
railway logs --service=dashboard
railway logs --service=trust-rollup
```

### Restart Services

```bash
# Restart all
railway restart

# Restart specific service
railway restart --service=discord-bot
```

### Update Deployment

When you push changes to your repository:

```bash
# Pull latest changes
git pull origin main

# Test locally
pnpm build
pnpm test

# Deploy to Railway
railway up
```

## Health Check System

TiltCheck includes comprehensive health checks for all services.

### Health Check Endpoints

| Service | Endpoint | Port |
|---------|----------|------|
| Landing | `GET /health` | 8080 |
| Dashboard | `GET /api/health` | 5055 |
| Discord Bot | `GET /health` | 8081 |
| Trust Rollup | `GET /health` | 8082 |

### Health Check Script

The included health check script polls all endpoints:

```bash
# Local health check
bash scripts/check-health.sh

# With custom settings
REQUIRE_READY=true WAIT_ATTEMPTS=30 bash scripts/check-health.sh
```

Configuration:
- `REQUIRE_READY`: Fail if `ready != true` (default: true)
- `WAIT_ATTEMPTS`: Max polling attempts (default: 30)
- `WAIT_INTERVAL`: Seconds between attempts (default: 2)

## Troubleshooting

### Service Won't Start

**Check logs:**
```bash
railway logs --service=discord-bot
```

**Common issues:**
- Missing environment variables
- Invalid Discord token
- Port conflicts
- Build failures

**Solution:** Verify all required environment variables are set

### Health Check Failing

**Symptoms:**
- Health endpoint returns `ready: false`
- Service crashes on startup
- Timeout errors

**Debug steps:**
```bash
# Check service status
railway status

# View detailed logs
railway logs --service=<service-name>

# Restart service
railway restart --service=<service-name>
```

### Database Connection Issues

**For Supabase:**
1. Verify URL and keys are correct
2. Check Supabase dashboard for service status
3. Ensure your Railway IP is allowlisted

**Test connection:**
```bash
# From Railway shell
railway shell
curl $SUPABASE_URL/rest/v1/
```

### Discord Bot Not Responding

**Checklist:**
1. ✅ Bot is online in Discord server
2. ✅ Bot has required permissions
3. ✅ Commands are registered
4. ✅ DISCORD_TOKEN is valid
5. ✅ DISCORD_GUILD_ID is correct

**Re-register commands:**
```bash
railway run node apps/discord-bot/scripts/register-commands.js
```

## Production Configuration Checklist

### Essential Variables ✅
- [x] DISCORD_TOKEN
- [x] DISCORD_CLIENT_ID
- [x] DISCORD_GUILD_ID
- [x] ADMIN_IP_1
- [x] NODE_ENV=production
- [x] PORT=8080

### Optional but Recommended 🟡
- [ ] OPENAI_API_KEY (for AI features)
- [ ] CASINO_GURU_API_KEY (for real casino data)
- [ ] ASKGAMBLERS_API_KEY (for player reviews)
- [ ] SUPABASE_URL (for persistent storage)
- [ ] SUPABASE_ANON_KEY
- [ ] SUPABASE_SERVICE_ROLE_KEY

### Advanced Features 🔵
- [ ] CHANGENOW_API_KEY (for LTC bridge)
- [ ] STRIPE_SECRET_KEY (for subscriptions)
- [ ] DISCORD_WEBHOOK_URL (for alerts)

## Performance Optimization

### Resource Allocation

Railway auto-scales based on usage. Monitor with:

```bash
railway metrics
```

### Caching

AI Gateway includes automatic caching:
- Response cache: 1 hour TTL
- Reduces API costs
- Improves response time

### Database Optimization

For high-traffic deployments:
1. Use Supabase connection pooling
2. Index frequently queried fields
3. Archive old event data

## Security Best Practices

### Environment Variables
- ✅ Never commit secrets to git
- ✅ Use Railway's encrypted variables
- ✅ Rotate API keys regularly
- ✅ Use separate keys for dev/prod

### Network Security
- ✅ Allowlist admin IPs for landing page
- ✅ Use HTTPS for all endpoints
- ✅ Enable Railway's built-in DDoS protection
- ✅ Monitor logs for suspicious activity

### Discord Bot Security
- ✅ Use bot token, not user token
- ✅ Limit bot permissions to minimum required
- ✅ Validate all user inputs
- ✅ Rate limit commands

## Cost Estimation

### Railway Pricing
- Hobby Plan: $5/month (500 hours execution)
- Pro Plan: $20/month (unlimited execution)

### External Services (if enabled)

**OpenAI API (gpt-4o-mini):**
- Light usage: ~$5-10/month
- Medium usage: ~$20-50/month
- Heavy usage: ~$100+/month

**Supabase:**
- Free tier: $0/month (sufficient for most use cases)
- Pro tier: $25/month (if needed)

**Total Estimated Monthly Cost:**
- Minimum (Railway + mock data): $5/month
- Recommended (Railway + Supabase free): $5/month
- Full Production (Railway + OpenAI + Supabase): $30-75/month

## Support and Resources

### Documentation
- [Railway Docs](https://docs.railway.app/)
- [Supabase Docs](https://supabase.com/docs)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [Discord Developer Portal](https://discord.com/developers/docs)

### TiltCheck Resources
- Repository: https://github.com/jmenichole/tiltcheck-monorepo
- Issues: https://github.com/jmenichole/tiltcheck-monorepo/issues
- Discussions: https://github.com/jmenichole/tiltcheck-monorepo/discussions

### Need Help?

1. Check troubleshooting section above
2. Review Railway logs
3. Search existing GitHub issues
4. Open a new issue with logs and configuration

## Next Steps

After successful deployment:

1. ✅ Verify all health checks passing
2. ✅ Test Discord bot commands
3. ✅ Configure monitoring alerts
4. ✅ Set up backup/restore procedures
5. ✅ Document any custom configurations
6. ✅ Train team on Railway dashboard

---

**Deployment Complete!** 🚀

Your TiltCheck ecosystem is now running on Railway with full health monitoring and production-ready configuration.
