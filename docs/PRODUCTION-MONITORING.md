# TiltCheck Production Monitoring & Alerting Guide

**Version:** 1.0  
**Last Updated:** December 8, 2025  
**Status:** Production Ready

## Overview

This guide provides comprehensive monitoring and alerting setup for TiltCheck in production. It covers health monitoring, performance metrics, cost tracking, and alerting strategies.

---

## Monitoring Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Production Services                       │
├──────────────┬──────────────┬──────────────┬────────────────┤
│   Landing    │   Dashboard  │ Discord Bot  │  Trust Rollup  │
│   :8080      │   :5055      │   :8081      │   :8082        │
└──────┬───────┴──────┬───────┴──────┬───────┴───────┬────────┘
       │              │              │               │
       ▼              ▼              ▼               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Health Endpoints                          │
│  GET /health      GET /api/health   GET /health   GET /health│
└──────┬───────────────┬──────────────┬──────────────┬────────┘
       │               │              │              │
       ▼               ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Monitoring Layer                          │
├──────────────┬──────────────┬──────────────┬────────────────┤
│  UptimeRobot │ Railway Logs │  OpenAI API  │   Supabase     │
│  (Health)    │ (Debugging)  │  (AI Costs)  │  (Database)    │
└──────────────┴──────────────┴──────────────┴────────────────┘
       │               │              │              │
       ▼               ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Alerting Channels                         │
│    Email    │    Discord   │    SMS      │   PagerDuty      │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Start Setup

### 1. Basic Health Monitoring (Free)

**UptimeRobot Setup (5 minutes):**

1. Create free account: https://uptimerobot.com
2. Add monitors:
   ```
   Landing:       https://your-domain.com/health
   Dashboard:     https://your-domain.com:5055/api/health
   Discord Bot:   https://your-domain.com:8081/health
   Trust Rollup:  https://your-domain.com:8082/health
   ```
3. Configure alerts:
   - Email: Your email
   - Check interval: 5 minutes
   - Alert when: Down for 2 minutes

**Expected result:**
- ✅ Email alerts when services go down
- ✅ Public status page (optional)
- ✅ Uptime history and reports

### 2. Log Monitoring (Railway Built-in)

```bash
# Real-time monitoring
railway logs --follow

# Filter by service
railway logs --service=discord-bot --follow

# Search for errors
railway logs | grep -i "error\|exception\|failed"

# Export logs
railway logs > production-logs-$(date +%Y%m%d).txt
```

### 3. Cost Monitoring (Free)

**OpenAI API:**
1. Go to https://platform.openai.com/usage
2. Set up usage limits:
   - Navigate to Settings > Limits
   - Set hard limit: $50/month (recommended)
   - Set soft limit: $30/month (for warning)
3. Enable email alerts

**Railway:**
1. Go to Railway dashboard > Usage
2. Monitor monthly spend
3. Set up billing alerts (if available)

**Supabase:**
1. Go to Supabase dashboard > Billing
2. Monitor database size and API requests
3. Set up usage alerts

---

## Health Check Monitoring

### Built-in Health Endpoints

All TiltCheck services expose standardized health endpoints:

**Response Format:**
```json
{
  "status": "ok",
  "ready": true,
  "service": "service-name",
  "version": "0.1.0",
  "timestamp": "2025-12-08T00:00:00.000Z",
  "uptime": 3600,
  "dependencies": {
    "database": "ok",
    "cache": "ok",
    "external_api": "degraded"
  }
}
```

**Health States:**
- `status: "ok"` - Service is running
- `ready: true` - Service is accepting traffic
- `ready: false` - Service is starting or degraded

### Automated Health Checks

**Local Script (check-health.sh):**

```bash
# Run health checks locally
bash scripts/check-health.sh

# With custom settings
REQUIRE_READY=true WAIT_ATTEMPTS=30 bash scripts/check-health.sh
```

**Railway Verification Script:**

```bash
# Full deployment verification
bash scripts/verify-railway-deployment.sh

# With custom domain
RAILWAY_DOMAIN="your-domain.com" bash scripts/verify-railway-deployment.sh
```

### UptimeRobot Configuration

**Monitor Settings:**
- Monitor Type: HTTP(s)
- Check Interval: 5 minutes (free tier)
- Monitor Timeout: 30 seconds
- Alert Contacts: Email, SMS, Webhook

**Advanced Settings:**
```
Keyword Monitoring: "ready":true
Expected Status Code: 200
Custom HTTP Headers: None required
```

**Alert Settings:**
```
Alert When Down For: 2 minutes (2 checks)
Alert When Back Up: Yes
Send Alerts To: All contacts
Alert Frequency: Every time
```

---

## Performance Monitoring

### Key Performance Indicators (KPIs)

**Service Level Objectives (SLOs):**

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Availability | 99.9% | <99.5% | <99% |
| Response Time (p95) | <2s | >5s | >10s |
| Error Rate | <0.1% | >1% | >5% |
| Memory Usage | <512MB | >768MB | >1GB |
| CPU Usage | <30% | >60% | >80% |

### Railway Metrics

**View Metrics:**
```bash
# Service metrics
railway metrics

# Resource usage over time
railway metrics --time 24h

# Specific service
railway metrics --service=discord-bot
```

**Metrics Available:**
- CPU usage (%)
- Memory usage (MB)
- Network traffic (GB)
- Request count
- Response time (ms)

### Application Performance Monitoring (APM)

**Option 1: Railway Built-in (Free)**
- Basic metrics in Railway dashboard
- CPU, memory, network usage
- Deployment history
- Log analysis

**Option 2: Sentry (Recommended for Errors)**

1. Create account: https://sentry.io (free tier: 5k errors/month)
2. Install SDK:
   ```bash
   pnpm add @sentry/node @sentry/integrations
   ```
3. Configure in services:
   ```typescript
   import * as Sentry from "@sentry/node";
   
   Sentry.init({
     dsn: process.env.SENTRY_DSN,
     environment: process.env.NODE_ENV,
     tracesSampleRate: 0.1,
   });
   ```
4. Update Railway variables:
   ```bash
   railway variables set SENTRY_DSN="your_sentry_dsn"
   railway restart
   ```

**Option 3: Datadog (Enterprise)**
- Full APM and infrastructure monitoring
- Cost: ~$15/host/month
- Best for large-scale deployments

### Custom Metrics Collection

**Event Tracking:**

Create a metrics collection service to track business metrics:

```typescript
// Track command usage
metrics.increment('discord.commands.executed', {
  command: 'trust',
  user_id: userId,
  success: true
});

// Track response times
metrics.timing('trust_rollup.score_lookup', duration);

// Track API costs
metrics.gauge('openai.cost_per_day', dailyCost);
```

**Storage Options:**
- In-memory (lightweight, no persistence)
- Supabase (persist in database)
- External service (Datadog, New Relic)

---

## Log Management

### Railway Logs

**Basic Log Viewing:**

```bash
# Stream all logs
railway logs --follow

# Last 100 lines
railway logs | tail -100

# Specific service
railway logs --service=discord-bot --follow

# Time range (if supported)
railway logs --since=1h
railway logs --until=10m
```

**Log Filtering:**

```bash
# Errors only
railway logs | grep -i "error"

# Specific error type
railway logs | grep -i "timeout\|connection refused"

# Success metrics
railway logs | grep -i "success\|completed"

# API calls
railway logs | grep -i "openai\|api"
```

### Log Aggregation (Optional)

**Logflare (Free Tier):**

1. Create account: https://logflare.app
2. Create source for each service
3. Get source tokens
4. Configure Railway integration:
   ```bash
   railway variables set LOGFLARE_SOURCE_TOKEN="your_token"
   railway restart
   ```

**Benefits:**
- Searchable logs
- Custom dashboards
- Retention (14 days free tier)
- Alerting rules

**Alternatives:**
- Papertrail (free: 50MB/month)
- Logtail (free: 1GB/month)
- Datadog Logs (paid)

### Structured Logging

**Best Practices:**

```typescript
// Use structured JSON logs
logger.info({
  event: 'command_executed',
  command: 'trust',
  user_id: userId,
  casino: 'stake.com',
  score: 85,
  duration_ms: 250,
  timestamp: new Date().toISOString()
});

// Include correlation IDs
logger.info({
  correlation_id: requestId,
  event: 'api_call',
  service: 'openai',
  model: 'gpt-4o-mini',
  tokens: 150,
  cost_usd: 0.0001
});
```

**Log Levels:**
- `DEBUG` - Development only
- `INFO` - General events
- `WARN` - Degraded but functional
- `ERROR` - Failures, retry attempted
- `FATAL` - Critical failures, service down

---

## Alerting Configuration

### Alert Priority Levels

**P0 - Critical (Page immediately)**
- All services down
- Database unreachable
- Security breach
- Data corruption

**P1 - High (Alert within 5 minutes)**
- Single service down >5 minutes
- Error rate >5%
- Response time >10s
- API costs 2x normal

**P2 - Medium (Alert within 30 minutes)**
- Service degraded (ready: false)
- Error rate >1%
- Response time >5s
- Memory usage >80%

**P3 - Low (Daily digest)**
- Warning logs
- Performance degradation
- Cost trending up
- Cache miss rate high

### Alert Channels

**Email (Built-in):**
- UptimeRobot: Automatic
- OpenAI: Usage alerts in platform
- Railway: Deployment notifications
- Sentry: Error notifications

**Discord Webhook:**

1. Create webhook in Discord server
2. Configure in monitoring tools:
   ```bash
   railway variables set DISCORD_WEBHOOK_URL="your_webhook"
   ```
3. Send formatted alerts:
   ```typescript
   await fetch(process.env.DISCORD_WEBHOOK_URL, {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       embeds: [{
         title: '🚨 Service Down',
         description: 'Discord bot is offline',
         color: 0xFF0000,
         timestamp: new Date().toISOString()
       }]
     })
   });
   ```

**SMS (Critical Only):**
- Use Twilio for P0 alerts
- Configure in UptimeRobot for downtime
- Keep costs low (reserve for emergencies)

**PagerDuty (Optional):**
- For on-call rotation
- Escalation policies
- Cost: ~$21/user/month

### Alert Routing

**By Severity:**
```
P0 → SMS + Email + Discord + Page
P1 → Email + Discord
P2 → Email (batched)
P3 → Daily digest email
```

**By Service:**
```
Discord Bot → Primary on-call
Trust Rollup → Data team
Landing/Dashboard → Frontend team
Database → Backend team
```

**By Time:**
```
Business hours (9-5): All alerts
After hours: P0 and P1 only
Weekends: P0 only
```

---

## Cost Monitoring

### OpenAI API Costs

**Track Usage:**

1. Go to https://platform.openai.com/usage
2. View daily usage and costs
3. Set up alerts:
   - Soft limit: $30/month (warning email)
   - Hard limit: $50/month (API disabled)

**Optimize Costs:**

```bash
# Switch to cheaper model
railway variables set OPENAI_MODEL="gpt-4o-mini"
railway restart

# Monitor cache hit rate (should be >60%)
railway logs | grep -i "cache"

# Reduce unnecessary AI calls
# Review command logs to identify patterns
```

**Expected Costs (gpt-4o-mini):**
- Light usage: $5-10/month (100 requests/day)
- Medium usage: $20-30/month (500 requests/day)
- Heavy usage: $50-100/month (2000 requests/day)

### Railway Costs

**Monitor Usage:**

```bash
# View current month usage
railway metrics --time 30d

# Check resource consumption
railway status
```

**Plan Options:**
- Hobby: $5/month (500 execution hours)
- Pro: $20/month (unlimited execution)
- Team: $20/user/month (collaboration features)

**Optimize:**
- Reduce idle services
- Optimize memory usage
- Use caching to reduce API calls
- Right-size service resources

### Supabase Costs

**Monitor Usage:**

1. Go to Supabase dashboard > Billing
2. Check:
   - Database size (free: 500MB)
   - API requests (free: unlimited)
   - Bandwidth (free: 2GB)

**Plan Options:**
- Free: $0/month (500MB database)
- Pro: $25/month (8GB database, better performance)

**Optimize:**
- Archive old data monthly
- Use connection pooling
- Optimize queries
- Enable row-level security

### Total Cost Tracking

**Monthly Budget Example:**

| Service | Free Tier | Hobby | Production |
|---------|-----------|-------|------------|
| Railway | - | $5 | $20 |
| OpenAI | - | - | $30 |
| Supabase | $0 | $0 | $25 |
| UptimeRobot | $0 | $0 | $0 |
| Domain | - | $1 | $1 |
| **Total** | **$0** | **$6** | **$76** |

**Cost Alerts:**

Create monthly budget review:
```bash
# Calculate total costs
openai_cost=$(curl https://platform.openai.com/usage | jq '.total')
railway_cost=$(railway billing current-month)
supabase_cost=25  # Fixed monthly

total_cost=$((openai_cost + railway_cost + supabase_cost))

if (( total_cost > 100 )); then
  echo "⚠️  Monthly costs exceeded $100: $total_cost"
  # Send alert
fi
```

---

## Dashboard Setup

### Basic Status Dashboard

**Option 1: UptimeRobot Public Status Page (Free)**

1. Go to UptimeRobot > Status Pages
2. Create new status page
3. Add all monitors
4. Customize domain (optional)
5. Share URL with team

**Benefits:**
- No coding required
- Public visibility option
- Incident history
- Subscriber notifications

**Option 2: Custom Dashboard with Railway Data**

Create simple HTML dashboard:

```html
<!DOCTYPE html>
<html>
<head>
  <title>TiltCheck Status</title>
</head>
<body>
  <h1>TiltCheck Production Status</h1>
  <div id="status">
    <div class="service">
      <h2>Discord Bot</h2>
      <span class="status" id="bot-status">Checking...</span>
    </div>
    <div class="service">
      <h2>Trust Rollup</h2>
      <span class="status" id="rollup-status">Checking...</span>
    </div>
  </div>
  
  <script>
    async function checkHealth(service, url) {
      try {
        const res = await fetch(url);
        const data = await res.json();
        const elem = document.getElementById(`${service}-status`);
        elem.textContent = data.ready ? '✅ Healthy' : '⚠️ Degraded';
        elem.className = data.ready ? 'healthy' : 'warning';
      } catch (e) {
        const elem = document.getElementById(`${service}-status`);
        elem.textContent = '❌ Down';
        elem.className = 'error';
      }
    }
    
    setInterval(() => {
      checkHealth('bot', 'https://your-domain.com:8081/health');
      checkHealth('rollup', 'https://your-domain.com:8082/health');
    }, 5000);
  </script>
</body>
</html>
```

### Metrics Dashboard

**Grafana + Prometheus (Advanced)**

For comprehensive metrics visualization:

1. Deploy Prometheus to collect metrics
2. Deploy Grafana for visualization
3. Configure data sources
4. Create custom dashboards

**Cost:** ~$10-30/month for hosting

**Alternative:** Use Railway's built-in metrics dashboard

---

## Monitoring Checklist

### Daily Tasks
- [ ] Check UptimeRobot for any downtime alerts
- [ ] Review Railway logs for errors
- [ ] Verify all services show healthy status
- [ ] Check Discord bot is online and responding

### Weekly Tasks
- [ ] Review performance metrics (response times, error rates)
- [ ] Check cost trends (OpenAI, Railway, Supabase)
- [ ] Export and archive logs
- [ ] Review alert false positives
- [ ] Test one critical user flow

### Monthly Tasks
- [ ] Full cost analysis and budget review
- [ ] Review SLO compliance (99.9% uptime target)
- [ ] Update monitoring thresholds if needed
- [ ] Test disaster recovery procedures
- [ ] Review and update runbook

### Quarterly Tasks
- [ ] Full system audit
- [ ] Security review
- [ ] Capacity planning
- [ ] Monitoring tool evaluation
- [ ] Team training on monitoring tools

---

## Troubleshooting

### High Alert Volume

**Problem:** Too many alerts, alert fatigue

**Solutions:**
- Increase alert thresholds
- Use batching for low-priority alerts
- Add alert suppression during maintenance
- Tune false positive triggers

### Missing Alerts

**Problem:** Issues not detected or alerted

**Solutions:**
- Add more health checks
- Reduce check intervals
- Add synthetic monitoring
- Test alert delivery channels

### False Positives

**Problem:** Alerts for non-issues

**Solutions:**
- Adjust thresholds based on baselines
- Add retry logic to health checks
- Use percentage-based alerts vs absolute
- Filter transient errors

---

## Additional Resources

- [Production Runbook](./PRODUCTION-RUNBOOK.md)
- [Health Check Guide](./HEALTH-CHECK-GUIDE.md)
- [Railway Deployment Guide](./RAILWAY-DEPLOYMENT-GUIDE.md)
- [UptimeRobot Docs](https://uptimerobot.com/help/)
- [Sentry Docs](https://docs.sentry.io/)
- [Railway Monitoring](https://docs.railway.app/monitoring)

---

**Questions or issues?** Contact: jme@tiltcheck.me
