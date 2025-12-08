# TiltCheck Production Troubleshooting Guide

**Version:** 1.0  
**Last Updated:** December 8, 2025  
**Status:** Production Ready

## Overview

This guide provides step-by-step troubleshooting procedures for common production issues with TiltCheck. Use this as your first resource when investigating problems.

---

## Quick Diagnostic Steps

When something goes wrong, start here:

```bash
# 1. Check service status
railway status

# 2. View recent logs
railway logs | tail -100

# 3. Check health endpoints
bash scripts/verify-railway-deployment.sh

# 4. Validate environment
bash scripts/validate-production-env.sh
```

---

## Common Issues

### 1. Service Won't Start

**Symptoms:**
- Service shows "crashed" in Railway dashboard
- Health endpoint unreachable
- Service restarts continuously

**Diagnosis:**

```bash
# Check recent logs for startup errors
railway logs --service=discord-bot | grep -i "error\|exception\|failed"

# Check environment variables
railway variables

# View deployment history
railway deployments
```

**Common Causes:**

**A. Missing Environment Variables**

```bash
# Check for required variables
railway variables | grep -E "DISCORD_TOKEN|DISCORD_CLIENT_ID|NODE_ENV"

# Fix: Set missing variable
railway variables set DISCORD_TOKEN="your_token_here"
railway restart --service=discord-bot
```

**B. Invalid Environment Variable**

```bash
# Validate format
bash scripts/validate-production-env.sh

# Example: Invalid Discord token
# Fix: Generate new token in Discord Developer Portal
railway variables set DISCORD_TOKEN="new_valid_token"
railway restart
```

**C. Build Failure**

```bash
# Check build logs
railway logs | grep -i "build\|compile"

# Fix: Test build locally first
pnpm install
pnpm build

# Then deploy
railway up
```

**D. Port Conflict**

```bash
# Check if port is already in use
railway logs | grep -i "EADDRINUSE"

# Fix: Change port or stop conflicting service
railway variables set DISCORD_BOT_HEALTH_PORT="8082"
railway restart
```

**Resolution Steps:**

1. Fix the root cause identified above
2. Restart the service: `railway restart --service=SERVICE_NAME`
3. Monitor logs: `railway logs --follow`
4. Verify health: `curl https://your-domain.com:PORT/health`

---

### 2. Discord Bot Not Responding

**Symptoms:**
- Bot shows offline in Discord
- Slash commands don't appear
- Commands don't get responses
- Bot responds with errors

**Diagnosis:**

```bash
# Check bot health endpoint
curl https://your-domain.com:8081/health

# Check bot logs
railway logs --service=discord-bot | tail -50

# Verify token
railway variables get DISCORD_TOKEN
```

**Common Causes:**

**A. Invalid or Expired Token**

```bash
# Symptoms in logs: "401 Unauthorized" or "Invalid token"

# Fix: Generate new token
# 1. Go to https://discord.com/developers/applications
# 2. Select your application
# 3. Go to Bot section
# 4. Reset token
# 5. Update Railway
railway variables set DISCORD_TOKEN="new_token_here"
railway restart --service=discord-bot

# Verify bot is online
# Check Discord server for online status
```

**B. Commands Not Registered**

```bash
# Symptoms: Slash commands don't appear in Discord

# Fix: Re-register commands
railway run --service=discord-bot node apps/discord-bot/scripts/register-commands.js

# Or manually:
railway shell --service=discord-bot
cd apps/discord-bot
node scripts/register-commands.js
exit
```

**C. Missing Permissions**

```bash
# Symptoms: Bot can't send messages or respond

# Fix: Update bot permissions
# 1. Go to Discord Developer Portal
# 2. OAuth2 > URL Generator
# 3. Select scopes: bot, applications.commands
# 4. Select permissions: Send Messages, Use Slash Commands, Read Messages
# 5. Reinvite bot with new URL
```

**D. Rate Limited**

```bash
# Symptoms in logs: "429 Too Many Requests"

# Fix: Wait for rate limit to reset (usually 10-60 seconds)
# Or: Implement command cooldowns in code
# Or: Reduce command usage frequency
```

**E. Gateway Connection Issues**

```bash
# Symptoms in logs: "WebSocket connection failed" or "Gateway timeout"

# Fix: Restart bot to reconnect
railway restart --service=discord-bot

# Monitor reconnection
railway logs --service=discord-bot --follow | grep -i "ready\|connected"
```

**Resolution Checklist:**

- [ ] Bot shows "Online" in Discord server
- [ ] Slash commands appear when typing `/`
- [ ] `/ping` command responds
- [ ] Health endpoint returns `ready: true`
- [ ] No errors in logs for 5 minutes

---

### 3. High Response Times

**Symptoms:**
- Commands take >5 seconds to respond
- Health checks timing out
- Users complaining about slowness

**Diagnosis:**

```bash
# Check service metrics
railway metrics

# Check for API timeouts
railway logs | grep -i "timeout\|slow\|exceeded"

# Test response times
time curl https://your-domain.com/health
time curl https://your-domain.com:8082/health
```

**Common Causes:**

**A. External API Delays**

```bash
# Symptoms: Slow AI or Trust Rollup responses

# Check OpenAI API status
curl https://status.openai.com/api/v2/status.json

# Temporary fix: Switch to mock mode
railway variables set OPENAI_API_KEY=""
railway restart

# Long-term fix: Implement timeouts and retries
# Or: Use faster model (gpt-4o-mini)
railway variables set OPENAI_MODEL="gpt-4o-mini"
railway restart
```

**B. Database Connection Issues**

```bash
# Symptoms in logs: "connection timeout" or "database slow"

# Check Supabase status
curl https://status.supabase.com/api/v2/status.json

# Fix: Enable connection pooling
# 1. Go to Supabase dashboard > Database > Connection pooling
# 2. Enable pooler
# 3. Update connection string
railway variables set SUPABASE_URL="postgres://pooler-url"
railway restart
```

**C. Cold Start Delays**

```bash
# Symptoms: First request after idle is slow

# Fix: Keep services warm with health checks
# Use UptimeRobot to ping every 5 minutes
# Or: Upgrade to Railway Pro for always-on instances
```

**D. Resource Constraints**

```bash
# Check memory and CPU usage
railway metrics

# If consistently high:
# 1. Upgrade Railway plan
# 2. Optimize code (reduce memory leaks)
# 3. Add caching
# 4. Scale horizontally
```

**Performance Optimization:**

```bash
# Enable caching (if not already)
# AI Gateway: 1 hour cache
# Trust Rollup: 6 hour cache

# Monitor cache hit rate
railway logs | grep -i "cache"

# Target: >60% cache hit rate
```

---

### 4. High Error Rates

**Symptoms:**
- Many commands fail
- Error logs increasing
- Users reporting issues

**Diagnosis:**

```bash
# Count errors in last hour
railway logs --since=1h | grep -i "error" | wc -l

# Find most common errors
railway logs | grep -i "error" | sort | uniq -c | sort -rn | head -10

# Check error rate
# Acceptable: <0.1% (1 error per 1000 requests)
# Warning: >1%
# Critical: >5%
```

**Common Error Types:**

**A. API Errors (401, 403, 429)**

```bash
# 401 Unauthorized - Invalid API key
railway variables get OPENAI_API_KEY
railway variables set OPENAI_API_KEY="valid_key"
railway restart

# 403 Forbidden - Missing permissions
# Check Discord bot permissions

# 429 Too Many Requests - Rate limited
# Implement backoff/retry logic or reduce request rate
```

**B. Network Errors (ECONNREFUSED, ETIMEDOUT)**

```bash
# Check external service status
curl https://status.openai.com/api/v2/status.json
curl https://status.supabase.com/api/v2/status.json

# Temporary fix: Use mock/fallback data
railway variables set USE_MOCK_TRUST_DATA="true"
railway restart

# Long-term fix: Implement circuit breakers and retries
```

**C. Application Errors (500, null reference, etc.)**

```bash
# Check for code bugs in logs
railway logs | grep -i "typeerror\|null\|undefined"

# Fix: Deploy patch
git pull origin main
# (Fix code)
pnpm build
railway up

# Or rollback if recent deployment
railway rollback
```

**D. Database Errors**

```bash
# Connection errors
railway logs | grep -i "database\|postgres\|supabase"

# Fix: Check connection string and credentials
railway variables | grep SUPABASE
bash scripts/validate-production-env.sh

# Or restart to clear connection pool
railway restart
```

---

### 5. High API Costs

**Symptoms:**
- OpenAI bill higher than expected
- Budget alerts triggered
- Cost trending upward

**Diagnosis:**

```bash
# Check current usage
# Go to https://platform.openai.com/usage

# Check recent API calls
railway logs | grep -i "openai" | tail -50

# Calculate daily cost
railway logs --since=24h | grep -i "tokens" | wc -l
```

**Common Causes:**

**A. Too Many API Calls**

```bash
# Check cache hit rate
railway logs | grep -i "cache" | grep -c "hit"
railway logs | grep -i "cache" | grep -c "miss"

# Target: >60% hit rate

# Fix: Improve caching
# 1. Increase cache TTL (carefully)
# 2. Add cache warming
# 3. Deduplicate similar requests
```

**B. Using Expensive Model**

```bash
# Check current model
railway variables get OPENAI_MODEL

# If using gpt-4 or gpt-4-turbo, switch to gpt-4o-mini
railway variables set OPENAI_MODEL="gpt-4o-mini"
railway restart

# Cost reduction: ~90% cheaper
```

**C. Large Context Windows**

```bash
# Check token usage in logs
railway logs | grep -i "tokens"

# Fix: Reduce prompt size
# 1. Limit conversation history
# 2. Summarize long inputs
# 3. Use shorter system prompts
```

**Immediate Cost Reduction:**

```bash
# Option 1: Switch to mock mode temporarily
railway variables set OPENAI_API_KEY=""
railway restart

# Option 2: Set hard limits in OpenAI dashboard
# https://platform.openai.com/account/limits
# Set hard limit: $50/month

# Option 3: Reduce request rate
# Implement per-user cooldowns
```

---

### 6. Database Issues

**Symptoms:**
- "Connection refused" errors
- "Too many connections"
- Slow queries
- Data not persisting

**Diagnosis:**

```bash
# Check Supabase status
curl https://status.supabase.com/api/v2/status.json

# Check connection
railway variables | grep SUPABASE

# Test connection
railway run --service=discord-bot node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);
supabase.from('test').select('*').then(console.log);
"
```

**Common Causes:**

**A. Invalid Credentials**

```bash
# Verify credentials
bash scripts/validate-production-env.sh

# Get fresh credentials from Supabase dashboard
# https://supabase.com/dashboard/project/_/settings/api

railway variables set SUPABASE_URL="https://xxx.supabase.co"
railway variables set SUPABASE_ANON_KEY="ey..."
railway variables set SUPABASE_SERVICE_ROLE_KEY="ey..."
railway restart
```

**B. Connection Pool Exhausted**

```bash
# Symptoms: "Too many connections"

# Fix: Enable connection pooling
# 1. Go to Supabase dashboard > Database > Connection pooling
# 2. Enable "Transaction" mode pooler
# 3. Use pooler connection string
railway variables set SUPABASE_URL="postgres://aws-0-us-east-1.pooler..."
railway restart
```

**C. Database Migrations Needed**

```bash
# Check for schema errors
railway logs | grep -i "schema\|migration\|column"

# Run migrations
railway run --service=discord-bot npm run db:migrate

# Or manually in Supabase SQL editor
```

**D. Storage Limit Reached**

```bash
# Check Supabase dashboard > Database > Usage
# Free tier: 500MB limit

# Fix: Archive or delete old data
# Or: Upgrade to Pro plan ($25/month, 8GB)
```

---

### 7. Memory Leaks

**Symptoms:**
- Services restarting frequently
- Memory usage growing over time
- "Out of memory" errors

**Diagnosis:**

```bash
# Check memory metrics
railway metrics

# Monitor over time
watch -n 10 railway metrics

# Check for leak indicators
railway logs | grep -i "heap\|memory\|out of memory"
```

**Common Causes:**

**A. Unclosed Connections**

```bash
# Check for connection leaks
railway logs | grep -i "connection\|pool"

# Fix: Ensure connections are closed
# Review code for missing .close() or .destroy() calls
```

**B. Event Listener Leaks**

```bash
# Symptoms: "MaxListenersExceededWarning"

# Fix: Remove listeners when done
# Use .once() instead of .on() for one-time events
# Clean up on process exit
```

**C. Large Caches**

```bash
# Check cache size
railway logs | grep -i "cache size"

# Fix: Implement cache size limits
# Add TTL to cache entries
# Use LRU cache eviction
```

**Immediate Fix:**

```bash
# Restart to clear memory
railway restart

# Monitor for recurrence
railway logs --follow | grep -i "memory"
```

**Long-term Fix:**

1. Profile application with heapdump
2. Identify leak source
3. Fix code
4. Deploy patch
5. Monitor memory over 24 hours

---

### 8. Deployment Failures

**Symptoms:**
- `railway up` fails
- Build errors
- Deployment stuck "in progress"

**Diagnosis:**

```bash
# Check deployment status
railway deployments

# View build logs
railway logs | grep -i "build"

# Check for syntax errors
pnpm lint
pnpm build
```

**Common Causes:**

**A. Build Errors**

```bash
# Test build locally
pnpm install --frozen-lockfile
pnpm build

# Fix errors
# Then deploy
railway up
```

**B. Docker Build Failure**

```bash
# Test Docker build locally
docker compose build

# Check Dockerfile syntax
docker compose config
```

**C. Insufficient Resources**

```bash
# Symptoms: "Out of memory during build"

# Fix: Upgrade Railway plan for more build resources
# Or: Optimize build process
# - Reduce dependencies
# - Use build cache
# - Split large builds
```

**D. Stuck Deployment**

```bash
# Cancel stuck deployment
railway deployment cancel

# Force new deployment
railway up --force
```

---

## Service-Specific Troubleshooting

### Discord Bot

**Common Issues:**

1. **Bot offline**: Check token, restart service
2. **Commands not working**: Re-register commands
3. **Permissions errors**: Update bot permissions in Discord
4. **Rate limited**: Implement cooldowns

**Debug Commands:**

```bash
# Check bot status
curl https://your-domain.com:8081/health

# View bot logs
railway logs --service=discord-bot --follow

# Test command registration
railway run --service=discord-bot node apps/discord-bot/scripts/register-commands.js
```

### Trust Rollup

**Common Issues:**

1. **Slow responses**: Check API status, enable mock data
2. **Incorrect scores**: Verify API keys, check data source
3. **Cache issues**: Clear cache, adjust TTL

**Debug Commands:**

```bash
# Check service status
curl https://your-domain.com:8082/health

# Test trust score
curl https://your-domain.com:8082/trust/stake.com

# Check data source
railway logs --service=trust-rollup | grep -i "source\|api\|mock"
```

### Dashboard

**Common Issues:**

1. **Won't load**: Check build, verify port
2. **Events not showing**: Check event router connection
3. **Authentication failing**: Verify JWT secret

**Debug Commands:**

```bash
# Check dashboard status
curl https://your-domain.com:5055/api/health

# View dashboard logs
railway logs --service=dashboard --follow
```

---

## Emergency Procedures

### Immediate Rollback

```bash
# Quick rollback to previous version
railway rollback

# Verify services are healthy
bash scripts/verify-railway-deployment.sh
```

### Complete Service Restart

```bash
# Restart all services
railway restart

# Wait 30 seconds
sleep 30

# Verify health
bash scripts/verify-railway-deployment.sh
```

### Switch to Safe Mode

```bash
# Disable all external APIs (use mocks)
railway variables set OPENAI_API_KEY=""
railway variables set USE_MOCK_TRUST_DATA="true"
railway restart

# Monitor for stability
railway logs --follow
```

### Nuclear Option (Full Reset)

```bash
# Only use if everything is broken

# 1. Backup current config
railway variables > backup-env.txt

# 2. Stop all services
railway down

# 3. Restore from backup
# Use Supabase dashboard to restore database

# 4. Redeploy
railway up

# 5. Restore environment
railway variables import backup-env.txt

# 6. Verify
bash scripts/verify-railway-deployment.sh
```

---

## Getting Help

### Self-Service Resources

1. **Check documentation:**
   - [Production Runbook](./PRODUCTION-RUNBOOK.md)
   - [Production Monitoring](./PRODUCTION-MONITORING.md)
   - [Railway Deployment Guide](./RAILWAY-DEPLOYMENT-GUIDE.md)

2. **Search logs:**
   ```bash
   railway logs | grep -i "error_message"
   ```

3. **Check service status pages:**
   - Railway: https://railway.app/status
   - OpenAI: https://status.openai.com
   - Supabase: https://status.supabase.com
   - Discord: https://discordstatus.com

4. **Review recent changes:**
   ```bash
   git log --oneline -10
   railway deployments
   ```

### Escalation

**When to escalate:**
- P0 incidents (all services down)
- Security incidents
- Data loss
- Cannot resolve after 30 minutes

**How to escalate:**

1. **Gather information:**
   ```bash
   # Save current state
   railway status > incident-status.txt
   railway logs > incident-logs.txt
   railway variables > incident-env.txt
   
   # Create incident report
   echo "Incident: [Brief description]" > incident.txt
   echo "Time: $(date)" >> incident.txt
   echo "Services affected: [List]" >> incident.txt
   echo "Impact: [User impact]" >> incident.txt
   echo "Steps taken: [What you tried]" >> incident.txt
   ```

2. **Contact support:**
   - TiltCheck team: jme@tiltcheck.me
   - Railway support: https://railway.app/help
   - Discord support: https://discord.com/developers/docs

3. **Open GitHub issue:**
   - Include incident report
   - Attach logs (sanitize sensitive data!)
   - Add relevant labels

---

## Post-Incident

### Incident Review

After resolving an incident:

1. **Document what happened:**
   - Timeline of events
   - Root cause
   - Impact (users, duration, cost)
   - Resolution steps

2. **Create post-mortem:**
   - What went wrong
   - Why it happened
   - How it was fixed
   - How to prevent it

3. **Implement improvements:**
   - Add monitoring
   - Update runbook
   - Fix root cause
   - Add tests

4. **Share learnings:**
   - Update documentation
   - Train team
   - Improve alerts

---

## Additional Resources

- [Production Runbook](./PRODUCTION-RUNBOOK.md) - Operational procedures
- [Production Monitoring](./PRODUCTION-MONITORING.md) - Monitoring setup
- [Health Check Guide](./HEALTH-CHECK-GUIDE.md) - Health check details
- [Railway Docs](https://docs.railway.app/) - Railway documentation
- [Discord API Docs](https://discord.com/developers/docs) - Discord API reference

---

**Need help?** Contact: jme@tiltcheck.me
