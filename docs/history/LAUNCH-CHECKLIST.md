# TiltCheck Launch Checklist

Comprehensive checklist for pre-launch verification, categorized by priority.

**Status Categories:**
- 🔴 **MUST FIX** - Critical blockers that prevent launch
- 🟡 **SHOULD FIX** - Important improvements for production readiness
- 🟢 **OPTIONAL** - Nice-to-have enhancements

---

## 🔴 MUST FIX (Critical - Cannot Launch Without)

### Environment & Configuration

- [ ] All REQUIRED environment variables are set and valid
  - [ ] `DISCORD_TOKEN` - Bot authentication token
  - [ ] `DISCORD_CLIENT_ID` - OAuth client ID
  - [ ] `DISCORD_CLIENT_SECRET` - OAuth client secret
  - [ ] `SUPABASE_URL` - Database URL
  - [ ] `SUPABASE_ANON_KEY` - Database public key
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` - Database admin key
  - [ ] `JWT_SECRET` - Min 32 characters, cryptographically secure
  - [ ] `SESSION_SECRET` - Min 32 characters, cryptographically secure
  - [ ] `SOLANA_RPC_URL` - Set to mainnet for production
- [ ] No hardcoded secrets in codebase
- [ ] `.env` file is in `.gitignore`
- [ ] Production secrets stored in secure vault (Railway/Vercel secrets, not .env files)

### Security

- [ ] No critical/high vulnerabilities in `pnpm audit`
- [ ] CodeQL scan passing with no critical issues
- [ ] HTTPS enforced in production (no HTTP fallback)
- [ ] Secure cookie flags set (`httpOnly`, `secure`, `sameSite`)
- [ ] Rate limiting implemented on all public endpoints
- [ ] Input validation on all user-facing inputs (Discord commands, API routes)
- [ ] CSRF protection enabled on web routes
- [ ] Bot token rotated if this is a redeploy
- [ ] Admin passwords changed from defaults (`ADMIN_PASSWORD` deprecated)

### Build & Deploy

- [ ] `pnpm install` runs without errors
- [ ] `pnpm build` succeeds for all packages
- [ ] `pnpm test` passes (or known failures documented)
- [ ] No TypeScript errors (`pnpm exec tsc --noEmit`)
- [ ] Production environment variables configured in deployment platform
- [ ] DNS configured for custom domains
- [ ] SSL certificates installed and valid
- [ ] Database migrations applied (if any)
- [ ] Discord slash commands deployed to production guilds
- [ ] Bot invited to production servers with correct permissions

### Testing & Verification

- [ ] Critical path manual testing completed:
  - [ ] Discord bot responds to `/ping`
  - [ ] Tip command works end-to-end (use devnet first!)
  - [ ] Trust score lookup returns results
  - [ ] Link scan detects known scam
  - [ ] OAuth flow completes successfully
- [ ] Health endpoints responding (`/health` on all services)
- [ ] Services can communicate with each other
- [ ] Bot can authenticate with API
- [ ] API can query Supabase
- [ ] Solana transactions work on devnet (before mainnet)

### Monitoring

- [ ] Sentry configured and tested (or monitoring alternative)
- [ ] Error tracking captures exceptions correctly
- [ ] Health check endpoints implemented on all services
- [ ] Uptime monitoring configured (UptimeRobot or equivalent)
- [ ] Discord webhook for critical alerts configured
- [ ] Alert notifications tested and working

---

## 🟡 SHOULD FIX (Important for Production Quality)

### Security Hardening

- [ ] IP whitelist configured for admin routes
- [ ] Session timeout configured (default or custom)
- [ ] 2FA enabled for critical accounts (GitHub, Railway, Supabase dashboard)
- [ ] Audit logging enabled for sensitive operations
- [ ] Password rotation policy defined
- [ ] Security monitoring active (automated scans)
- [ ] Dependency vulnerability alerts configured
- [ ] Content Security Policy headers set

### Testing

- [ ] Unit test coverage ≥70% overall
- [ ] Critical paths have ≥90% coverage
- [ ] Integration tests passing
- [ ] Error handling paths tested
- [ ] Edge cases identified and tested
- [ ] Load testing completed (if high traffic expected)

### Documentation

- [ ] README.md complete and accurate
- [ ] QUICKSTART.md tested by external user
- [ ] Environment variables documented in `.env.template`
- [ ] API endpoints documented
- [ ] Bot commands documented
- [ ] Deployment guide written and verified
- [ ] Troubleshooting guide created
- [ ] Runbook for common issues prepared
- [ ] On-call procedures documented (if applicable)

### Monitoring & Observability

- [ ] Log aggregation configured (Logflare, Datadog, etc.)
- [ ] Metrics collection active
- [ ] Performance baselines established
- [ ] Error rate baseline documented
- [ ] Response time baseline documented
- [ ] Dashboard for service health accessible
- [ ] Alert thresholds configured appropriately
- [ ] On-call rotation defined (if applicable)

### Operations

- [ ] Rollback procedures documented and tested
- [ ] Backup strategy configured
- [ ] Database backup verified
- [ ] Disaster recovery plan tested
- [ ] Incident response process defined
- [ ] Post-mortem template prepared
- [ ] Scaling limits documented
- [ ] Cost monitoring configured

### Code Quality

- [ ] ESLint passing without errors
- [ ] Prettier formatting consistent
- [ ] No `console.log` in production code (use logger)
- [ ] No `any` types (or documented exceptions)
- [ ] All TODOs reviewed and scheduled or removed
- [ ] Dead code removed
- [ ] Commented-out code removed
- [ ] Import statements optimized

---

## 🟢 OPTIONAL (Nice-to-Have Enhancements)

### Advanced Security

- [ ] Penetration testing completed
- [ ] Security audit by external firm
- [ ] Bug bounty program considered
- [ ] Advanced threat detection configured
- [ ] DDoS protection enabled
- [ ] WAF (Web Application Firewall) configured

### Testing Excellence

- [ ] E2E workflow tests implemented
- [ ] Performance regression tests
- [ ] Visual regression tests (for UIs)
- [ ] Chaos engineering tests
- [ ] Contract testing for APIs
- [ ] Mutation testing

### Monitoring & Analytics

- [ ] Custom metrics dashboard (Grafana/Prometheus)
- [ ] Advanced alerting rules
- [ ] Anomaly detection
- [ ] User analytics (privacy-compliant)
- [ ] A/B testing framework
- [ ] Feature flags system

### Documentation & Education

- [ ] Architecture diagrams created
- [ ] API reference docs (OpenAPI/Swagger)
- [ ] Video tutorials recorded
- [ ] Interactive demo environment
- [ ] FAQ compiled from user questions
- [ ] Release notes automation

### Developer Experience

- [ ] Local development environment streamlined
- [ ] Hot reload working for all services
- [ ] Pre-commit hooks configured (Husky)
- [ ] Commit message linting (Commitlint)
- [ ] Automated dependency updates (Renovate)
- [ ] Code review bot integration
- [ ] Automated changelog generation
- [ ] Preview environments for PRs

### User Experience

- [ ] Error messages user-friendly and actionable
- [ ] Help command comprehensive
- [ ] Onboarding flow smooth
- [ ] Rate limits communicated to users
- [ ] Maintenance mode capability
- [ ] Graceful degradation when services unavailable
- [ ] User feedback mechanism

### Performance

- [ ] Database queries optimized
- [ ] Caching strategy implemented
- [ ] CDN configured for static assets
- [ ] Image optimization
- [ ] Bundle size optimization
- [ ] Lazy loading implemented
- [ ] Service worker for PWA (if applicable)

### Business & Legal

- [ ] Terms of Service published
- [ ] Privacy Policy published
- [ ] Cookie consent (if applicable)
- [ ] GDPR compliance reviewed (if EU users)
- [ ] CCPA compliance reviewed (if CA users)
- [ ] Data retention policy documented
- [ ] User data export functionality
- [ ] User data deletion functionality

---

## Launch Day Checklist

### T-24 Hours (Pre-Launch)

- [ ] Final build deployed to production
- [ ] Database seeded with initial data (if any)
- [ ] Monitoring confirmed working
- [ ] Team notified of launch timeline
- [ ] Rollback plan reviewed by team
- [ ] Communication channels set up (Slack/Discord)
- [ ] Status page prepared (if public launch)

### T-0 (Launch)

- [ ] Bot invited to production Discord servers
- [ ] Commands deployed to production guilds (`pnpm run deploy:commands`)
- [ ] Landing page live and accessible
- [ ] Extension submitted/published to Chrome Web Store (if public)
- [ ] Announcement sent to relevant channels
- [ ] Social media posts scheduled (if applicable)
- [ ] Monitoring dashboard open

### T+1 Hour (Post-Launch)

- [ ] Check error rates (<1% acceptable)
- [ ] Verify response times (<200ms p95 for API)
- [ ] Monitor resource usage (CPU, memory, database)
- [ ] Scan for critical issues
- [ ] Test one command/feature from user perspective

### T+24 Hours (Day 1 Review)

- [ ] Error rate within acceptable range
- [ ] No critical bugs reported
- [ ] User feedback reviewed
- [ ] Performance metrics reviewed
- [ ] Document any issues for retrospective
- [ ] Celebrate launch 🎉

---

## Service-Specific Checklists

### Discord Bot

- [ ] Bot shows as "Online" in Discord
- [ ] Slash commands appear in command list
- [ ] `/ping` responds with latency
- [ ] Bot responds to DMs (if configured)
- [ ] Required intents enabled (GUILDS, GUILD_MESSAGES, MESSAGE_CONTENT)
- [ ] Bot permissions match requirements
- [ ] Rate limits won't hit Discord API limits
- [ ] Error messages are user-friendly
- [ ] Health endpoint accessible

### API Gateway

- [ ] All routes respond correctly
- [ ] OAuth flow completes successfully
- [ ] JWT generation works
- [ ] Token refresh works
- [ ] CORS configured correctly
- [ ] Rate limiting active
- [ ] Health endpoint responds
- [ ] Logs are being collected

### Chrome Extension

- [ ] Extension loads without errors
- [ ] Manifest version correct
- [ ] Icons and assets included
- [ ] Content scripts inject correctly
- [ ] Background script initializes
- [ ] Popup renders correctly
- [ ] Permissions are minimal
- [ ] CSP configured
- [ ] Extension signed (if published)

### Dashboard

- [ ] Dashboard accessible
- [ ] Metrics display correctly
- [ ] Real-time updates working
- [ ] Event log rotates correctly
- [ ] Alerts trigger appropriately
- [ ] Authentication required
- [ ] Data refreshes correctly

---

## Emergency Rollback Procedure

If critical issues arise post-launch:

1. **Stop New Traffic** - Scale down or disable problematic service
2. **Communicate** - Alert team and users
3. **Rollback** - Revert to previous known-good version
4. **Verify** - Confirm rollback successful
5. **Investigate** - Review logs and errors
6. **Document** - Record issue for post-mortem
7. **Fix Forward** - Address issue in development
8. **Re-deploy** - When fix is verified

---

## Post-Launch Tasks

### Week 1

- [ ] Daily monitoring review
- [ ] User feedback collection
- [ ] Bug triage and prioritization
- [ ] Performance tuning based on real usage
- [ ] Update documentation with learnings

### Week 2-4

- [ ] Weekly monitoring review
- [ ] Address high-priority bugs
- [ ] Plan next iteration features
- [ ] Conduct retrospective
- [ ] Update runbook with new scenarios

### Month 1-3

- [ ] Monthly security review
- [ ] Dependency updates
- [ ] Performance optimization
- [ ] Feature enhancements
- [ ] User surveys

---

## Checklist Verification

Before marking this checklist complete:

- [ ] All MUST FIX items completed
- [ ] All SHOULD FIX items completed or explicitly deferred with rationale
- [ ] OPTIONAL items evaluated and prioritized for post-launch
- [ ] Launch timeline confirmed with team
- [ ] Rollback plan tested
- [ ] Team trained on emergency procedures

---

**Checklist Owner:** _______________  
**Launch Date:** _______________  
**Sign-off:** _______________  

---

**Generated:** December 7, 2025  
**Based on:** TILTCHECK-FULL-SCOPE-AUDIT.md  
**Version:** 1.0
