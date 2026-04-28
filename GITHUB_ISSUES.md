<!-- Copyright 2024-2026 TiltCheck | Generated Issue List -->

# TiltCheck Monorepo — Proposed GitHub Issues

> Generated from: `AUDIT-REPORT.md`, `TODO.md`, `DEAD_CODE_TRIAGE.md`, `SECURITY_UPSTREAM_ISSUE_TEMPLATE.md`, and codebase analysis.

---

## 🐛 CRITICAL BUGS

### Issue #1 — Chrome Extension MV3 manifest is broken
**Labels:** `bug`, `critical`, `chrome-extension`

**Description:**
`apps/chrome-extension/src/manifest.json` is a Progressive Web App manifest, not a Chrome Extension MV3 manifest. It is missing all required fields:
- `manifest_version: 3`
- `permissions` (`storage`, `tabs`, `activeTab`)
- `background.service_worker`
- `content_scripts`
- `action` (popup)

The extension **will not load in Chrome** as-is.

**Acceptance Criteria:**
- [ ] Replace manifest with proper MV3 format
- [ ] Declare `content_scripts: [content.js]`
- [ ] Declare `action` for popup
- [ ] Add required permissions
- [ ] Verify extension loads in `chrome://extensions/` (Developer mode)

**Reference:** `AUDIT-REPORT.md` B1

---

### Issue #2 — Report command uses wrong auth token (reports never persisted)
**Labels:** `bug`, `critical`, `discord-bot`, `security`

**Description:**
`apps/discord-bot/src/commands/report.ts` (line ~57) sends:
```ts
Authorization: Bearer ${process.env.DISCORD_TOKEN}
```
The Discord bot token is **not** a valid API auth token. The backend rejects it, meaning `/report` command submissions are **never persisted**. This breaks the entire moderation pipeline.

**Acceptance Criteria:**
- [ ] Replace `DISCORD_TOKEN` with `INTERNAL_API_SECRET` env var
- [ ] Ensure `INTERNAL_API_SECRET` is shared between bot and API
- [ ] Test that `/report` persists to backend successfully
- [ ] Update `.env.template` with `INTERNAL_API_SECRET`

**Reference:** `AUDIT-REPORT.md` B3

---

### Issue #3 — Stripe payment routes return 501 / disabled
**Labels:** `bug`, `critical`, `api`, `payments`

**Description:**
All payment endpoints in `apps/api/src/routes/stripe.ts` return:
```json
{ "status": "disabled", "provider": null }
```
Routes affected: `/payments/config`, `/payments/create-checkout-session`, `/payments/webhook`

Revenue is completely blocked. Users cannot complete purchases or upgrade subscriptions.

**Acceptance Criteria:**
- [ ] Implement real Stripe checkout session creation
- [ ] Implement webhook handler for Stripe events
- [ ] Add payment config endpoint with live Stripe keys
- [ ] Add tests for all three routes
- [ ] Document required env vars (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`)

**Reference:** `AUDIT-REPORT.md` — Stripe section

---

### Issue #4 — Stake API client is fully stubbed
**Labels:** `bug`, `high`, `modules`, `stake`

**Description:**
`modules/stake/src/client.ts` — all three core methods are placeholder implementations with real API calls commented out:
- `checkEligibility()` — placeholder
- `claimCode()` — placeholder
- `getWagerRequirement()` — returns mock data (100 USD)

When `STAKE_MOCK_API !== 'true'`, it hits an unverified real endpoint.

**Acceptance Criteria:**
- [ ] Verify Stake API contract
- [ ] Implement real API calls for all three methods
- [ ] Add error handling for API failures
- [ ] Add tests for mock vs. production mode
- [ ] Document integration requirements

**Reference:** `AUDIT-REPORT.md` B11

---

### Issue #5 — Walletcheck hardcodes USDC balance to '0'
**Labels:** `bug`, `high`, `modules`, `walletcheck`, `security`

**Description:**
`modules/walletcheck/src/index.ts` (line ~90):
```ts
usdcBalance: '0', // Placeholder
```

Token approval scanning is commented out. Threat detection only checks ETH balance vs transaction count. No real heuristic for sweeper bots, approvals, or EIP-7702.

**Acceptance Criteria:**
- [ ] Integrate `ethers` for token balance calls
- [ ] Integrate Moralis/Alchemy API for token approvals
- [ ] Implement sweeper bot heuristics
- [ ] Add EIP-7702 detection
- [ ] Remove hardcoded `'0'` placeholder

**Reference:** `AUDIT-REPORT.md` B6

---

## ⚠️ MEDIUM BUGS

### Issue #6 — SusLink auto-scan disabled in Discord bot
**Labels:** `bug`, `medium`, `discord-bot`, `suslink`

**Description:**
`apps/discord-bot/src/index.ts` (line 35):
```ts
// import '@tiltcheck/suslink';
```

The SusLink module is never initialized. The auto-scan block in `events.ts` (lines 141–145) is dead code. The EventRouter never receives `link.scanned` events.

**Acceptance Criteria:**
- [ ] Uncomment the SusLink import
- [ ] Wire up auto-scan config flag
- [ ] Implement scan block in `events.ts` using `LinkScanner`
- [ ] Test link scanning on Discord messages

**Reference:** `AUDIT-REPORT.md` B7, B8

---

### Issue #7 — Trust alerts pipeline disabled
**Labels:** `bug`, `medium`, `discord-bot`, `trust`

**Description:**
`apps/discord-bot/src/index.ts` (lines 79–81, 118–126):
```ts
// TrustAlertsHandler.initialize()
// startTrustAdapter()
```

Both are commented out with log messages saying "disabled". The trust event pipeline from EventRouter → Discord is completely silent.

**Acceptance Criteria:**
- [ ] Re-enable `TrustAlertsHandler.initialize()`
- [ ] Re-enable `startTrustAdapter()`
- [ ] Verify trust event signatures are stable
- [ ] Test trust alert delivery to Discord channels

**Reference:** `AUDIT-REPORT.md` B9

---

### Issue #8 — Chrome Extension popup configurator has missing DOM elements
**Labels:** `bug`, `medium`, `chrome-extension`

**Description:**
`apps/chrome-extension/src/popup.ts` (lines 66–68) queries DOM elements:
- `configBtn`, `configPanel`, `cfgCancel`, `cfgSave`, `cfgDomain`, `cfgBet`, `cfgResult`

**None of these exist in `popup.html`**. Every related event listener silently no-ops because elements are `null`.

**Acceptance Criteria:**
- [ ] Add configurator panel/fields to `popup.html`
- [ ] OR remove dead configurator code from `popup.ts`
- [ ] Verify popup UI functions correctly

**Reference:** `AUDIT-REPORT.md` B2

---

### Issue #9 — SusLink scanner uses invalid fetch timeout
**Labels:** `bug`, `medium`, `modules`, `suslink`

**Description:**
`modules/suslink/src/scanner.ts` (line 247):
```ts
fetch(url, { ..., timeout: 5000, ... })
```

`timeout` is **not a valid Fetch API option** in Node.js. It is silently ignored. Uses `as any` to suppress the TypeScript error. Redirect following never actually times out.

**Acceptance Criteria:**
- [ ] Replace `timeout: 5000` with `AbortController` + `AbortSignal.timeout(5000)`
- [ ] Remove `as any` cast
- [ ] Add test for timeout behavior

**Reference:** `AUDIT-REPORT.md` B5

---

### Issue #10 — TriviaDrops AI question generation is disabled
**Labels:** `bug`, `medium`, `modules`, `triviadrops`, `ai`

**Description:**
`modules/triviadrops/ai-questions.js`:
- `isAIAvailable()` hardcoded to `false` (line 18)
- `generateAIQuestion()` ignores AI path entirely
- Only ~16 hardcoded static questions exist
- No difficulty or category diversity

**Acceptance Criteria:**
- [ ] Wire up OpenAI / Vercel AI SDK
- [ ] Implement `isAIAvailable()` with real API key check
- [ ] Generate questions by difficulty and category
- [ ] Add fallback to expanded static bank if AI unavailable

**Reference:** `AUDIT-REPORT.md` B10

---

### Issue #11 — Airdrop claim handler uses brittle monkey-patch
**Labels:** `bug`, `medium`, `discord-bot`, `tech-debt`

**Description:**
`apps/discord-bot/src/commands/tip.ts` (line 1472) and `events.ts` (line 166):
```ts
(tip as any).handleAirdropClaim = handleAirdropClaim;
// Later:
(tipCommand as any).handleAirdropClaim(...)
```

No type safety. Silently fails if property isn't set (e.g., command load order changes).

**Acceptance Criteria:**
- [ ] Create shared button-handler registry (e.g., `Map<string, ButtonHandler>`)
- [ ] Register airdrop claim handler in registry
- [ ] Remove all `as any` casts for this flow
- [ ] Add type safety tests

**Reference:** `AUDIT-REPORT.md` B4

---

## 🔧 LOW PRIORITY / CODE QUALITY

### Issue #12 — Database tests are placeholder-only
**Labels:** `bug`, `low`, `testing`, `database`

**Description:**
`packages/database/tests/database.test.ts` (line 12):
```ts
'can be constructed and has placeholder methods'
```

No SQL queries, no connection tests, no CRUD tests.

**Acceptance Criteria:**
- [ ] Add real integration tests with mocked DB connections
- [ ] Test SQL query execution
- [ ] Test connection lifecycle (connect, disconnect, reconnect)
- [ ] Test CRUD operations for all tables

**Reference:** `AUDIT-REPORT.md` B15

---

### Issue #13 — Multiple `as any` casts mask type errors
**Labels:** `tech-debt`, `low`, `typescript`

**Description:**
Bot service files contain over a dozen `as any` casts:
- `tilt-agent.ts` (×4)
- `tilt-events-handler.ts` (×4)
- `events.ts` (×1)
- `support.ts`, `lockvault.ts`, etc.

Some are benign (Elasticsearch SDK shapes), others hide real type mismatches.

**Acceptance Criteria:**
- [ ] Define proper interfaces for ES|QL responses
- [ ] Define proper interfaces for Discord channel types
- [ ] Replace `as any` with typed alternatives
- [ ] Run TypeScript strict mode to verify

**Reference:** `AUDIT-REPORT.md` B14

---

## ✨ FEATURE REQUESTS

### Issue #14 — Implement Safe vs. Degen Mode
**Labels:** `feature`, `onboarding`, `discord-bot`, `personalization`

**Description:**
Create an interactive onboarding tutorial/quiz for new users to determine preferred communication style ("Safe" vs. "Degen"). Store preference and adapt all bot replies accordingly.

**Acceptance Criteria:**
- [ ] Design onboarding quiz flow
- [ ] Store user preference in database
- [ ] Adapt bot message tone based on preference
- [ ] Add `/mode` command to switch preferences
- [ ] Update all command replies to respect mode

**Reference:** `TODO.md`

---

### Issue #15 — BonusCheck 2.0: Formula Reverse-Engineering
**Labels:** `feature`, `analytics`, `api`, `bonus`

**Description:**
Allow users to input weekly wager, P/L, and collected bonuses. After receiving actual bonus, use data to reverse-engineer the casino's bonus calculation formula. Use derived formula to predict future bonuses and flag if actual amount is "light" (formula changed).

**Acceptance Criteria:**
- [ ] Design data collection schema
- [ ] Implement formula inference algorithm
- [ ] Add prediction engine
- [ ] Add anomaly detection for formula changes
- [ ] Create dashboard visualization

**Reference:** `TODO.md`

---

### Issue #16 — Tilt-Nudge to Voice Chat
**Labels:** `feature`, `chrome-extension`, `discord-bot`, `tilt`, `safety`

**Description:**
When Chrome Extension's Tilt Detector identifies a user is tilted, send event to backend. Backend triggers Discord Bot to DM user with a "nudge" encouraging them to join the "Degen Accountability" voice channel for cooldown.

**Acceptance Criteria:**
- [ ] Extension emits `tilt.detected` event to backend
- [ ] Backend triggers Discord bot DM
- [ ] DM contains voice channel invite link
- [ ] Track nudge effectiveness (user joined? cooled down?)

**Reference:** `TODO.md`

---

### Issue #17 — AutoVault: Auto-locking vault feature
**Labels:** `feature`, `vault`, `chrome-extension`, `safety`

**Description:**
Auto-locking vault that engages when tilt is detected or configurable triggers fire (e.g., loss streak, time limit, balance threshold).

**Acceptance Criteria:**
- [ ] Define trigger conditions (tilt, loss streak, time, balance)
- [ ] Implement auto-lock logic in extension
- [ ] Integrate with LockVault module
- [ ] Add user-configurable settings
- [ ] Add cooldown and override mechanisms

**Reference:** `TODO.md`

---

### Issue #18 — Redeem-to-Win / Redeem Nudge in TiltGuard
**Labels:** `feature`, `chrome-extension`, `redeem`, `safety`

**Description:**
Track user's casino balance in real-time on supported sites. When balance crosses a user-configured redeem/cash-out threshold, trigger a positive UI nudge encouraging cash-out. Celebrate successful redeems.

**Acceptance Criteria:**
- [ ] Track balance on supported casino sites
- [ ] Add per-site redeem threshold configuration
- [ ] Trigger nudge UI when threshold crossed
- [ ] Detect successful redeem (balance drop)
- [ ] Add celebratory notification
- [ ] Add "Successful Redeems" metric to dashboard

**Reference:** `TODO.md`

---

### Issue #19 — Enable Magic Wallet integration
**Labels:** `feature`, `wallet`, `onboarding`, `auth`

**Description:**
Magic Wallet option is currently disabled in onboarding with `setDisabled(true)` on the button. Wire up actual Magic Wallet auth flow for passwordless wallet creation.

**Acceptance Criteria:**
- [ ] Integrate Magic SDK
- [ ] Implement wallet creation flow
- [ ] Link Magic wallet to TiltCheck account
- [ ] Remove `setDisabled(true)`
- [ ] Add fallback for users without existing wallets

**Reference:** `AUDIT-REPORT.md` — Chrome Extension section

---

### Issue #20 — NFT-based Degen ID
**Labels:** `feature`, `nft`, `identity`, `onboarding`

**Description:**
Referenced in onboarding as "Coming soon". Implement NFT minting/verification for Degen identity and proof-of-participation.

**Acceptance Criteria:**
- [ ] Design NFT metadata schema
- [ ] Implement minting contract (Solana/EVM)
- [ ] Integrate minting into onboarding flow
- [ ] Add NFT verification to user profile
- [ ] Display "Degen ID" badge in Discord/Extension

**Reference:** `TODO.md`

---

### Issue #21 — Implement Accountabilibuddy / Phone-a-Friend
**Labels:** `feature`, `chrome-extension`, `safety`, `buddy`

**Description:**
`notifyBuddy()` is called in the extension sidebar but the buddy endpoint is not implemented. Create a buddy system where users can nominate a friend to receive tilt alerts.

**Acceptance Criteria:**
- [ ] Implement buddy registration (Discord username/ID)
- [ ] Create `POST /buddy/notify` endpoint
- [ ] Send DM to buddy when tilt detected
- [ ] Allow buddy to send "cooldown" message back
- [ ] Add buddy management UI in extension

**Reference:** `AUDIT-REPORT.md` — Chrome Extension section

---

### Issue #22 — Implement `/api/stats` endpoint for landing KPI strip
**Labels:** `feature`, `api`, `web`

**Description:**
`apps/web/index.html` contains:
```html
<!-- TODO: Wire up to /api/stats endpoint when available -->
```

The landing page KPI strip shows placeholder values. Need a live endpoint + client fetch.

**Acceptance Criteria:**
- [ ] Create `GET /api/stats` endpoint
- [ ] Aggregate stats: vaults locked, degens protected, casinos audited
- [ ] Wire client-side fetch in `index.html`
- [ ] Add caching (TTL ~60s)
- [ ] Handle offline/unavailable gracefully

**Reference:** `DEAD_CODE_TRIAGE.md` Section C.3

---

### Issue #23 — Expand TriviaDrops with OpenAI/Vercel AI SDK
**Labels:** `feature`, `ai`, `modules`, `triviadrops`

**Description:**
Replace the static question bank (~16 questions) with AI-generated trivia across difficulties and categories (sports, math, casino history, responsible gambling).

**Acceptance Criteria:**
- [ ] Integrate OpenAI or Vercel AI SDK
- [ ] Generate questions by difficulty (easy/medium/hard/degen)
- [ ] Generate questions by category
- [ ] Cache generated questions to reduce API costs
- [ ] Add rate limiting

**Reference:** `AUDIT-REPORT.md` B10

---

### Issue #24 — Real USDC/token approval scanning in Walletcheck
**Labels:** `feature`, `modules`, `walletcheck`, `security`

**Description:**
Full EVM threat detection: integrate `ethers` token balance calls and/or Moralis/Alchemy API for token approvals, sweeper bot detection, and EIP-7702 analysis.

**Acceptance Criteria:**
- [ ] Fetch real USDC balance (not hardcoded '0')
- [ ] Scan for unlimited token approvals
- [ ] Detect sweeper bot patterns
- [ ] Add EIP-7702 account abstraction analysis
- [ ] Update threat scoring algorithm

**Reference:** `AUDIT-REPORT.md` B6

---

### Issue #25 — Cloudflare Workers: Geo-compliance edge worker
**Labels:** `feature`, `infrastructure`, `cloudflare`, `compliance`

**Description:**
Block or inform restricted jurisdictions at the edge. Planned but not started. Execute on Cloudflare's global network for <50ms latency.

**Acceptance Criteria:**
- [ ] Implement geo-IP lookup
- [ ] Map jurisdictions to gambling regulations
- [ ] Return compliance nudge or block for restricted regions
- [ ] Add KV caching for jurisdiction rules
- [ ] Deploy via Wrangler

**Reference:** `TODO.md`

---

### Issue #26 — Cloudflare Workers: Edge nonce generation
**Labels:** `feature`, `infrastructure`, `cloudflare`, `security`

**Description:**
High-speed nonce generation at the edge for transaction signing. Planned but not started.

**Acceptance Criteria:**
- [ ] Implement cryptographically secure nonce generation
- [ ] Expose via Cloudflare Worker endpoint
- [ ] Add rate limiting per IP/wallet
- [ ] Document latency benchmarks

**Reference:** `TODO.md`

---

### Issue #27 — AI onboarding interview
**Labels:** `feature`, `ai`, `onboarding`, `personalization`

**Description:**
AI-driven onboarding tutorial/interview to personalize user experience. Listed in `tiltcheck-features.agent.md` but not implemented.

**Acceptance Criteria:**
- [ ] Design interview question flow
- [ ] Integrate AI for dynamic responses
- [ ] Store preferences (risk tolerance, game types, goals)
- [ ] Generate personalized dashboard based on interview

**Reference:** `tiltcheck-features.agent.md`

---

### Issue #28 — LockVault paid early unlock + auto-withdraw
**Labels:** `feature`, `vault`, `payments`

**Description:**
Currently disabled until fee routing / execution consumer is wired:
- Paid early wallet unlock throws `FEATURE_NOT_IMPLEMENTED`
- Auto-withdraw is disabled with warning log

**Acceptance Criteria:**
- [ ] Implement fee routing for paid unlocks
- [ ] Integrate with payment provider (Stripe/SOL)
- [ ] Wire execution consumer for auto-withdraw
- [ ] Add transaction monitoring
- [ ] Add safety limits and confirmations

**Reference:** `AUDIT-REPORT.md` — LockVault section

---

## 🧹 DEAD CODE & CLEANUP

### Issue #29 — Remove legacy user-dashboard server.js
**Labels:** `cleanup`, `tech-debt`, `user-dashboard`

**Description:**
`apps/user-dashboard/src/server.js` contains mock scaffolding (`Mock data stores (replace with database in production)`). Not referenced by package scripts (`package.json` runs `src/index.ts`). No code references found.

**Acceptance Criteria:**
- [ ] Delete `apps/user-dashboard/src/server.js`
- [ ] Verify build still passes
- [ ] Update any docs referencing the file

**Reference:** `DEAD_CODE_TRIAGE.md` Section A.1

---

### Issue #30 — Remove orphan Discord command files
**Labels:** `cleanup`, `tech-debt`, `discord-bot`

**Description:**
11 command files are no longer loaded by the command handler:
- `airdrop.ts`, `bonus.ts`, `cooldown.ts`, `dashboard.ts`, `justthetip.ts`
- `scan.ts`, `setpromochannel.ts`, `support.ts`, `terms.ts`, `triviadrop.ts`, `trust.ts`

Command barrel (`commands/index.ts`) only exports `tiltcheck`, `tip`, `dad`, `poker`.

**Acceptance Criteria:**
- [ ] Confirm no imports/references exist
- [ ] Remove files from `apps/discord-bot/src/commands/`
- [ ] OR migrate to owning bot app if still needed
- [ ] Verify bot still builds and starts

**Reference:** `DEAD_CODE_TRIAGE.md` Section A.2

---

### Issue #31 — Remove orphan helper script
**Labels:** `cleanup`, `tech-debt`, `discord-bot`

**Description:**
`apps/discord-bot/src/clear-broken-commands.ts` has no references from package scripts or source.

**Acceptance Criteria:**
- [ ] Delete file
- [ ] Verify build passes

**Reference:** `DEAD_CODE_TRIAGE.md` Section A.3

---

### Issue #32 — Remove empty/unreferenced express-utils files
**Labels:** `cleanup`, `tech-debt`, `packages`

**Description:**
Files outside the build path in `packages/express-utils/`:
- `gameplay-analyzer.ts` (empty)
- `scanner.ts` (empty)
- `triviadrops.ts` (empty)
- `vault.ts` (empty)
- `types.ts` (non-empty but unreferenced)

Package builds from `src/**/*.ts` only.

**Acceptance Criteria:**
- [ ] Delete empty files
- [ ] Evaluate `types.ts` for references; remove if truly unused
- [ ] Verify build passes

**Reference:** `DEAD_CODE_TRIAGE.md` Section A.4

---

### Issue #33 — Remove stale tests for removed modules
**Labels:** `cleanup`, `testing`, `tech-debt`

**Description:**
- `apps/discord-bot/tests/commands/walletcheck.test.ts` imports missing `../../src/commands/walletcheck.js`
- `modules/justthetip/tests/ltc-bridge.test.ts` imports missing `../src/ltc-bridge.js`

**Acceptance Criteria:**
- [ ] Remove stale tests
- [ ] OR rewrite to target current modules
- [ ] Verify test suite passes

**Reference:** `DEAD_CODE_TRIAGE.md` Section A.5

---

### Issue #34 — Remove stale identity-core helper
**Labels:** `cleanup`, `tech-debt`, `packages`

**Description:**
`packages/identity-core/src/signer.ts` is not imported anywhere in `packages/identity-core/src` or workspace.

**Acceptance Criteria:**
- [ ] Confirm no references exist
- [ ] Delete file (or keep if signing APIs planned soon)
- [ ] Verify build passes

**Reference:** `DEAD_CODE_TRIAGE.md` Section A.6

---

## 🚀 INFRASTRUCTURE & DEPLOYMENT

### Issue #35 — Set up `.github/` directory with issue templates and workflows
**Labels:** `infrastructure`, `github`, `ci-cd`

**Description:**
No `.github/` directory exists in the repo. Need:
- Bug report template (`ISSUE_TEMPLATE/bug_report.md`)
- Feature request template (`ISSUE_TEMPLATE/feature_request.md`)
- Pull request template (`PULL_REQUEST_TEMPLATE.md`)
- CI workflow (lint, test, build)
- Security audit workflow (`security-audit.yml`)
- Deploy workflow (`deploy-railway.yml`)

**Acceptance Criteria:**
- [ ] Create `.github/ISSUE_TEMPLATE/bug_report.md`
- [ ] Create `.github/ISSUE_TEMPLATE/feature_request.md`
- [ ] Create `.github/PULL_REQUEST_TEMPLATE.md`
- [ ] Create `.github/workflows/ci.yml`
- [ ] Create `.github/workflows/security-audit.yml`
- [ ] Create `.github/workflows/deploy-railway.yml`
- [ ] Verify templates render correctly in GitHub UI

**Reference:** `SECURITY_UPSTREAM_ISSUE_TEMPLATE.md`

---

### Issue #36 — Fix multi-layer caching (Service Worker + Browser + CDN)
**Labels:** `infrastructure`, `bug`, `web`, `deployment`

**Description:**
Deployed changes often not showing due to aggressive multi-layer caching (Service Worker + Browser + Cloudflare CDN). Documented in `DEPLOYED-NOT-SHOWING-FIX.md`.

**Acceptance Criteria:**
- [ ] Implement service worker cache-busting (versioned cache names)
- [ ] Add proper `Cache-Control` headers in nginx/Cloudflare:
  - Hashed assets: `public, immutable, max-age=31536000`
  - `index.html`: `no-cache, no-store, must-revalidate`
- [ ] Add build timestamp injection
- [ ] Document cache-clearing procedures for team

**Reference:** `DEPLOYED-NOT-SHOWING-FIX.md`

---

### Issue #37 — Verify Railway per-service `railway.json` configs
**Labels:** `infrastructure`, `deployment`, `railway`

**Description:**
Each of the 7+ services needs a `railway.json` specifying Dockerfile path, health check, and restart policy. Ensure all are correctly configured and deployed.

**Services:**
- API gateway (`apps/api`)
- Landing page (`apps/web`)
- Discord bot (`apps/discord-bot`)
- Trust rollup (`apps/trust-rollup`)
- Control room (`apps/control-room`)
- Game arena (`apps/game-arena`)
- User dashboard (`apps/user-dashboard`)

**Acceptance Criteria:**
- [ ] Verify each app has `railway.json`
- [ ] Verify Dockerfile path is correct
- [ ] Verify health check endpoint is configured
- [ ] Verify restart policy is set
- [ ] Test deploy for each service

**Reference:** `docs/DEPLOYMENT.md`

---

### Issue #38 — Add compliance-edge Cloudflare Worker deployment pipeline
**Labels:** `infrastructure`, `deployment`, `cloudflare`

**Description:**
The `compliance-edge` service is the only service not on Railway. It's a Cloudflare Worker that needs a dedicated deployment pipeline via Wrangler.

**Acceptance Criteria:**
- [ ] Create `wrangler.toml` for compliance-edge worker
- [ ] Add deploy workflow to `.github/workflows/`
- [ ] Add D1/KV binding configuration
- [ ] Document deployment procedure

**Reference:** `docs/DEPLOYMENT.md`

---

## 🔒 SECURITY

### Issue #39 — Implement automated dependency vulnerability tracking
**Labels:** `security`, `dependencies`, `automation`

**Description:**
Set up `npm audit` / `pnpm audit` automation. Use `SECURITY_UPSTREAM_ISSUE_TEMPLATE.md` for tracking GHSA advisories.

**Acceptance Criteria:**
- [ ] Configure `pnpm audit` in CI
- [ ] Set up scheduled security audit workflow (daily)
- [ ] Create tracking issues for each vulnerability using template
- [ ] Document process in `SECURITY.md`
- [ ] Configure Dependabot or Snyk

**Reference:** `SECURITY_UPSTREAM_ISSUE_TEMPLATE.md`

---

### Issue #40 — Audit and fix auth temporarily disabled in API
**Labels:** `security`, `api`, `auth`

**Description:**
`apps/api/src/routes/user.ts` contains:
```ts
// NOTE: Auth temporarily disabled for dogfooding ease (will re-enable once identity works)
```

This must be re-enabled before production.

**Acceptance Criteria:**
- [ ] Re-enable auth middleware on user routes
- [ ] Verify JWT validation works
- [ ] Test all protected routes
- [ ] Update `.env.template` with required auth vars
- [ ] Document auth flow

**Reference:** Code search result in `apps/api/src/routes/user.ts`

---

## 📊 SUMMARY

| Category | Count |
|---|---|
| 🐛 Critical Bugs | 5 |
| ⚠️ Medium Bugs | 6 |
| 🔧 Low Priority / Code Quality | 2 |
| ✨ Feature Requests | 15 |
| 🧹 Dead Code & Cleanup | 6 |
| 🚀 Infrastructure & Deployment | 4 |
| 🔒 Security | 2 |
| **TOTAL** | **40** |

---

*Generated from comprehensive audit of: `AUDIT-REPORT.md`, `TODO.md`, `DEAD_CODE_TRIAGE.md`, `SECURITY_UPSTREAM_ISSUE_TEMPLATE.md`, and codebase search.*

