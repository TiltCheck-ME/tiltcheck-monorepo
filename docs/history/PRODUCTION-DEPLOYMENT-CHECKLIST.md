# TiltCheck Production Deployment Checklist

**Version:** 1.0  
**Last Updated:** December 6, 2025  
**Status:** Production Ready ✅

## Overview

This checklist ensures a smooth and successful deployment of TiltCheck to production. Follow each section in order, checking off items as you complete them.

---

## Pre-Deployment Verification

### Local Build & Test ✅

- [ ] Dependencies installed: `pnpm install --frozen-lockfile`
- [ ] All packages build successfully: `pnpm build`
- [ ] All tests passing: `pnpm test` (Expected: 537/537)
- [ ] Linting passes: `pnpm lint`
- [ ] No TypeScript errors
- [ ] Docker builds successful: `docker compose build`

### Code Quality ✅

- [ ] All code reviewed
- [ ] Security audit completed
- [ ] No hardcoded secrets
- [ ] Environment variables documented
- [ ] Error handling implemented
- [ ] Logging configured properly

### Documentation ✅

- [ ] README.md updated
- [ ] CHANGELOG.md updated
- [ ] API documentation current
- [ ] Environment variables documented
- [ ] Deployment guide reviewed

---

## Environment Configuration

### Essential Variables (Required) 🔴

#### Discord Bot Configuration
- [ ] `DISCORD_TOKEN` - Bot authentication token
- [ ] `DISCORD_CLIENT_ID` - Application client ID
- [ ] `DISCORD_GUILD_ID` - Your Discord server ID
- [ ] `COLLECT_CLOCK_OWNER_ID` - Owner user ID (default: 1153034319271559328)

#### Application Configuration
- [ ] `NODE_ENV=production` - Production mode
- [ ] `PORT=8080` - Main application port
- [ ] `LANDING_LOG_PATH=/tmp/landing-requests.log` - Log file path

#### Security Configuration
- [ ] `ADMIN_IP_1` - Your public IP address (from https://ifconfig.me)
- [ ] `ADMIN_IP_2` - Optional: Office IP
- [ ] `ADMIN_IP_3` - Optional: VPN IP

### AI Gateway (Optional) 🟡

- [ ] `OPENAI_API_KEY` - OpenAI API key (or leave empty for mock mode)
- [ ] `OPENAI_MODEL=gpt-4o-mini` - Cost-efficient model selection

**Cost Impact:** ~$5-50/month depending on usage

### Trust Rollup (Optional) 🟡

- [ ] `USE_MOCK_TRUST_DATA=false` - Enable real data (or true for mock)
- [ ] `CASINO_GURU_API_KEY` - CasinoGuru API key
- [ ] `ASKGAMBLERS_API_KEY` - AskGamblers API key

**Cost Impact:** ~$99-399/month for API access

### Database (Recommended) 🟢

- [ ] `SUPABASE_URL` - Supabase project URL
- [ ] `SUPABASE_ANON_KEY` - Public anon key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Service role key (keep secret!)

**Cost Impact:** Free tier sufficient for most use cases

### Additional Services (Optional) 🔵

- [ ] `CHANGENOW_API_KEY` - For LTC bridge functionality
- [ ] `STRIPE_SECRET_KEY` - For extension subscriptions
- [ ] `STRIPE_PUBLIC_KEY` - For client-side Stripe
- [ ] `STRIPE_WEBHOOK_SECRET` - For webhook validation
- [ ] `DISCORD_WEBHOOK_URL` - For system alerts

---

## Railway Deployment

### Initial Setup

- [ ] Railway CLI installed: `npm install -g @railway/cli`
- [ ] Logged into Railway: `railway login`
- [ ] Project created or linked: `railway init` or `railway link`
- [ ] Railway project linked to GitHub repository

### Environment Variables

- [ ] All required variables set via Railway dashboard or CLI
- [ ] Variables validated: `railway variables`
- [ ] Secrets properly encrypted
- [ ] No sensitive data in git repository

### Deployment

- [ ] Code pushed to main branch: `git push origin main`
- [ ] Railway deployment triggered: `railway up`
- [ ] Build logs monitored: `railway logs`
- [ ] No build errors
- [ ] All services started successfully

### Domain Configuration

- [ ] Railway domain generated: `railway domain generate`
- [ ] Or custom domain added: `railway domain add yourdomain.com`
- [ ] DNS records configured (if using custom domain)
- [ ] SSL certificate active

---

## Health Verification

### Service Health Checks

Run verification script:
```bash
bash scripts/verify-railway-deployment.sh
```

Or manually verify each service:

#### Landing Page
- [ ] Health endpoint: `GET https://yourdomain.com/health`
- [ ] Response: `{"status":"ok","ready":true}`
- [ ] Main page loads: `https://yourdomain.com`
- [ ] No console errors

#### Dashboard
- [ ] Health endpoint: `GET https://yourdomain.com:5055/api/health`
- [ ] Response: `{"status":"ok","ready":true}`
- [ ] Dashboard accessible
- [ ] Events displaying

#### Discord Bot
- [ ] Health endpoint: `GET https://yourdomain.com:8081/health`
- [ ] Response: `{"status":"ok","ready":true}`
- [ ] Bot shows online in Discord
- [ ] Bot responds to commands

#### Trust Rollup
- [ ] Health endpoint: `GET https://yourdomain.com:8082/health`
- [ ] Response: `{"status":"ok","ready":true}`
- [ ] Trust scores available: `GET https://yourdomain.com:8082/trust/stake.com`
- [ ] Data source correct (api or mock)

### Functional Testing

#### Discord Bot Commands
- [ ] `/tiltcheck help` - Shows help menu
- [ ] `/casino-trust stake.com` - Returns trust score
- [ ] `/sus-link https://example.com` - Scans link
- [ ] `/tip @user 1` - Tipping works (if wallet configured)
- [ ] `/collect-clock` - Shows bonus tracking

#### Trust Engine
- [ ] Trust scores load for known casinos
- [ ] Scores are reasonable (0-100 range)
- [ ] Data source matches configuration
- [ ] Response times acceptable (<2s)

#### AI Features
- [ ] AI responses working (or mock if not configured)
- [ ] No API errors
- [ ] Response quality acceptable
- [ ] Token usage reasonable

---

## Monitoring Setup

### Railway Monitoring

- [ ] Railway dashboard bookmarked
- [ ] Service status checked: `railway status`
- [ ] Logs configured: `railway logs --follow`
- [ ] Metrics reviewed: `railway metrics`

### External Monitoring (Optional)

- [ ] Uptime monitoring configured (e.g., UptimeRobot, Pingdom)
- [ ] Health check URLs added to monitor
- [ ] Alert notifications configured
- [ ] Status page created (optional)

### API Usage Monitoring

If using external APIs:

- [ ] OpenAI usage dashboard monitored
- [ ] Budget limits set in OpenAI dashboard
- [ ] CasinoGuru API usage tracked
- [ ] AskGamblers API usage tracked
- [ ] Supabase dashboard reviewed

---

## Security Verification

### Access Control

- [ ] Admin IPs configured correctly
- [ ] Bot permissions minimal and correct
- [ ] Service role keys secured (server-side only)
- [ ] No secrets in client-side code
- [ ] HTTPS enforced on all endpoints

### API Security

- [ ] API keys rotated from defaults
- [ ] Rate limiting configured
- [ ] Input validation active
- [ ] Error messages sanitized (no sensitive data)

### Discord Bot Security

- [ ] Bot token secured
- [ ] Bot permissions reviewed
- [ ] Command permissions configured
- [ ] User input validated

---

## Performance Optimization

### Caching

- [ ] AI Gateway cache working (1 hour TTL)
- [ ] Trust Rollup cache working (6 hour TTL)
- [ ] Response times acceptable
- [ ] Cache hit rate >60%

### Resource Usage

- [ ] Memory usage normal (<512MB per service)
- [ ] CPU usage reasonable (<50% average)
- [ ] Network bandwidth acceptable
- [ ] No memory leaks detected

### Database

- [ ] Connection pooling configured (if using Supabase)
- [ ] Indexes created on frequently queried fields
- [ ] Query performance acceptable
- [ ] Old data archived if needed

---

## Documentation

### User-Facing

- [ ] Landing page content accurate
- [ ] Discord bot commands documented
- [ ] Help text up-to-date
- [ ] FAQ updated

### Developer

- [ ] Deployment guide current
- [ ] API documentation updated
- [ ] Environment variables documented
- [ ] Troubleshooting guide available

### Operational

- [ ] Runbook created
- [ ] Emergency contacts documented
- [ ] Rollback procedure documented
- [ ] Incident response plan defined

---

## Post-Deployment

### Immediate (First Hour)

- [ ] All services confirmed healthy
- [ ] No error spikes in logs
- [ ] Discord bot online and responsive
- [ ] Landing page accessible
- [ ] Critical commands tested

### First 24 Hours

- [ ] Monitor logs continuously: `railway logs --follow`
- [ ] Check for memory leaks
- [ ] Verify API usage within budget
- [ ] Test under normal user load
- [ ] Collect initial metrics

### First Week

- [ ] Review all error logs
- [ ] Analyze usage patterns
- [ ] Optimize as needed
- [ ] User feedback collected
- [ ] Performance baseline established

### Ongoing

- [ ] Weekly health checks
- [ ] Monthly security reviews
- [ ] Quarterly dependency updates
- [ ] Regular backups (if using database)
- [ ] Cost optimization reviews

---

## Rollback Procedure

If deployment fails or critical issues arise:

### Quick Rollback

```bash
# Revert to previous Railway deployment
railway rollback

# Or revert environment variable changes
railway variables set OPENAI_API_KEY=""  # Disable if causing issues
railway variables set USE_MOCK_TRUST_DATA="true"  # Use mock data
```

### Full Rollback

```bash
# Revert git commits
git revert HEAD
git push origin main

# Railway will auto-deploy the reverted version
# Monitor: railway logs
```

### Emergency Contacts

- **Primary:** [Your contact info]
- **Railway Support:** https://railway.app/help
- **Discord Support:** https://discord.com/developers/docs
- **Emergency Shutdown:** `railway down`

---

## Success Criteria

Deployment is successful when ALL of the following are true:

- ✅ All 4 services healthy (landing, dashboard, bot, rollup)
- ✅ All health endpoints return `ready: true`
- ✅ Discord bot online and responsive
- ✅ No critical errors in logs (first hour)
- ✅ API costs within budget
- ✅ Response times acceptable (<2s)
- ✅ Security checks passed
- ✅ Monitoring configured
- ✅ Team trained on Railway dashboard

---

## Cost Summary

### Minimum Deployment (Mock Data)

| Service | Cost | Notes |
|---------|------|-------|
| Railway | $5/month | Hobby plan |
| **Total** | **$5/month** | Development/staging |

### Recommended Deployment (Free APIs)

| Service | Cost | Notes |
|---------|------|-------|
| Railway | $5/month | Hobby plan |
| Supabase | $0/month | Free tier |
| **Total** | **$5/month** | Most cost-effective |

### Full Production (All APIs)

| Service | Cost | Notes |
|---------|------|-------|
| Railway | $5-20/month | Hobby or Pro |
| OpenAI | $5-50/month | Varies by usage |
| CasinoGuru | $99-299/month | Contact for pricing |
| AskGamblers | $149-399/month | Contact for pricing |
| Supabase | $0-25/month | Free or Pro |
| **Total** | **$258-793/month** | Full featured |

---

## Support Resources

### Documentation

- [Railway Deployment Guide](./RAILWAY-DEPLOYMENT-GUIDE.md)
- [AI Gateway Production](./AI-GATEWAY-PRODUCTION.md)
- [Trust Rollup Production](./TRUST-ROLLUP-PRODUCTION.md)
- [Environment Variables](../.env.example)

### External Resources

- [Railway Docs](https://docs.railway.app/)
- [Supabase Docs](https://supabase.com/docs)
- [OpenAI Docs](https://platform.openai.com/docs)
- [Discord Developer Portal](https://discord.com/developers/docs)

### Getting Help

1. Check troubleshooting guides
2. Review Railway logs: `railway logs`
3. Search GitHub issues
4. Open new issue with logs
5. Contact Railway support for platform issues

---

## Checklist Complete! 🎉

Once all items are checked:

1. ✅ Mark deployment as **COMPLETE** in NEXT-PRIORITIES.md
2. ✅ Update STATUS.md with deployment date and version
3. ✅ Notify team of successful deployment
4. ✅ Schedule first post-deployment review (24 hours)
5. ✅ Document any issues or learnings

**Deployment Date:** _____________  
**Deployed By:** _____________  
**Railway Project:** _____________  
**Git Commit:** _____________

---

**Your TiltCheck ecosystem is now live! 🚀**
