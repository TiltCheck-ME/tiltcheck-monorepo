# TiltCheck Next Priorities

**Updated:** November 28, 2025  
**Test Status:** 411/411 passing (100%) ✅  
**Build Status:** All 38 packages build successfully ✅  
**Open PRs:** 2 (PR #104: Browser extension docs, PR #105: Status update)

---

## 🔥 CRITICAL: Fix CI/CD Pipeline

### Health Check Workflow Failing ❌
**Root Cause:** Docker build fails during production dependency install

**The Problem:**
When running `pnpm install --prod` in the Docker build, the `casino-data-api` package tries to run its `build` script (pnpm lifecycle behavior), which requires `tsc` (TypeScript), but TypeScript is a devDependency that's not installed in production mode.

```
services/casino-data-api prepare: sh: tsc: not found
ELIFECYCLE Command failed.
```

**Solutions (choose one):**

#### Option 1: Quick Fix (Recommended)
Add `prepare` script with graceful fallback in `services/casino-data-api/package.json`:
```json
{
  "scripts": {
    "prepare": "npm run build 2>/dev/null || true"
  }
}
```

This makes the prepare script fail gracefully when TypeScript isn't available (production mode).

#### Option 2: Disable pnpm ignore-scripts
Add `.npmrc` at project root with:
```
ignore-scripts=false
side-effects-cache=false
```
And ensure pre-built `dist/` files are included in the Docker context.

#### Option 3: Multi-Stage Docker Build
Build TypeScript in a builder stage with devDependencies, then copy only compiled files to production stage.

**Action Items:**
- [ ] Apply fix to casino-data-api package.json
- [ ] Re-run health-check workflow
- [ ] Verify CI passes on main branch

**Estimated Effort:** 30 minutes

---

## ✅ COMPLETED: Test Stabilization

All tests are now passing! The repository has **411 tests** all passing across 50 test files.

### Recent Accomplishments (November 28, 2025)

#### Status Review ✅ COMPLETE
- ✅ Verified all 411 tests pass
- ✅ Verified all 38 packages build successfully
- ✅ Identified CI failure root cause (Docker build issue)
- ✅ Updated STATUS.md with current information
- ✅ Updated NEXT-PRIORITIES.md with actionable next steps

#### TiltCheck Core Module ✅ COMPLETE
**The namesake module is now fully implemented!**

**Features Implemented:**
- ✅ Tilt detection logic (message patterns, loss streaks, behavioral signals)
- ✅ Cooldown management (auto and manual cooldowns)
- ✅ Soft-nudge message system (humorous, friendly nudges)
- ✅ Violation tracking and escalation
- ✅ Event integration (tilt.detected, cooldown.violated events)
- ✅ Comprehensive tests (55 tests, 100% passing)
- ✅ README documentation

**Signal Types Detected:**
- `rapid-messages` - 5+ messages in 30 seconds
- `caps-spam` - All caps message spam
- `rage-quit` - Rage keywords detected
- `loan-request` - Asking for loans/money
- `loss-streak` - 3+ consecutive losses

---

## 🚀 Priority 1: Fix CI Then Deploy

### After CI Fix: Railway Deployment
- ✅ **FIXED:** Procfile dashboard entry point (PR #58 - merged)
- ✅ **FIXED:** .dockerignore to include casino-data-api dist files (PR #102 - merged)
- ⏳ **PENDING:** Fix casino-data-api prepare script
- ⏳ **PENDING:** Test full deployment pipeline
- ⏳ **PENDING:** Validate all services start correctly

**Action Items:**
- [ ] Fix casino-data-api prepare script
- [ ] Re-run health-check workflow to verify fix
- [ ] Test deployment on Railway staging environment
- [ ] Add startup health checks for all services
- [ ] Create deployment troubleshooting guide

**Estimated Effort:** 4-6 hours

---

## 🔌 Priority 2: Backend Production Mode

### AI Gateway Production Mode
**Status:** Uses mock responses, needs real API integration

**Action Items:**
- [ ] Replace mock responses with actual OpenAI API calls
- [ ] Configure Vercel AI SDK for production
- [ ] Add rate limiting and cost monitoring
- [ ] Test with real prompts

**Estimated Effort:** 6-8 hours

### Trust Rollup Real Data
**Status:** External fetchers return mock data

**Action Items:**
- [ ] Implement actual RTP verification API calls
- [ ] Connect to external casino data sources
- [ ] Add license verification integration
- [ ] Test with real casino domains

**Estimated Effort:** 8-12 hours

---

## 🔨 Priority 3: Module Enhancement

### CollectClock Enhancement 🟡 MEDIUM PRIORITY
**Status:** Basic structure exists, needs full implementation

**Requirements:**
- Bonus tracking (daily, weekly, monthly)
- Nerf detection (bonus value changes)
- Notification system (Discord DMs)
- Bonus cycle prediction (ML-based)
- Trust engine integration

**Action Items:**
- [ ] Implement bonus tracking logic
- [ ] Add nerf detection algorithm
- [ ] Create notification system
- [ ] Integrate with Trust Engines
- [ ] Add prediction models (Phase 2)
- [ ] Expand test coverage

**Estimated Effort:** 10-14 hours

---

### Accountabilibuddy 🟡 FUTURE PRIORITY
**Status:** Not started - Phase 2 feature

**Requirements:**
- Shared wallet monitoring
- Phone-a-friend intervention system
- Buddy matching algorithm
- Discord integration

**Estimated Effort:** 20-25 hours

---

## 🐛 Priority 4: Browser Extension Fixes

**Issues Identified (PR #104):**
- `popup.html` line 411 references `popup-enhanced.js` but actual file is `popup.js`
- `popup.js` expects DOM elements that don't exist in `popup.html`
- Source files in zip have stale URLs vs bundled `content.js`

**Action Items:**
- [ ] Fix popup.html script reference
- [ ] Align DOM element IDs between popup.js and popup.html
- [ ] Update bundled content.js with correct URLs

**Estimated Effort:** 2-3 hours

---

## 📝 Priority 5: Documentation Updates

### Documentation Gaps
1. **Deployment Guide** - Railway-specific deployment instructions
2. **Environment Variables** - Comprehensive list with descriptions
3. **Troubleshooting Guide** - Common issues and solutions
4. **Module Integration Guide** - How to add new modules

**Action Items:**
- [ ] Update DEPLOYMENT.md with Railway instructions
- [ ] Create ENV-VARIABLES.md reference
- [ ] Create TROUBLESHOOTING.md
- [ ] Update CONTRIBUTING.md with module integration guide

**Estimated Effort:** 4-6 hours

---

## 📊 Priority Timeline

### This Week (CI/CD Focus)
1. **Fix CI pipeline** - 30 minutes
2. **Deploy to Railway** - 4 hours
3. **Health checks** - 2 hours

**Total: ~6-7 hours** ⏰

### Next 2 Weeks (Production Mode)
1. **AI Gateway production mode** - 6-8 hours
2. **Trust Rollup real data** - 8-12 hours
3. **Documentation updates** - 4 hours

**Total: ~18-24 hours** ⏰

### Month 2 (Enhancement)
1. **Enhance CollectClock** - 10-14 hours
2. **Accountabilibuddy** - 20-25 hours
3. **Web UI enhancements** - 10-15 hours

**Total: ~40-54 hours** ⏰

---

## ✅ Success Criteria

### Before Production Deployment
- [x] ✅ All tests passing (411/411 = 100%)
- [x] ✅ All packages build successfully (38/38)
- [x] ✅ TiltCheck Core implemented and tested
- [ ] ⏳ CI pipeline passing (health-check workflow)
- [ ] ⏳ Railway deployment successful
- [ ] ⏳ All environment variables documented
- [ ] ⏳ Health checks implemented and passing
- [ ] ⏳ Discord bot commands fully tested

### Phase 1 MVP Ready
- [x] ✅ All core modules tested and stable
- [ ] ⏳ Discord bot deployed and running
- [ ] ⏳ Trust engines operational with real data
- [ ] ⏳ User authentication working
- [ ] ⏳ Basic monitoring in place

---

## 🎯 Next Immediate Action

**START HERE:** Fix the CI pipeline

```bash
# 1. Fix casino-data-api prepare script
# Edit services/casino-data-api/package.json to add:
# "prepare": "npm run build 2>/dev/null || true"

# 2. Test the build locally
pnpm build

# 3. Run all tests
pnpm test

# 4. Commit and push to trigger CI
```

**Expected Outcome:** Health-check workflow passes, enabling deployment

---

**Last Updated:** November 28, 2025  
**Next Review:** After CI fix verified (estimated 1-2 days)
