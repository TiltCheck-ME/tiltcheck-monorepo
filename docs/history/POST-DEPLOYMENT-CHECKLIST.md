# TiltCheck Post-Deployment Production Checklist

**Version:** 1.0  
**Last Updated:** December 8, 2025  
**Deployment Date:** _______________  
**Deployed By:** _______________

## Overview

This checklist ensures TiltCheck is properly configured and monitored after deployment to production on Railway. Complete each section in order.

---

## ✅ Immediate Post-Deployment (First Hour)

### Service Health Verification

- [ ] **All services are running**
  ```bash
  railway status
  # Expected: All services show "Running"
  ```

- [ ] **Health endpoints responding**
  ```bash
  bash scripts/verify-railway-deployment.sh
  # Expected: All checks pass
  ```

- [ ] **No critical errors in logs**
  ```bash
  railway logs | grep -i "error\|exception\|fatal" | tail -20
  # Expected: No critical errors
  ```

### Functional Testing

- [ ] **Discord bot is online**
  - Check Discord server for bot online status
  - Bot shows green status indicator

- [ ] **Test core commands**
  ```
  /tiltcheck help         → Shows help menu
  /casino-trust stake.com → Returns trust score
  /ping                   → Shows latency
  ```

- [ ] **Landing page accessible**
  - Visit: https://your-domain.com
  - Page loads without errors

- [ ] **Dashboard accessible**
  - Visit: https://your-domain.com:5055
  - Events display correctly

### Environment Validation

- [ ] **Run environment validation**
  ```bash
  bash scripts/validate-production-env.sh
  # Expected: All required variables valid
  ```

- [ ] **Verify NODE_ENV is production**
  ```bash
  railway variables get NODE_ENV
  # Expected: production
  ```

- [ ] **Confirm deployment version**
  ```bash
  git log --oneline -1
  railway deployments | head -5
  # Record: Commit SHA and deployment ID
  ```

---

## 📊 Monitoring Setup (First 4 Hours)

### Health Monitoring

- [ ] **Set up UptimeRobot (or equivalent)**
  1. Create account: https://uptimerobot.com
  2. Add monitors for:
     - Landing: `https://your-domain.com/health`
     - Dashboard: `https://your-domain.com:5055/api/health`
     - Discord Bot: `https://your-domain.com:8081/health`
     - Trust Rollup: `https://your-domain.com:8082/health`
  3. Set check interval: 5 minutes
  4. Configure email alerts

- [ ] **Configure Railway notifications**
  - Go to Railway dashboard > Settings > Notifications
  - Enable deployment notifications
  - Add email for alerts

- [ ] **Test alert system**
  - Manually trigger an alert (stop a service)
  - Verify alert received
  - Restart service

### Log Monitoring

- [ ] **Set up log monitoring**
  ```bash
  # Option 1: Watch Railway logs in terminal
  railway logs --follow
  
  # Option 2: Set up log aggregation (Logflare, Papertrail)
  # See docs/PRODUCTION-MONITORING.md for setup
  ```

- [ ] **Create log export script**
  ```bash
  # Add to crontab for daily log backup
  railway logs > logs/production-$(date +%Y%m%d).txt
  ```

### Cost Monitoring

- [ ] **Configure OpenAI usage limits**
  1. Go to https://platform.openai.com/account/limits
  2. Set hard limit: $50/month
  3. Set soft limit: $30/month
  4. Enable email alerts

- [ ] **Check Railway usage**
  ```bash
  railway metrics
  # Record baseline metrics
  ```

- [ ] **Set calendar reminders**
  - Weekly: Review costs
  - Monthly: Budget reconciliation

---

## 🔒 Security Verification (First 8 Hours)

### Access Control

- [ ] **Verify admin IP restrictions**
  ```bash
  railway variables | grep ADMIN_IP
  # Ensure your IPs are configured
  ```

- [ ] **Test unauthorized access**
  - Try accessing landing page from non-allowed IP
  - Should be restricted (if configured)

- [ ] **Verify no secrets in logs**
  ```bash
  railway logs | grep -i "password\|secret\|token\|key"
  # Should only show sanitized/masked values
  ```

### API Key Security

- [ ] **Confirm API keys are different from dev**
  - OpenAI API key is production-specific
  - Discord token is production bot
  - Supabase keys are production project

- [ ] **Document key rotation schedule**
  - Discord token: Monthly
  - OpenAI key: Quarterly
  - Supabase keys: Quarterly

- [ ] **Enable 2FA on all accounts**
  - Railway account
  - Discord Developer Portal
  - OpenAI account
  - Supabase account
  - GitHub account

### Security Scanning

- [ ] **Run security audit**
  ```bash
  # If using pnpm
  pnpm audit
  # Expected: No critical vulnerabilities
  ```

- [ ] **Check CodeQL results**
  - Go to GitHub > Security > Code scanning
  - Verify no critical alerts

---

## 📈 Performance Baseline (First 24 Hours)

### Response Time Metrics

- [ ] **Measure baseline response times**
  ```bash
  # Run multiple times over 24 hours
  time curl https://your-domain.com/health
  time curl https://your-domain.com:8081/health
  time curl https://your-domain.com:8082/health
  
  # Record average times:
  # Landing: _____ ms
  # Discord Bot: _____ ms
  # Trust Rollup: _____ ms
  ```

- [ ] **Test Discord command latency**
  - Use `/ping` command 10 times
  - Record average latency: _____ ms
  - Expected: <2000ms

### Resource Usage

- [ ] **Record baseline resource usage**
  ```bash
  railway metrics
  
  # Record:
  # CPU average: _____% 
  # Memory average: _____ MB
  # Network: _____ GB
  ```

- [ ] **Check for memory leaks**
  - Monitor memory over 24 hours
  - Should remain stable (not continuously growing)

### API Usage

- [ ] **Monitor API call patterns**
  ```bash
  railway logs | grep -i "openai" | wc -l
  # Record: _____ calls in 24 hours
  
  railway logs | grep -i "cache.*hit" | wc -l
  # Record: _____ cache hits
  
  # Calculate cache hit rate:
  # Target: >60%
  ```

---

## 📚 Documentation (First Week)

### Operational Docs

- [ ] **Create deployment notes**
  - Document any issues during deployment
  - Record solutions and workarounds
  - Update DEPLOYMENT.md if needed

- [ ] **Document actual configuration**
  ```bash
  # Export environment (sanitize secrets!)
  railway variables > docs/production-config-REDACTED.txt
  # Manual edit to hide sensitive values
  ```

- [ ] **Create runbook additions**
  - Add any custom procedures
  - Document service-specific quirks
  - Update troubleshooting guide

### Team Training

- [ ] **Train team on Railway dashboard**
  - How to view logs
  - How to restart services
  - How to check metrics
  - How to rollback deployments

- [ ] **Share operational guides**
  - [Production Runbook](./PRODUCTION-RUNBOOK.md)
  - [Production Monitoring](./PRODUCTION-MONITORING.md)
  - [Production Troubleshooting](./PRODUCTION-TROUBLESHOOTING.md)

- [ ] **Define on-call rotation**
  - Primary on-call: _______________
  - Secondary on-call: _______________
  - Escalation contact: _______________

### Contact Information

- [ ] **Update emergency contacts**
  - Add contacts to runbook
  - Share with team
  - Add to Railway dashboard notes

---

## 🎯 Feature Validation (First Week)

### Core Features

- [ ] **Trust Score System**
  - Test multiple casinos
  - Verify scores are reasonable (0-100)
  - Check data source (API or mock)
  - Response time <2s

- [ ] **Link Scanning**
  - Test known safe link
  - Test known scam link
  - Verify detection accuracy

- [ ] **Tipping System** (if enabled)
  - Test small tip amount (devnet first!)
  - Verify transaction completes
  - Check fee calculation

- [ ] **Bonus Tracking** (if enabled)
  - Add a bonus
  - Check reminder system
  - Verify nerf detection

### AI Features (if enabled)

- [ ] **AI Gateway functioning**
  ```bash
  railway logs | grep -i "ai gateway"
  # Should show "Production mode" if API key configured
  ```

- [ ] **Test AI-powered commands**
  - Try commands that use AI
  - Verify responses are relevant
  - Check response quality

- [ ] **Monitor AI costs**
  - Check OpenAI usage dashboard
  - Verify within budget

### External Integrations

- [ ] **Database connectivity**
  - Data persists across restarts
  - Queries complete successfully
  - Connection pool healthy

- [ ] **Event system**
  - Events are emitted
  - Event router is processing
  - Dashboard shows events

---

## 🔧 Optimization (First 2 Weeks)

### Performance Tuning

- [ ] **Optimize cache settings**
  - Review cache hit rates
  - Adjust TTL if needed
  - Add cache warming if beneficial

- [ ] **Database optimization**
  - Add indexes on frequent queries
  - Enable connection pooling
  - Review query performance

- [ ] **Resource right-sizing**
  - Review actual usage vs limits
  - Adjust Railway plan if needed
  - Optimize for cost

### Cost Optimization

- [ ] **Review OpenAI usage**
  - Confirm using gpt-4o-mini (cheapest)
  - Check cache effectiveness
  - Identify unnecessary calls

- [ ] **Review Railway costs**
  - Check actual execution hours
  - Verify plan matches usage
  - Look for optimization opportunities

- [ ] **Review Supabase usage**
  - Check database size
  - Archive old data if needed
  - Optimize storage

### Feature Toggles

- [ ] **Configure optional features**
  - Decide: Use real AI or mock?
  - Decide: Use real trust data or mock?
  - Decide: Enable Supabase or in-memory?

- [ ] **Document feature decisions**
  - Why each feature is enabled/disabled
  - Cost-benefit analysis
  - Future plans

---

## 🚨 Incident Readiness (First Month)

### Response Procedures

- [ ] **Test rollback procedure**
  ```bash
  # Don't actually rollback, just verify you can
  railway deployments
  # Know which deployment to rollback to
  ```

- [ ] **Test incident response**
  - Simulate service down scenario
  - Practice using troubleshooting guide
  - Time response to resolution

- [ ] **Create incident templates**
  - Incident report template
  - Post-mortem template
  - Communication templates

### Backup & Recovery

- [ ] **Verify Supabase backups**
  - Check backup schedule (daily for free tier)
  - Know how to restore
  - Test restore process (in dev)

- [ ] **Export environment variables**
  ```bash
  railway variables > backup/env-$(date +%Y%m%d).txt
  # Store securely (encrypted)
  ```

- [ ] **Document recovery procedures**
  - Full system recovery steps
  - Service-specific recovery
  - Data restoration process

---

## 📊 Success Metrics (Ongoing)

### Service Level Objectives (SLOs)

Track these metrics and ensure they meet targets:

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Uptime | 99.9% | _____% | ⬜ |
| Response Time (p95) | <2s | _____s | ⬜ |
| Error Rate | <0.1% | _____% | ⬜ |
| Discord Commands/Day | Baseline | _____ | ⬜ |
| Cache Hit Rate | >60% | _____% | ⬜ |
| Monthly Cost | <$100 | $_____ | ⬜ |

### Regular Reviews

- [ ] **Daily (first week)**
  - Check health status
  - Review logs for errors
  - Monitor costs
  - Verify no user complaints

- [ ] **Weekly**
  - Review metrics vs SLOs
  - Cost analysis
  - Performance trends
  - Update runbook

- [ ] **Monthly**
  - Full audit
  - Security review
  - Capacity planning
  - Team retrospective

---

## ✅ Final Sign-Off

### Deployment Complete Checklist

- [ ] All services healthy and responding
- [ ] Monitoring configured and tested
- [ ] Security verified
- [ ] Performance baselined
- [ ] Documentation updated
- [ ] Team trained
- [ ] Incident procedures tested
- [ ] Backups verified

### Approvals

**Deployment Lead:**  
Name: _______________  
Date: _______________  
Signature: _______________

**Technical Review:**  
Name: _______________  
Date: _______________  
Signature: _______________

**Business Sign-Off:**  
Name: _______________  
Date: _______________  
Signature: _______________

---

## 🎉 Success!

**TiltCheck is now in production!**

### Next Steps

1. **Monitor closely for first 48 hours**
2. **Collect user feedback**
3. **Iterate on improvements**
4. **Plan next features**

### Celebrate! 🎊

Your deployment is complete. The TiltCheck ecosystem is now helping degens make better decisions!

---

## Additional Resources

- [Production Runbook](./PRODUCTION-RUNBOOK.md) - Daily operations
- [Production Monitoring](./PRODUCTION-MONITORING.md) - Monitoring setup
- [Production Troubleshooting](./PRODUCTION-TROUBLESHOOTING.md) - Problem solving
- [Railway Deployment Guide](./RAILWAY-DEPLOYMENT-GUIDE.md) - Deployment details
- [Health Check Guide](./HEALTH-CHECK-GUIDE.md) - Health monitoring

---

**Questions?** Contact: jme@tiltcheck.me
