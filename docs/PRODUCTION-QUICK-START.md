# TiltCheck Production Guide - Quick Start

**Version:** 1.0  
**Last Updated:** December 8, 2025  
**Status:** Production Ready ✅

## Overview

This guide provides a comprehensive overview of TiltCheck's production deployment and operational procedures. Use this as your starting point for all production-related tasks.

---

## 🎯 Quick Navigation

### For New Deployments
1. **[Railway Deployment Guide](./RAILWAY-DEPLOYMENT-GUIDE.md)** - First-time deployment setup
2. **[Production Deployment Checklist](./PRODUCTION-DEPLOYMENT-CHECKLIST.md)** - Pre-deployment verification
3. **[Post-Deployment Checklist](./POST-DEPLOYMENT-CHECKLIST.md)** - Post-deployment setup and verification

### For Daily Operations
1. **[Production Runbook](./PRODUCTION-RUNBOOK.md)** - Common operational tasks
2. **[Production Monitoring](./PRODUCTION-MONITORING.md)** - Monitoring and alerting
3. **[Production Troubleshooting](./PRODUCTION-TROUBLESHOOTING.md)** - Problem diagnosis and resolution

### For Specific Features
1. **[AI Gateway Production](./AI-GATEWAY-PRODUCTION.md)** - OpenAI integration
2. **[Trust Rollup Production](./TRUST-ROLLUP-PRODUCTION.md)** - Casino data integration
3. **[Health Check Guide](./HEALTH-CHECK-GUIDE.md)** - Health monitoring details

---

## 🚀 Deployment Workflow

### Phase 1: Preparation (1-2 hours)

**Read First:**
- [Railway Deployment Guide](./RAILWAY-DEPLOYMENT-GUIDE.md)
- [Production Deployment Checklist](./PRODUCTION-DEPLOYMENT-CHECKLIST.md)

**Tasks:**
1. Install Railway CLI: `npm install -g @railway/cli`
2. Create/link Railway project
3. Gather API keys and credentials
4. Review environment variable requirements
5. Test build locally: `pnpm build && pnpm test`

**Validation:**
```bash
# Ensure all tests pass
pnpm test
# Expected: 537/537 passing

# Validate production environment
bash scripts/validate-production-env.sh
```

---

### Phase 2: Deployment (30-60 minutes)

**Steps:**

1. **Configure Environment Variables**
   ```bash
   # Required variables
   railway variables set DISCORD_TOKEN="your_token"
   railway variables set DISCORD_CLIENT_ID="your_client_id"
   railway variables set NODE_ENV="production"
   
   # Optional but recommended
   railway variables set OPENAI_API_KEY="sk-xxx"
   railway variables set SUPABASE_URL="https://xxx.supabase.co"
   railway variables set SUPABASE_ANON_KEY="ey..."
   railway variables set SUPABASE_SERVICE_ROLE_KEY="ey..."
   ```

2. **Deploy Application**
   ```bash
   railway up
   ```

3. **Monitor Deployment**
   ```bash
   railway logs --follow
   ```

4. **Verify Health**
   ```bash
   bash scripts/verify-railway-deployment.sh
   ```

**Expected Results:**
- ✅ All services show "Running" status
- ✅ All health checks return `ready: true`
- ✅ Discord bot appears online
- ✅ No critical errors in logs

---

### Phase 3: Post-Deployment (First 24 hours)

**Read First:**
- [Post-Deployment Checklist](./POST-DEPLOYMENT-CHECKLIST.md)
- [Production Monitoring](./PRODUCTION-MONITORING.md)

**Critical Tasks:**

1. **Set Up Monitoring** (First 4 hours)
   - UptimeRobot for health checks
   - OpenAI usage alerts
   - Railway deployment notifications
   - Log monitoring setup

2. **Functional Testing** (First hour)
   ```
   Discord Bot:
   - /tiltcheck help
   - /casino-trust stake.com
   - /ping
   
   Services:
   - Landing page loads
   - Dashboard shows events
   - Trust scores working
   ```

3. **Performance Baseline** (First 24 hours)
   - Record response times
   - Monitor resource usage
   - Check API call patterns
   - Verify cache hit rates

**Monitoring Checklist:**
- [ ] UptimeRobot configured (5 min intervals)
- [ ] OpenAI hard limit set ($50/month)
- [ ] Railway notifications enabled
- [ ] Daily log export scheduled
- [ ] Team trained on dashboards

---

## 📊 Production Architecture

### Services Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Railway Platform                      │
├────────────┬─────────────┬─────────────┬───────────────┤
│  Landing   │  Dashboard  │ Discord Bot │ Trust Rollup  │
│  :8080     │  :5055      │  :8081      │  :8082        │
└─────┬──────┴──────┬──────┴──────┬──────┴────────┬──────┘
      │             │             │               │
      ▼             ▼             ▼               ▼
┌─────────────────────────────────────────────────────────┐
│                  External Services                       │
├────────────┬─────────────┬─────────────┬───────────────┤
│  Supabase  │   OpenAI    │   Discord   │  Casino APIs  │
│ (Database) │  (AI/LLM)   │  (Gateway)  │ (Trust Data)  │
└────────────┴─────────────┴─────────────┴───────────────┘
```

### Service Responsibilities

**Landing** - Static website and landing pages
- Port: 8080
- Health: `GET /health`
- Dependencies: None

**Dashboard** - Admin dashboard and event monitoring
- Port: 5055
- Health: `GET /api/health`
- Dependencies: Event Router, Supabase (optional)

**Discord Bot** - Main bot with all commands
- Port: 8081 (health check)
- Health: `GET /health`
- Dependencies: Discord API, AI Gateway, Trust Rollup, Supabase (optional)

**Trust Rollup** - Casino trust score aggregation
- Port: 8082
- Health: `GET /health`
- Dependencies: Casino APIs (optional), AI Gateway (optional)

---

## 🔧 Common Operational Tasks

### Daily Operations

**Check Service Health:**
```bash
railway status
bash scripts/verify-railway-deployment.sh
```

**View Logs:**
```bash
# All services
railway logs | tail -100

# Specific service
railway logs --service=discord-bot --follow

# Search for errors
railway logs | grep -i "error"
```

**Monitor Costs:**
```bash
# OpenAI usage
# Visit: https://platform.openai.com/usage

# Railway usage
railway metrics

# Supabase usage
# Visit: https://supabase.com/dashboard/project/_/settings/billing
```

### Updating Code

```bash
# 1. Test locally
pnpm build
pnpm test

# 2. Deploy
railway up

# 3. Monitor
railway logs --follow

# 4. Verify
bash scripts/verify-railway-deployment.sh
```

### Updating Environment Variables

```bash
# Set variable
railway variables set VARIABLE_NAME="value"

# Restart affected services
railway restart

# Verify
railway variables | grep VARIABLE_NAME
```

### Emergency Rollback

```bash
# Quick rollback to previous deployment
railway rollback

# Verify services recovered
bash scripts/verify-railway-deployment.sh
```

---

## 🚨 Troubleshooting

### Quick Diagnostic Commands

```bash
# 1. Check service status
railway status

# 2. Check logs for errors
railway logs | grep -i "error\|exception" | tail -20

# 3. Validate environment
bash scripts/validate-production-env.sh

# 4. Check health endpoints
curl https://your-domain.com/health
curl https://your-domain.com:8081/health
curl https://your-domain.com:8082/health
```

### Common Issues

**Service Won't Start:**
- Check logs: `railway logs --service=SERVICE_NAME`
- Validate environment: `bash scripts/validate-production-env.sh`
- Verify deployment: `railway deployments`

**Discord Bot Offline:**
- Check token: `railway variables get DISCORD_TOKEN`
- Restart bot: `railway restart --service=discord-bot`
- Re-register commands: `railway run node apps/discord-bot/scripts/register-commands.js`

**High Costs:**
- Check OpenAI usage: https://platform.openai.com/usage
- Switch to mock mode: `railway variables set OPENAI_API_KEY=""`
- Use cheaper model: `railway variables set OPENAI_MODEL="gpt-4o-mini"`

**For detailed troubleshooting, see [Production Troubleshooting Guide](./PRODUCTION-TROUBLESHOOTING.md)**

---

## 📈 Monitoring & Metrics

### Key Performance Indicators (KPIs)

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Uptime | 99.9% | <99.5% | <99% |
| Response Time (p95) | <2s | >5s | >10s |
| Error Rate | <0.1% | >1% | >5% |
| Cache Hit Rate | >60% | <40% | <20% |
| Monthly Cost | <$100 | >$150 | >$200 |

### Monitoring Tools

**UptimeRobot** (Free)
- Health check monitoring
- Email alerts
- Public status page

**Railway Dashboard** (Included)
- Service metrics
- Resource usage
- Deployment history

**OpenAI Dashboard** (Included)
- API usage tracking
- Cost monitoring
- Rate limit tracking

**Supabase Dashboard** (Included)
- Database metrics
- API requests
- Storage usage

**For detailed monitoring setup, see [Production Monitoring Guide](./PRODUCTION-MONITORING.md)**

---

## 💰 Cost Management

### Expected Monthly Costs

**Minimum (Mock Data):**
- Railway Hobby: $5/month
- Total: **$5/month**

**Recommended (Free APIs):**
- Railway Hobby: $5/month
- Supabase Free Tier: $0/month
- Total: **$5/month**

**Full Production:**
- Railway Pro: $20/month
- OpenAI (gpt-4o-mini): $30/month
- Supabase Free: $0/month
- Casino APIs (optional): $100-400/month
- Total: **$50-450/month**

### Cost Optimization Tips

1. **Use gpt-4o-mini** - 90% cheaper than gpt-4
2. **Enable caching** - Reduce API calls by 60%+
3. **Use mock data** - Free for development/testing
4. **Monitor usage** - Set hard limits
5. **Right-size resources** - Don't over-provision

---

## 🔒 Security Best Practices

### Essential Security Measures

1. **Rotate API keys regularly**
   - Discord token: Monthly
   - OpenAI key: Quarterly
   - Supabase keys: Quarterly

2. **Use different keys for dev/prod**
   - Never use production keys in development
   - Keep test data separate

3. **Enable 2FA everywhere**
   - Railway account
   - Discord Developer Portal
   - OpenAI account
   - Supabase account
   - GitHub account

4. **Monitor for anomalies**
   - Unusual API usage
   - Unexpected costs
   - Failed authentication attempts

5. **Keep secrets secure**
   - Never commit to git
   - Use Railway's encrypted variables
   - Rotate after exposure

---

## 📚 Complete Documentation Index

### Deployment & Setup
- [Railway Deployment Guide](./RAILWAY-DEPLOYMENT-GUIDE.md) - Complete setup guide
- [Production Deployment Checklist](./PRODUCTION-DEPLOYMENT-CHECKLIST.md) - Pre-deployment tasks
- [Post-Deployment Checklist](./POST-DEPLOYMENT-CHECKLIST.md) - Post-deployment tasks
- [Health Check Guide](./HEALTH-CHECK-GUIDE.md) - Health monitoring details

### Operations & Maintenance
- [Production Runbook](./PRODUCTION-RUNBOOK.md) - Daily operational tasks
- [Production Monitoring](./PRODUCTION-MONITORING.md) - Monitoring setup and dashboards
- [Production Troubleshooting](./PRODUCTION-TROUBLESHOOTING.md) - Problem diagnosis

### Feature Configuration
- [AI Gateway Production](./AI-GATEWAY-PRODUCTION.md) - OpenAI integration
- [Trust Rollup Production](./TRUST-ROLLUP-PRODUCTION.md) - Casino data integration

### Development
- [README.md](../README.md) - Project overview
- [QUICKSTART.md](../QUICKSTART.md) - Quick development setup
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Contribution guidelines

---

## ✅ Production Readiness Checklist

### Pre-Deployment
- [ ] All tests passing (537/537)
- [ ] Build successful locally
- [ ] Environment variables documented
- [ ] API keys obtained
- [ ] Railway project created
- [ ] Team trained

### Deployment
- [ ] Environment variables configured
- [ ] Deployment successful
- [ ] All services healthy
- [ ] Discord bot online
- [ ] No critical errors

### Post-Deployment
- [ ] Monitoring configured
- [ ] Alerts tested
- [ ] Performance baselined
- [ ] Documentation updated
- [ ] Team notified
- [ ] Backup procedures verified

---

## 🆘 Getting Help

### Self-Service
1. Search this documentation
2. Check [Troubleshooting Guide](./PRODUCTION-TROUBLESHOOTING.md)
3. Review [Runbook](./PRODUCTION-RUNBOOK.md)
4. Check service status pages

### Support Channels
- **TiltCheck Team:** jme@tiltcheck.me
- **Railway Support:** https://railway.app/help
- **Discord Developer Support:** https://discord.com/developers/docs
- **GitHub Issues:** https://github.com/jmenichole/tiltcheck-monorepo/issues

### When to Escalate
- P0 incidents (all services down)
- Security breaches
- Data loss
- Cannot resolve in 30 minutes

---

## 🎓 Training Resources

### For Operators
- Start with [Production Runbook](./PRODUCTION-RUNBOOK.md)
- Learn Railway dashboard
- Practice troubleshooting scenarios
- Set up monitoring

### For Developers
- Review [Architecture](../docs/tiltcheck/9-architecture.md)
- Understand [Event System](../services/event-router/README.md)
- Read [API Documentation](../docs/tiltcheck/12-apis.md)
- Follow [Contributing Guide](../CONTRIBUTING.md)

### For Stakeholders
- Review [Project Overview](../README.md)
- Understand cost structure
- Monitor KPIs
- Review incident reports

---

## 📅 Maintenance Schedule

### Daily
- Check service health
- Review error logs
- Monitor costs
- Verify alerts working

### Weekly
- Review metrics vs SLOs
- Cost analysis
- Performance trends
- Update runbook

### Monthly
- Full system audit
- Security review
- Dependency updates
- Capacity planning
- Team retrospective

### Quarterly
- Rotate API keys
- Security assessment
- Architecture review
- Disaster recovery test

---

## 🎉 Success Metrics

**Your deployment is successful when:**

- ✅ All services healthy for 24 hours
- ✅ No critical errors
- ✅ Response times meet SLOs
- ✅ Costs within budget
- ✅ Monitoring configured
- ✅ Team trained
- ✅ Documentation complete

**Welcome to production! 🚀**

---

**Last Updated:** December 8, 2025  
**Next Review:** After first production deployment  
**Maintained By:** TiltCheck Team  
**Contact:** jme@tiltcheck.me
