# TiltCheck Monorepo — Code Audit Report

> **Generated:** 2026-02-25 | **Scope:** Source code audit across apps/, modules/, packages/

---

## 🐛 BUGS TO FIX (Code-Verified)

### 🔴 Critical / High Priority

#### B1 — Chrome Extension: `manifest.json` is a PWA manifest, not a MV3 extension manifest

- **File:** `apps/chrome-extension/src/manifest.json`
- **Issue:** The file is a **Progressive Web App manifest** (has `start_url`, `display: standalone`, `orientation`). It is missing all required Chrome Extension MV3 fields: `manifest_version: 3`, `permissions`, `background.service_worker`, `content_scripts`, and `action`. The extension **will not load in Chrome as-is.**
- **Fix:** Replace with a proper MV3 manifest that declares `content_scripts: [content.js]`, `action` (popup), and required permissions (`storage`, `tabs`, `activeTab`).

#### B2 — Chrome Extension: `popup.html` references a non-existent `configBtn` / `configPanel`

- **File:** `apps/chrome-extension/src/popup.ts` (lines 66–68) vs `popup.html`
- **Issue:** `popup.ts` queries DOM elements `configBtn`, `configPanel`, `cfgCancel`, `cfgSave`, `cfgDomain`, `cfgBet`, `cfgResult` — **none of these exist in `popup.html`**. Every related event listener (`openConfigurator`, `saveConfiguration`, etc.) silently no-ops because the elements are null.
- **Fix:** Add the configurator panel/fields to `popup.html`, or remove the dead configurator code from `popup.ts`.

#### B3 — `report.ts` uses `DISCORD_TOKEN` as a server-to-server bearer token

- **File:** `apps/discord-bot/src/commands/report.ts` (line 57)
- **Issue:** `Authorization: Bearer ${process.env.DISCORD_TOKEN}` — the Discord bot token is **not** an API auth token and will be rejected by the backend. This means the `/report` command never actually persists anything.
- **Fix:** Use a dedicated `INTERNAL_API_SECRET` env var shared between the bot and API.

#### B4 — `handleAirdropClaim` is monkey-patched onto `tip` command with `as any`

- **File:** `apps/discord-bot/src/commands/tip.ts` (line 1472) / `events.ts` (line 166)
- **Issue:** `(tip as any).handleAirdropClaim = handleAirdropClaim;` and later `(tipCommand as any).handleAirdropClaim(...)`. This is a brittle workaround — no type safety, will silently fail if the property isn't set (e.g., if command load order changes).
- **Fix:** Create a shared button-handler registry (e.g., a `Map<string, ButtonHandler>`) and register airdrop claim there.

#### B5 — SusLink `followRedirects` passes an invalid `timeout` option to `fetch`

- **File:** `modules/suslink/src/scanner.ts` (line 247)
- **Issue:** `fetch(url, { ..., timeout: 5000, ... })` — the `timeout` property is **not a valid Fetch API option** in Node.js. It will be silently ignored, meaning redirect following never actually times out. Uses `as any` to suppress the TypeScript error.
- **Fix:** Use `AbortController` + `AbortSignal.timeout(5000)` as already done correctly in `modules/stake/src/client.ts`.

#### B6 — `walletcheck` module only scans ETH, but bot description says "EVM" without USDC support

- **File:** `modules/walletcheck/src/index.ts` (line 90)
- **Issue:** `usdcBalance: '0', // Placeholder` — USDC balance is hardcoded to `'0'`. Token approval scanning is also commented out as a future TODO. The threat detection only checks ETH balance vs tx count; no real heuristic for sweeper bots, approvals, EIP-7702.
- **Fix:** Integrate `ethers` token balance calls and/or Moralis/Alchemy API for token approvals.

### 🟡 Medium Priority

#### B7 — `@tiltcheck/suslink` is commented out in `discord-bot/index.ts` and `events.ts`

- **Files:** `apps/discord-bot/src/index.ts` (line 35), `events.ts` (line 17)
- **Issue:** `// import '@tiltcheck/suslink';` — the SusLink module is never initialized in the bot, so the auto-scan block in `events.ts` (lines 141-145) is dead code and the EventRouter never receives `link.scanned` events from SusLink.
- **Fix:** Uncomment the import and wire up the auto-scan config flag.

#### B8 — `events.ts` SusLink auto-scan block is hard-commented out

- **File:** `apps/discord-bot/src/handlers/events.ts` (lines 141–145)
- **Issue:** The entire `config.suslinkAutoScan` auto-scan block is inside a `/* ... */` comment block with only a stale comment inside. Link scanning in Discord messages is completely non-functional.
- **Fix:** Implement the block using the `LinkScanner` from `@tiltcheck/suslink`.

#### B9 — Trust alerts and trust adapter disabled in `index.ts`

- **File:** `apps/discord-bot/src/index.ts` (lines 79–81, 118–126)
- **Issue:** Both `TrustAlertsHandler.initialize()` and `startTrustAdapter()` are commented out with log messages saying "disabled". The trust event pipeline from EventRouter → Discord is completely silent.
- **Fix:** Re-enable once the trust engine event signatures are stable.

#### B10 — `triviadrops/ai-questions.js` — AI question generation is a static bank with `isAIAvailable()` hardcoded to `false`

- **File:** `modules/triviadrops/ai-questions.js` (lines 18, 180–181)
- **Issue:** The `generateAIQuestion()` function ignores the AI path entirely. The `isAIAvailable()` function always returns `false`. Questions are pulled from a static bank of ~16 hardcoded questions with no difficulty/category diversity.
- **Fix:** Wire up OpenAI/Vercel AI SDK, or expand the static bank significantly.

#### B11 — `modules/stake/src/client.ts` — All three core methods are placeholder implementations

- **File:** `modules/stake/src/client.ts` (lines 50, 82, 116)
- **Issue:** `checkEligibility()`, `claimCode()`, and `getWagerRequirement()` all show `// Placeholder implementation`. Real API calls are commented out. Production use requires `STAKE_MOCK_API !== 'true'` which hits an unverified real endpoint.  
- **Fix:** Verify Stake API contract and implement real calls, or document this as a community-integration partner requirement.
- **Status: RESOLVED** — Misleading "Placeholder implementation" comments and stale commented-out duplicate call lines removed. Real API call paths were already present; file header updated to document the mock vs. production switch.

#### B12 — `freespinscan` auto-approves "suspicious" promos without mod review

- **File:** `modules/freespinscan/src/index.ts` (line 148–151)
- **Issue:** `// Placeholder: auto-approve safe promos` — the code auto-fires `promo.approved` for any `suslinkScore === 'suspicious'` submission, bypassing the mod approval queue. "Suspicious" should go to review, not auto-approval.
- **Fix:** Only auto-approve `'safe'` scored promos; route `'suspicious'` to mod queue.
- **Status: RESOLVED** — Fixed in PR #394.

#### B13 — `qualifyfirst/engine.ts` event publisher is an optional stub never attached in production

- **File:** `modules/qualifyfirst/src/engine.ts` (lines 222–236)
- **Issue:** `publisher?.publish(...)` will silently do nothing if `attachPublisher()` is never called. No code in the bot or API ever calls `attachPublisher()`, so `survey.route.generated` and `survey.match.predicted` events are never emitted.
- **Fix:** Call `attachPublisher(eventRouter)` during initialization.
- **Status: N/A** — `modules/qualifyfirst` no longer exists in the monorepo.

### 🟢 Low Priority / Code Quality

#### B14 — Multiple `as any` casts in bot service files masking type errors

- **Files:** `tilt-agent.ts` (×4), `tilt-events-handler.ts` (×4), `events.ts` (×1), `support.ts`, `lockvault.ts`, etc.
- **Issue:** Over a dozen `as any` casts used to suppress TypeScript errors. Some are benign (Elasticsearch SDK response shapes), others hide real type mismatches.
- **Fix:** Define proper interfaces for ES|QL responses and Discord channel types.
- **Status: RESOLVED** — Defined `EsqlQueryResult` and `DiaApiResponse` interfaces in `tilt-agent.ts`; added `StoreTiltEventResponse`, `TiltHistoryResponse`, `TiltEvent`, and `TiltStatsResponse` interfaces in `tilt-events-handler.ts` with proper handler signature `TiltCheckEvent<'tilt.detected'>`; replaced `interaction as any` with `ChatInputCommandInteraction`/`ButtonInteraction` in `events.ts`; replaced `(channel as any).send()` with `TextChannel` type guard; replaced `event.data as any` with typed `SafetyInterventionTriggeredEventData` fields.

#### B15 — `database/tests/database.test.ts` — "placeholder methods" test

- **File:** `packages/database/tests/database.test.ts` (line 12)
- **Issue:** The only database test literally says `'can be constructed and has placeholder methods'`. No SQL queries, no connection tests, no CRUD tests.
- **Fix:** Add real integration/unit tests with mocked DB connections.
- **Status: RESOLVED** — Replaced with 5 meaningful tests: constructor produces disconnected client, all public methods are present, `connect()` resolves cleanly when no credentials are set, `query()` returns null (deprecated compat path), and `healthCheck()` returns the correct shape when no credentials are configured.

---

## ✅ MVP FEATURES — STATUS BY COMPONENT

### Discord Bot (`@tiltcheck/discord-bot`)

| Feature | Status | Notes |
|---|---|---|
| `/ping` | ✅ Done | Works |
| `/tip send` | ✅ Done | SOL transfers functional |
| `/tip airdrop` | ✅ Done | Multi-recipient, claim buttons work |
| `/tip trivia` | ✅ Done | Static question bank only |
| `/tip lockvault` | ✅ Done | Time-locked vault |
| `/trust casino` | ✅ Done | Pulls from DB |
| `/casino` | ✅ Done | Requires casino DB records |
| `/suslink` / `/scan` | ⚠️ Partial | Commands exist; SusLink module not wired into auto-scan |
| `/onboarding` | ✅ Done | Magic Wallet option disabled (stubbed) |
| `/walletcheck` | ⚠️ Partial | ETH only, USDC placeholder |
| `/report` | 🔴 Broken | Bearer token auth bug (B3) |
| Trust alerts → Discord | 🔴 Disabled | Commented out (B9) |
| Auto-link scan on messages | 🔴 Disabled | Commented out (B7/B8) |
| AI-driven tilt agent | ⚠️ Partial | Works only if Elasticsearch configured |
| Mod notifications | ✅ Done | Rate-limited, deduped |

### Chrome Extension (`@tiltcheck/chrome-extension`)

| Feature | Status | Notes |
|---|---|---|
| Build pipeline | ✅ Done | esbuild, produces `dist/` |
| Tilt detection | ✅ Done | `TiltDetector` class fully implemented |
| License verification | ✅ Done | Heuristic-based |
| Sidebar UI | ✅ Done | Extensive functionality |
| Popup UI | ⚠️ Partial | Configurator panel DOM elements missing (B2) |
| Extension manifest (MV3) | 🔴 Broken | Is a PWA manifest, not Chrome extension (B1) |
| AI Gateway integration | ⚠️ Partial | Calls `ai-gateway.tiltcheck.me` (may be offline) |
| Buddy system / phone-a-friend | ⚠️ Stub | `notifyBuddy()` called but not implemented |
| Vault interface | ⚠️ Stub | Opens `tiltcheck.me/vault` tab (page may not exist) |
| AutoVault | ❌ Not built | Listed in future feature list at top of `content.ts` |
| Supabase/backend sync | ❌ Not built | Listed in future feature list |

### API (`@tiltcheck/api`)

| Feature | Status | Notes |
|---|---|---|
| Health check | ✅ Done | `/health` |
| Auth (Discord OAuth via Supabase) | ✅ Done | `/auth` routes |
| Tip CRUD (`/tip`) | ✅ Done | Verify, create, complete, get |
| Stripe billing (`/stripe`) | ✅ Done | Webhook + billing routes |
| RGaaS routes | ✅ Done | Tilt/trust/link scan APIs |
| Mod routes (`/mod`) | ⚠️ Partial | Only receives reports; no sync back to bot |
| Safety routes | ✅ Done |  |
| Affiliate routes | ✅ Done |  |
| Newsletter routes | ✅ Done |  |

### Modules

| Module | Status | Notes |
|---|---|---|
| `suslink` | ✅ Done | Heuristic + AI-enhanced scan, feedback loop |
| `justthetip` | ✅ Done | Tip engine, pending tips with disk persistence |
| `collectclock` | ✅ Done | Bonus tracking, collectclock handler active |
| `freespinscan` | ⚠️ Partial | Auto-approves "suspicious" promos (B12) |
| `qualifyfirst` | ⚠️ Partial | Engine works, publisher never attached (B13) |
| `triviadrops` | ⚠️ Partial | Static question bank, AI generation stubbed (B10) |
| `stake` | ⚠️ Partial | All 3 core methods are placeholder (B11) |
| `walletcheck` | ⚠️ Partial | ETH only, USDC placeholder (B6) |
| `tiltcheck-core` | ✅ Done | Tilt detection, cooldown, violations |
| `lockvault` | ✅ Done | Time-locked vaults via bot |
| `dad` (DA&D) | ❓ Unknown | Directory exists, not audited |
| `poker` | ⚠️ Partial | Command exists, game state in-memory only |

---

## 📋 INCOMPLETE TASKS (Code-Verified)

### High Priority

- [ ] **Fix Chrome Extension MV3 manifest** (B1 — extension is unbuildable/unloadable as Chrome MV3)
- [ ] **Fix `report.ts` auth token bug** (B3 — reports are never persisted)
- [ ] **Add missing popup.html configurator DOM elements** (B2 — configurator is dead code)
- [ ] **Wire SusLink auto-scan** — uncomment import + implement the scan block in `events.ts`
- [ ] **Re-enable Trust Alerts pipeline** — uncomment `TrustAlertsHandler.initialize()` in `index.ts`
- [ ] **Fix freespinscan auto-approval** logic (B12 — suspicious → mod queue, not auto-approve)
- [ ] **Attach QualifyFirst event publisher** at bot init (B13)

### Medium Priority

- [ ] **Magic Wallet integration** — currently disabled in onboarding with `setDisabled(true)` on the button
- [ ] **Replace `as any` fetch timeout in `suslink/scanner.ts`** with `AbortController` (B5)
- [ ] **Implement real USDC balance scanning** in `walletcheck` (B6)
- [ ] **Expand TriviaDrops question bank** or integrate OpenAI (B10)
- [ ] **Implement real Stake API calls** or formally remove/stub the module (B11)
- [ ] **Attach `@tiltcheck/walletcheck`-style real token approval scanning**
- [ ] **Implement `Accountabilibuddy` buddy system** — `notifyBuddy()` in the sidebar is called but the buddy endpoint is not implemented
- [ ] **NFT-based Degen ID** — referenced in onboarding "coming soon" text

### Low Priority

- [ ] **Write real database tests** (B15 — currently a placeholder assertion)
- [ ] **Fix `as any` monkey-patch for airdrop claim** handler (B4)
- [ ] **Cloudflare Workers geo-compliance edge worker** — planned, not started
- [ ] **Cloudflare nonce generation** — planned, not started
- [ ] **AI onboarding interview** — listed in `tiltcheck-features.agent.md`, not implemented

---

## 🚀 STEPS TO DEPLOY

### Prerequisites Checklist

```bash
# Required env vars (minimum viable):
DISCORD_TOKEN=
DISCORD_CLIENT_ID=
DISCORD_GUILD_ID=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
JWT_SECRET=
SOLANA_RPC_URL=
JUSTTHETIP_FEE_WALLET=
BACKEND_URL=https://api.tiltcheck.me  # or http://localhost:3001 for local
```

### Option A: Local Dev (recommended first step)

```bash
# 1. Install deps
pnpm install

# 2. Copy env template and fill in required values
cp .env.template .env.local

# 3. Build all packages (order matters — dependencies first)
pnpm --filter @tiltcheck/types build
pnpm --filter @tiltcheck/event-router build
pnpm --filter @tiltcheck/db build
pnpm --filter @tiltcheck/auth build

# 4. Start API
pnpm --filter @tiltcheck/api dev   # → http://localhost:3001

# 5. Start Discord bot (new terminal)
pnpm --filter @tiltcheck/discord-bot dev

# 6. Build Chrome Extension
cd apps/chrome-extension
node build.js
# Load dist/ folder as unpacked extension in chrome://extensions/
```

### Option B: VPS Deployment (Docker Compose)

```bash
# On your VPS (85.209.95.175):
git clone <repo> /home/jme/tiltcheck-monorepo
cd /home/jme/tiltcheck-monorepo

# Set environment variables
cp .env .env.production
# Edit .env.production with production values

# Deploy all services
docker-compose up -d --build

# Services started:
# - discord-bot     → port 8081 (health)
# - api             → port 3001
# Configure Virtualmin reverse proxy:
#   tiltcheck.me/api → localhost:3001
```

### Option C: Vercel (Frontend Only)

1. Import GitHub repo in Vercel dashboard
2. Set Root Directory → `apps/web` (static site)
3. Set Root Directory → `apps/dashboard` (Next.js) — separate deployment
4. Add env vars in Vercel project settings

### Post-Deployment Verification

```bash
# Bot health
curl http://localhost:8081/health

# API health
curl http://localhost:3001/health

# Register Discord slash commands
pnpm --filter @tiltcheck/discord-bot deploy-commands

# Test in Discord:
# /ping
# /trust casino stake.com
# /scan https://example.com
# /tip balance
```

---

## 📊 SUMMARY COUNTS

| Category | Count |
|---|---|
| Critical bugs | 4 |
| Medium bugs | 8 |
| Low priority code quality | 3 |
| Fully working features | ~60% |
| Partially working features | ~30% |
| Completely missing features | ~10% |
