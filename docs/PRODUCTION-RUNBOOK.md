# TiltCheck Production Runbook

**Version:** 1.0  
**Last Updated:** December 8, 2025  
**Status:** Production Ready

## Overview

This runbook provides operational procedures for managing TiltCheck in production. It covers common tasks, incident response, and troubleshooting steps for on-call engineers and operators.

---

## Quick Reference

### Essential Commands

```bash
# Check service status
railway status

# View logs (all services)
railway logs --follow

# View logs (specific service)
railway logs --service=discord-bot --follow

# Restart a service
railway restart --service=discord-bot

# Check environment variables
railway variables

# Verify deployment health
bash scripts/verify-railway-deployment.sh
```

### Service Health Endpoints

| Service | Endpoint | Expected Response |
|---------|----------|-------------------|
| Landing | `https://your-domain.com/health` | `{"status":"ok","ready":true}` |
| Dashboard | `https://your-domain.com:5055/api/health` | `{"status":"ok","ready":true}` |
| Discord Bot | `https://your-domain.com:8081/health` | `{"status":"ok","ready":true}` |
| Trust Rollup | `https://your-domain.com:8082/health` | `{"status":"ok","ready":true}` |

### Critical Contacts

- **Primary On-Call:** [Your contact]
- **Secondary On-Call:** [Backup contact]
- **Railway Support:** https://railway.app/help
- **Discord Developer Support:** https://discord.com/developers/docs
- **Security Issues:** jme@tiltcheck.me

---

## Common Operational Tasks

### 1. Deploying Code Changes

**Prerequisites:**
- Code reviewed and merged to main branch
- All tests passing locally
- Build successful locally

**Procedure:**

```bash
# 1. Pull latest changes
git pull origin main

# 2. Verify build and tests
pnpm install --frozen-lockfile
pnpm build
pnpm test

# 3. Deploy to Railway
railway up

# 4. Monitor deployment
railway logs --follow

# 5. Verify health after 2 minutes
bash scripts/verify-railway-deployment.sh

# 6. Test critical paths
# - Check Discord bot responds to /tiltcheck help
# - Verify trust scores work
# - Test landing page loads
```

**Rollback if issues:**

```bash
# Quick rollback to previous deployment
railway rollback

# Or revert git commits and redeploy
git revert HEAD
git push origin main
railway up
```

### 2. Updating Environment Variables

**Procedure:**

```bash
# 1. Set new variable
railway variables set VARIABLE_NAME="new_value"

# 2. Verify variable is set
railway variables | grep VARIABLE_NAME

# 3. Restart affected services
railway restart --service=discord-bot

# 4. Monitor for errors
railway logs --service=discord-bot --follow

# 5. Verify service health
curl https://your-domain.com:8081/health
```

**Critical Variables:**
- `DISCORD_TOKEN` - Restart discord-bot
- `OPENAI_API_KEY` - Restart discord-bot and dashboard
- `SUPABASE_*` - Restart all services
- `NODE_ENV` - Restart all services

### 3. Rotating API Keys

**Discord Bot Token:**

```bash
# 1. Generate new token in Discord Developer Portal
# https://discord.com/developers/applications

# 2. Update Railway
railway variables set DISCORD_TOKEN="new_token_here"

# 3. Restart bot
railway restart --service=discord-bot

# 4. Verify bot is online in Discord
# 5. Test with /ping command
```

**OpenAI API Key:**

```bash
# 1. Generate new key at https://platform.openai.com/api-keys
# 2. Update Railway
railway variables set OPENAI_API_KEY="sk-new-key-here"

# 3. Restart services
railway restart

# 4. Verify AI features work
# Test a command that uses AI
```

**Supabase Keys:**

```bash
# 1. Rotate keys in Supabase dashboard
# https://supabase.com/dashboard/project/_/settings/api

# 2. Update all three keys
railway variables set SUPABASE_URL="https://new-project.supabase.co"
railway variables set SUPABASE_ANON_KEY="new_anon_key"
railway variables set SUPABASE_SERVICE_ROLE_KEY="new_service_key"

# 3. Restart all services
railway restart

# 4. Verify database connectivity
railway logs | grep -i supabase
```

### 4. Scaling Services

**Vertical Scaling (Increase Resources):**

```bash
# Railway auto-scales, but you can upgrade plan
# Go to Railway dashboard > Settings > Plan
# Choose Pro or Team plan for more resources
```

**Horizontal Scaling:**

```bash
# For high traffic, deploy multiple instances
# This requires Railway Pro/Team plan

# 1. Create new service instance
railway service create discord-bot-replica

# 2. Deploy same code
railway up --service=discord-bot-replica

# 3. Configure load balancing in Railway dashboard
```

### 5. Database Maintenance

**Backup Supabase Data:**

```bash
# 1. Go to Supabase dashboard
# https://supabase.com/dashboard/project/_/database/backups

# 2. Enable automatic backups (free tier: 7 days)
# Pro tier: 30 days of backups

# 3. Manual backup via CLI
supabase db dump -f backup-$(date +%Y%m%d).sql

# 4. Store backup securely (S3, Google Drive, etc.)
```

**Restore from Backup:**

```bash
# 1. Download backup from Supabase dashboard
# 2. Restore via CLI
supabase db reset
psql -h db.your-project.supabase.co -U postgres -f backup.sql
```

### 6. Monitoring and Alerts

**Setting Up Uptime Monitoring:**

1. Create account at UptimeRobot or similar
2. Add monitors for:
   - Landing page: `https://your-domain.com/health`
   - Dashboard: `https://your-domain.com:5055/api/health`
   - Discord bot: `https://your-domain.com:8081/health`
   - Trust rollup: `https://your-domain.com:8082/health`
3. Configure alerts (email, SMS, Slack)
4. Set check interval: 5 minutes

**Setting Up Log Aggregation:**

```bash
# Option 1: Railway built-in logs
railway logs --follow | tee -a production-logs.txt

# Option 2: External service (Logflare, Datadog, etc.)
# Configure in Railway dashboard > Integrations
```

**Cost Monitoring:**

```bash
# 1. OpenAI costs
# Go to https://platform.openai.com/usage
# Set usage limits in Settings > Limits

# 2. Railway costs
# Go to Railway dashboard > Usage
# Track monthly spend and resource usage

# 3. Supabase costs
# Go to Supabase dashboard > Billing
# Monitor database size and API requests
```

---

## Incident Response

### Severity Levels

**P0 - Critical (Immediate Response)**
- All services down
- Discord bot completely offline
- Data loss or corruption
- Security breach

**P1 - High (Response within 1 hour)**
- Single service down
- Major feature not working
- Performance severely degraded
- API costs spiking

**P2 - Medium (Response within 4 hours)**
- Minor feature degradation
- Non-critical errors in logs
- Slow performance
- Single user impact

**P3 - Low (Response within 24 hours)**
- Cosmetic issues
- Feature requests
- Documentation updates

### Incident Response Workflow

1. **Acknowledge** - Confirm you're responding
2. **Assess** - Determine severity and impact
3. **Communicate** - Notify team and users if needed
4. **Mitigate** - Stop the bleeding (rollback, disable feature)
5. **Resolve** - Fix the root cause
6. **Document** - Write post-mortem

### Common Incidents

#### Service Won't Start

**Symptoms:**
- Service shows as "crashed" in Railway
- Health endpoint unreachable
- Continuous restart loop

**Diagnosis:**

```bash
# 1. Check logs for errors
railway logs --service=discord-bot | tail -100

# 2. Check environment variables
railway variables

# 3. Check recent deployments
railway deployments
```

**Resolution:**

```bash
# Option 1: Rollback deployment
railway rollback

# Option 2: Fix environment variable
railway variables set MISSING_VAR="value"
railway restart --service=discord-bot

# Option 3: Redeploy
railway up
```

#### Discord Bot Not Responding

**Symptoms:**
- Bot shows offline in Discord
- Commands don't respond
- Health endpoint fails

**Diagnosis:**

```bash
# 1. Check bot health
curl https://your-domain.com:8081/health

# 2. Check bot logs
railway logs --service=discord-bot | tail -50

# 3. Verify token is valid
railway variables | grep DISCORD_TOKEN
```

**Resolution:**

```bash
# 1. Restart bot
railway restart --service=discord-bot

# 2. If token expired, rotate it
railway variables set DISCORD_TOKEN="new_token"
railway restart --service=discord-bot

# 3. Re-register commands if needed
railway run node apps/discord-bot/scripts/register-commands.js
```

#### High API Costs

**Symptoms:**
- OpenAI bill higher than expected
- API rate limits hit
- Performance degraded

**Diagnosis:**

```bash
# 1. Check OpenAI usage
# https://platform.openai.com/usage

# 2. Check recent logs for API calls
railway logs | grep -i openai | tail -100

# 3. Check cache hit rate
# Should be >60% for optimal cost
```

**Resolution:**

```bash
# Immediate: Switch to mock mode
railway variables set OPENAI_API_KEY=""
railway restart

# Or: Set usage limits in OpenAI dashboard
# https://platform.openai.com/account/limits

# Or: Optimize cache TTL
# Check services/ai-gateway/src/index.ts
# Default cache: 1 hour
```

#### Database Connection Errors

**Symptoms:**
- "Connection refused" errors
- Timeout errors
- "Too many connections"

**Diagnosis:**

```bash
# 1. Check Supabase status
# https://status.supabase.com

# 2. Check connection string
railway variables | grep SUPABASE

# 3. Check connection pool
# Supabase dashboard > Database > Connection pooling
```

**Resolution:**

```bash
# 1. Restart services
railway restart

# 2. If persistent, enable connection pooling
# Supabase dashboard > Database > Connection pooling > Enable

# 3. Update connection string to use pooler
railway variables set SUPABASE_URL="postgres://pooler-url"
railway restart

# 4. If still failing, increase Supabase plan
# Or reduce concurrent connections
```

#### Memory Leaks

**Symptoms:**
- Services restarting frequently
- Memory usage growing over time
- "Out of memory" errors

**Diagnosis:**

```bash
# 1. Check resource usage
railway metrics

# 2. Monitor memory over time
railway logs | grep -i memory

# 3. Check for unclosed connections
railway logs | grep -i "too many"
```

**Resolution:**

```bash
# Immediate: Restart service
railway restart --service=discord-bot

# Long-term: Fix code
# - Close database connections
# - Clear caches periodically
# - Use connection pooling
# - Profile with heapdump

# Temporary: Increase resources
# Upgrade Railway plan for more memory
```

---

## Performance Optimization

### Monitoring Baselines

**Expected Performance:**
- Health check response: <200ms
- Discord command response: <2s
- Trust score lookup: <1s
- Landing page load: <1s
- API calls: <500ms

**Resource Usage:**
- Memory: <512MB per service
- CPU: <30% average
- Network: <10GB/month total

### Optimization Checklist

**AI Gateway:**
- [ ] Cache enabled (1 hour TTL)
- [ ] Using gpt-4o-mini for cost efficiency
- [ ] Rate limiting configured
- [ ] Response streaming enabled

**Trust Rollup:**
- [ ] Cache enabled (6 hour TTL)
- [ ] Mock data for non-critical casinos
- [ ] API calls batched when possible
- [ ] Stale-while-revalidate strategy

**Database:**
- [ ] Connection pooling enabled
- [ ] Indexes on frequently queried fields
- [ ] Old data archived monthly
- [ ] Queries optimized (<100ms)

**Discord Bot:**
- [ ] Command cooldowns configured
- [ ] Rate limiting per user
- [ ] Message caching enabled
- [ ] Slash commands used (not prefix)

---

## Security Procedures

### Security Incident Response

**Severity P0 - Immediate:**
- API keys leaked in public repo
- Unauthorized access detected
- Data breach confirmed
- DDoS attack in progress

**Immediate Actions:**

```bash
# 1. Rotate all API keys immediately
railway variables set DISCORD_TOKEN="new_token"
railway variables set OPENAI_API_KEY="new_key"
railway variables set SUPABASE_SERVICE_ROLE_KEY="new_key"

# 2. Force restart all services
railway restart

# 3. Check for unauthorized deployments
railway deployments

# 4. Review access logs
railway logs | grep -i "unauthorized\|error\|failed"

# 5. Notify security contact
# Email: jme@tiltcheck.me
```

### Regular Security Tasks

**Weekly:**
- [ ] Review access logs for anomalies
- [ ] Check Railway deployment history
- [ ] Verify environment variables unchanged
- [ ] Test bot command permissions

**Monthly:**
- [ ] Rotate Discord bot token
- [ ] Review API key usage
- [ ] Check for dependency vulnerabilities: `pnpm audit`
- [ ] Review user permissions in Supabase

**Quarterly:**
- [ ] Full security audit
- [ ] Penetration testing
- [ ] Review and update security policies
- [ ] Train team on security procedures

---

## Disaster Recovery

### Backup Strategy

**What to Backup:**
1. **Database** - Supabase auto-backups (7-30 days)
2. **Environment Variables** - Export monthly
3. **Code** - Git repository (already backed up)
4. **Logs** - Archive weekly (if not using external service)

**Backup Procedures:**

```bash
# 1. Export environment variables
railway variables > env-backup-$(date +%Y%m%d).txt

# 2. Backup Supabase data
# https://supabase.com/dashboard/project/_/database/backups

# 3. Archive logs
railway logs > logs-$(date +%Y%m%d).txt
gzip logs-$(date +%Y%m%d).txt

# 4. Store securely (encrypt and upload)
```

### Recovery Procedures

**Full System Recovery:**

```bash
# 1. Create new Railway project
railway init

# 2. Restore environment variables
railway variables import env-backup.txt

# 3. Deploy code
railway up

# 4. Restore database
# Use Supabase dashboard to restore from backup

# 5. Verify all services
bash scripts/verify-railway-deployment.sh

# 6. Re-register Discord bot commands
railway run node apps/discord-bot/scripts/register-commands.js
```

**Partial Service Recovery:**

```bash
# 1. Identify failed service
railway status

# 2. Check recent changes
railway deployments

# 3. Rollback to working version
railway rollback

# 4. Verify health
curl https://your-domain.com:PORT/health
```

---

## Maintenance Windows

### Scheduled Maintenance

**When to Schedule:**
- Major version upgrades
- Database migrations
- Infrastructure changes
- Security patches

**Maintenance Procedure:**

1. **Plan (1 week before)**
   - Document changes
   - Test in staging
   - Notify users (Discord announcement)

2. **Prepare (1 day before)**
   - Backup all data
   - Verify rollback procedure
   - Coordinate with team

3. **Execute (Maintenance window)**
   - Enable maintenance mode
   - Apply changes
   - Run health checks
   - Monitor for 30 minutes

4. **Complete**
   - Disable maintenance mode
   - Notify users (complete)
   - Document any issues
   - Schedule retrospective

**Maintenance Mode:**

```bash
# Enable maintenance mode
# (Returns 503 for all requests except /health)
railway variables set MAINTENANCE_MODE="true"
railway restart

# Disable maintenance mode
railway variables set MAINTENANCE_MODE="false"
railway restart
```

---

## Metrics and KPIs

### Service Health Metrics

**Availability:**
- Target: 99.9% uptime (43 minutes downtime/month)
- Measure: Uptime monitoring service
- Alert: <99% in 24 hours

**Performance:**
- Target: <2s response time (p95)
- Measure: Railway metrics + APM
- Alert: >5s response time

**Error Rate:**
- Target: <0.1% error rate
- Measure: Log analysis
- Alert: >1% error rate in 1 hour

### Business Metrics

**Discord Bot:**
- Commands executed per day
- Unique users per day
- Command success rate
- Average response time

**Trust Engine:**
- Trust score requests per day
- Cache hit rate
- Data source (api vs mock) ratio
- Average score accuracy

**Costs:**
- Railway monthly cost
- OpenAI API costs
- Supabase costs
- Total cost per active user

---

## Changelog

### Version 1.0 (December 8, 2025)
- Initial production runbook
- Common operational tasks
- Incident response procedures
- Security and disaster recovery
- Performance monitoring

---

## Additional Resources

- [Production Deployment Checklist](./PRODUCTION-DEPLOYMENT-CHECKLIST.md)
- [Railway Deployment Guide](./RAILWAY-DEPLOYMENT-GUIDE.md)
- [AI Gateway Production](./AI-GATEWAY-PRODUCTION.md)
- [Trust Rollup Production](./TRUST-ROLLUP-PRODUCTION.md)
- [Health Check Guide](./HEALTH-CHECK-GUIDE.md)

---

**For emergencies, contact:** jme@tiltcheck.me  
**Railway support:** https://railway.app/help  
**Discord support:** https://discord.com/developers/docs
