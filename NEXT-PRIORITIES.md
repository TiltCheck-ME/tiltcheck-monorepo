# TiltCheck Next Priorities

**Updated:** 2025-11-24  
**Test Status:** 180/195 passing (92.3%)  
**Open PRs:** 4 (dependency updates + Railway deployment fix)

---

## 🚨 CRITICAL: Test Stabilization

The repository has **15 failing tests** that need immediate attention before proceeding with new features or deployment.

### Failing Test Breakdown

#### JustTheTip Module (10 failures) 🔴 HIGH PRIORITY
**Impact:** Core tipping functionality unreliable

```
Failures:
✗ Tipping Flow: min/max amount validation (4 tests)
✗ Wallet Management: duplicate registration prevention (2 tests)
✗ Wallet Management: disconnect validation (2 tests)
✗ Degen Trust: event emission (1 test)
✗ Wallet Service: transaction history ordering (1 test)
```

**Root Causes:**
1. Validation logic for min/max amounts not working correctly
2. Wallet duplicate check error messages don't match test expectations
3. Wallet disconnect doesn't return expected wallet information
4. Transaction history ordering is reversed
5. Degen trust events not emitted alongside casino trust events

**Action Items:**
- [ ] Review and fix validation in `modules/justthetip/src/core.ts`
- [ ] Update error messages to match test expectations OR update tests
- [ ] Fix disconnect method to return wallet info before deletion
- [ ] Fix transaction history sort order (most recent first)
- [ ] Ensure degen trust events emit alongside casino trust

**Estimated Effort:** 4-6 hours

---

#### FreeSpinScan Module (4 failures) 🟡 MEDIUM PRIORITY
**Impact:** Promo submission workflow unreliable

```
Failures:
✗ Approval workflow: approve pending submission
✗ Approval workflow: deny pending submission with reason
✗ Approval workflow: get pending submissions
✗ Blocklist: domain and pattern matching
```

**Root Causes:**
1. Approval/denial workflow methods not implemented or broken
2. Blocklist pattern matching logic failing

**Action Items:**
- [ ] Implement/fix `approvePromo()` method
- [ ] Implement/fix `denyPromo()` method
- [ ] Implement/fix `getPendingPromos()` method
- [ ] Debug blocklist pattern matching logic

**Estimated Effort:** 3-4 hours

---

#### DA&D Game Module (1 failure) 🟢 LOW PRIORITY
**Impact:** Game voting feature broken

```
Failures:
✗ Voting: allow players to vote
```

**Root Causes:**
1. Voting logic not correctly implemented

**Action Items:**
- [ ] Debug and fix voting method in `modules/dad/src/core.ts`

**Estimated Effort:** 1-2 hours

---

#### Integration Tests (Multiple failures) 🟡 MEDIUM PRIORITY
**Impact:** Module integration unreliable

```
Failing Suites:
✗ CollectClock integration tests
✗ Trust engine integration tests
✗ SusLink module tests
✗ LinkGuard emission tests
✗ LockVault tests
✗ Landing page tests
✗ Manifest injection tests
```

**Root Causes:**
1. Modules may have broken integration points
2. Test setup/teardown may be insufficient
3. Event Router integration may have issues

**Action Items:**
- [ ] Review each failing integration test
- [ ] Check event emission and subscription
- [ ] Verify module initialization order
- [ ] Ensure proper test isolation

**Estimated Effort:** 6-8 hours

---

## 📦 Deployment Readiness

### Railway Deployment
- ✅ **FIXED:** Procfile dashboard entry point (PR #58 - pending merge)
- ⏳ **PENDING:** Test full deployment pipeline
- ⏳ **PENDING:** Validate all services start correctly
- ⏳ **PENDING:** Add health check endpoints

### Environment Configuration
- ⏳ **NEEDED:** Document all required environment variables
- ⏳ **NEEDED:** Create production .env.example templates
- ⏳ **NEEDED:** Add environment validation on startup

**Action Items:**
- [ ] Merge PR #58 (Railway deployment fix)
- [ ] Create comprehensive environment variable documentation
- [ ] Test deployment on Railway staging environment
- [ ] Add startup health checks for all services
- [ ] Create deployment troubleshooting guide

**Estimated Effort:** 4-6 hours

---

## 🔨 Module Implementation

### TiltCheck Core (Not Started) 🔴 HIGH PRIORITY
**Purpose:** Tilt detection & accountability - the namesake module

**Requirements:**
- Tilt detection algorithm (behavior pattern analysis)
- Cooldown nudge system (time-based recommendations)
- Accountability tools (buddy system, limits)
- Discord command integration
- Event-driven architecture

**Action Items:**
- [ ] Design tilt detection algorithm
- [ ] Implement core detection logic
- [ ] Add cooldown nudge system
- [ ] Create accountability buddy features
- [ ] Add comprehensive tests (target: 15+ tests)
- [ ] Integrate with Discord bot
- [ ] Document API and usage

**Estimated Effort:** 16-20 hours (1-2 weeks)

---

### CollectClock Enhancement 🟡 MEDIUM PRIORITY
**Status:** Placeholder exists, needs full implementation

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

**Estimated Effort:** 12-16 hours

---

## 📝 Documentation Updates

### Critical Documentation Gaps
1. **Test Failure Resolution Guide** - Help developers understand and fix failing tests
2. **Deployment Guide** - Railway-specific deployment instructions
3. **Environment Variables** - Comprehensive list with descriptions
4. **Troubleshooting Guide** - Common issues and solutions
5. **Module Integration Guide** - How to add new modules

**Action Items:**
- [ ] Create TEST-FAILURES.md with analysis of each failing test
- [ ] Update DEPLOYMENT.md with Railway instructions
- [ ] Create ENV-VARIABLES.md reference
- [ ] Create TROUBLESHOOTING.md
- [ ] Update CONTRIBUTING.md with module integration guide

**Estimated Effort:** 4-6 hours

---

## 🔄 Dependency Management

### Open Dependency PRs (Review Needed)
- **PR #56:** redis 4.7.1 → 5.10.0 (MAJOR version bump, review carefully)
- **PR #55:** jsdom 24.1.3 → 27.2.0 (MAJOR version bump, may break tests)
- **PR #54:** @types/node 20.19.25 → 24.10.1 (MAJOR version bump)
- **PR #57:** ai 5.0.100 → 5.0.101 (already merged)

**Action Items:**
- [ ] Review breaking changes for each major version bump
- [ ] Test locally with updated dependencies
- [ ] Merge or close PRs based on compatibility
- [ ] Update pnpm-lock.yaml

**Estimated Effort:** 2-3 hours

---

## 📊 Priority Timeline

### Week 1 (Current - CRITICAL)
1. **Fix JustTheTip tests** (10 failures) - 6 hours
2. **Fix FreeSpinScan tests** (4 failures) - 4 hours
3. **Fix DA&D voting test** (1 failure) - 2 hours
4. **Review and merge Railway deployment fix** - 1 hour
5. **Document test failures** - 2 hours

**Total: ~15 hours** ⏰

### Week 2 (HIGH PRIORITY)
1. **Fix integration tests** - 8 hours
2. **Start TiltCheck Core implementation** - 12 hours
3. **Update deployment documentation** - 4 hours

**Total: ~24 hours** ⏰

### Week 3-4 (MEDIUM PRIORITY)
1. **Complete TiltCheck Core** - 8 hours
2. **Enhance CollectClock** - 16 hours
3. **Review and merge dependency updates** - 3 hours
4. **Create comprehensive documentation** - 4 hours

**Total: ~31 hours** ⏰

---

## ✅ Success Criteria

### Before Production Deployment
- [ ] ✅ All tests passing (195/195 = 100%)
- [ ] ✅ Railway deployment successful
- [ ] ✅ All environment variables documented
- [ ] ✅ Health checks implemented and passing
- [ ] ✅ TiltCheck Core implemented and tested
- [ ] ✅ Discord bot commands fully tested
- [ ] ✅ Documentation complete and accurate

### Phase 1 MVP Ready
- [ ] ✅ All core modules tested and stable
- [ ] ✅ Discord bot deployed and running
- [ ] ✅ Trust engines operational
- [ ] ✅ User authentication working
- [ ] ✅ Basic monitoring in place

---

## 🎯 Next Immediate Action

**START HERE:** Fix JustTheTip test failures (highest priority, most failures)

```bash
# Run JustTheTip tests only
npx pnpm test modules/justthetip

# Focus on fixing these test files:
# 1. modules/justthetip/tests/justthetip.test.ts
# 2. modules/justthetip/tests/wallet-service.test.ts
# 3. modules/justthetip/tests/degen-trust.test.ts
```

**Expected Outcome:** 10 additional tests passing, bringing total to 190/195 (97.4%)

---

**Last Updated:** 2025-11-24  
**Next Review:** After test stabilization (estimated 2-3 days)
