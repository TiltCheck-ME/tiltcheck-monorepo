# Demo Placeholder Inventory - TiltCheck Monorepo

This document tracks all demo/placeholder implementations that need to be replaced with live production code.

## 🎯 Summary

| Category | Total | Completed | Remaining |
|----------|-------|-----------|-----------|
| **Browser Extension** | 18 | 3 | 15 |
| **Backend API** | 12 | 2 | 10 |
| **Services** | 8 | 0 | 8 |
| **Database** | 5 | 0 | 5 |
| **Authentication** | 6 | 1 | 5 |
| **AI Integration** | 4 | 0 | 4 |
| **TOTAL** | **53** | **6** | **47** |

---

## 🔌 Browser Extension (`browser-extension/`)

### Authentication & User Management

| # | Feature | Current State | Production Needed | Priority | File |
|---|---------|---------------|-------------------|----------|------|
| 1 | **Discord OAuth** | Prompts for username, creates demo user | Real OAuth flow with Discord app, token exchange | 🔴 HIGH | `src/sidebar.ts` line 450 |
| 2 | **Guest Auth** | Creates `guest_TIMESTAMP` in memory | Store in database with session expiry | 🟡 MEDIUM | `src/sidebar.ts` line 435 |
| 3 | **Session Management** | LocalStorage token, no expiry | JWT tokens with refresh, secure storage | 🔴 HIGH | `src/sidebar.ts` line 420 |
| 4 | **User Profile** | Hardcoded demo data | Real user data from database | 🟡 MEDIUM | `src/sidebar.ts` line 580 |

### Vault & Finance

| # | Feature | Current State | Production Needed | Priority | File |
|---|---------|---------------|-------------------|----------|------|
| 5 | **Vault Balance** | In-memory Map, resets on restart | Supabase/PostgreSQL table | 🔴 HIGH | `server/api.js` line 45 |
| 6 | **Vault Deposit** | Simulated deposit, no blockchain | Real SOL deposit with Magic.link/Phantom | 🔴 HIGH | `src/sidebar.ts` line 520 |
| 7 | **Vault Withdraw** | Simulated withdrawal | Real blockchain transaction | 🔴 HIGH | `server/api.js` line 68 |
| 8 | **Vault Lock** | In-memory lock state | Database-backed lock with time check | 🟡 MEDIUM | `server/api.js` line 85 |
| 9 | **Transaction History** | Array in memory | Database table with pagination | 🟢 LOW | `server/api.js` line 92 |

### Dashboard & Metrics

| # | Feature | Current State | Production Needed | Priority | File |
|---|---------|---------------|-------------------|----------|------|
| 10 | **Tilt Score** | Static value `42` | Real-time trust-rollup integration | 🔴 HIGH | `src/sidebar.ts` line 150 |
| 11 | **P/L Graph** | Canvas with placeholder data | Real session data from database | 🟡 MEDIUM | `src/sidebar.ts` line 275 |
| 12 | **Activity Feed** | Hardcoded demo messages | Event Router feed integration | 🟡 MEDIUM | `src/sidebar.ts` line 310 |
| 13 | **Session Tracking** | In-memory session object | Database sessions with real-time updates | 🔴 HIGH | `server/api.js` line 120 |
| 14 | **Casino Detection** | Manual domain check | License API lookup via `linkguard` module | 🟡 MEDIUM | `src/content.ts` line 50 |

### Premium & Licensing

| # | Feature | Current State | Production Needed | Priority | File |
|---|---------|---------------|-------------------|----------|------|
| 15 | **Premium Plans** | Hardcoded JSON list | Database table with stripe integration | 🟡 MEDIUM | `server/api.js` line 140 |
| 16 | **Upgrade Flow** | Demo upgrade, no payment | Stripe payment + license key generation | 🔴 HIGH | `server/api.js` line 160 |
| 17 | **License Verification** | Hardcoded allowed domains | Real license API check | 🟡 MEDIUM | `src/content.ts` line 70 |

### AI & Settings

| # | Feature | Current State | Production Needed | Priority | File |
|---|---------|---------------|-------------------|----------|------|
| 18 | **API Key Storage** | LocalStorage plain text | Encrypted storage in database | 🔴 HIGH | `src/sidebar.ts` line 200 |

---

## 🖥️ Backend API (`browser-extension/server/api.js`)

### Data Persistence

| # | Feature | Current State | Production Needed | Priority | Line |
|---|---------|---------------|-------------------|----------|------|
| 19 | **User Storage** | `let users = new Map()` in memory | Supabase `users` table | 🔴 HIGH | 10 |
| 20 | **Vault Storage** | `let vaults = new Map()` in memory | Supabase `vaults` table | 🔴 HIGH | 11 |
| 21 | **Session Storage** | `let sessions = new Map()` in memory | Supabase `sessions` table | 🔴 HIGH | 12 |
| 22 | **Transaction Log** | In-memory array per vault | Supabase `vault_transactions` table | 🟡 MEDIUM | 92 |

### Authentication Endpoints

| # | Feature | Current State | Production Needed | Priority | Line |
|---|---------|---------------|-------------------|----------|------|
| 23 | **POST /api/auth/guest** | Creates demo guest user | Database insert with session | 🟡 MEDIUM | 25 |
| 24 | **POST /api/auth/discord** | Username prompt, fake token | Real OAuth code exchange | 🔴 HIGH | 35 |
| 25 | **Token Validation** | No validation, accepts any string | JWT verify with expiry check | 🔴 HIGH | N/A |
| 26 | **Refresh Tokens** | Not implemented | JWT refresh token rotation | 🟡 MEDIUM | N/A |

### External Integrations

| # | Feature | Current State | Production Needed | Priority | Line |
|---|---------|---------------|-------------------|----------|------|
| 27 | **Wallet Connection** | Returns demo wallet address | Magic.link or Phantom SDK integration | 🔴 HIGH | 105 |
| 28 | **Blockchain Transactions** | No implementation | Solana Web3.js for deposits/withdrawals | 🔴 HIGH | N/A |
| 29 | **Payment Processing** | Demo upgrade only | Stripe Checkout integration | 🟡 MEDIUM | 160 |
| 30 | **Email Notifications** | Not implemented | Resend.com integration via `email-service` package | 🟢 LOW | N/A |

---

## 🧩 Services (`services/`)

### Trust & Scoring

| # | Service | Current State | Production Needed | Priority | Path |
|---|---------|---------------|-------------------|----------|------|
| 31 | **trust-rollup** | File-based JSON (`data/trust-rollups.json`) | Real-time calculation + Redis cache | 🔴 HIGH | `services/trust-rollup/` |
| 32 | **trust-engines** | Static trust scores in JSON files | Live scoring algorithms with event processing | 🔴 HIGH | `services/trust-engines/` |
| 33 | **grading-engine** | Package exists, not integrated | Connect to extension via API | 🟡 MEDIUM | `packages/grading-engine/` |

### Data & Events

| # | Service | Current State | Production Needed | Priority | Path |
|---|---------|---------------|-------------------|----------|------|
| 34 | **event-router** | Local module, no pub/sub | Redis Pub/Sub or RabbitMQ | 🔴 HIGH | `services/event-router/` |
| 35 | **casino-data-api** | Serves static JSON files | Live scraping + database storage | 🟡 MEDIUM | `services/casino-data-api/` |
| 36 | **dashboard** | Not connected to extension | API integration + WebSocket for real-time | 🟡 MEDIUM | `services/dashboard/` |

### Modules

| # | Module | Current State | Production Needed | Priority | Path |
|---|--------|---------------|-------------------|----------|------|
| 37 | **linkguard** | Domain checking from JSON | License API integration | 🟡 MEDIUM | `modules/linkguard/` |
| 38 | **collectclock** | Not integrated | Fee collection service with Solana | 🟡 MEDIUM | `modules/collectclock/` |

---

## 💾 Database (`data/` files → Supabase)

### Schema Migration

| # | Data File | Current State | Production Needed | Priority | File |
|---|-----------|---------------|-------------------|----------|------|
| 39 | **casinos.json** | Static file, 50+ casinos | PostgreSQL `casinos` table with admin panel | 🟡 MEDIUM | `data/casinos.json` |
| 40 | **domain-trust-scores.json** | Static scores | Real-time calculated scores in database | 🔴 HIGH | `data/domain-trust-scores.json` |
| 41 | **justthetip-user-trust.json** | File-based tipping records | `tips` table with Discord user integration | 🟡 MEDIUM | `data/justthetip-user-trust.json` |
| 42 | **lockvault.json** | File-based vault data | Supabase `vaults` + `vault_transactions` | 🔴 HIGH | `data/lockvault.json` |
| 43 | **trust-rollups.json** | File-based aggregated scores | Redis cache + PostgreSQL backup | 🔴 HIGH | `data/trust-rollups.json` |

---

## 🔐 Authentication & Security

### OAuth & Sessions

| # | Feature | Current State | Production Needed | Priority |
|---|---------|---------------|-------------------|----------|
| 44 | **Discord App Setup** | No Discord app created | Create app, set redirect URIs, get credentials | 🔴 HIGH |
| 45 | **JWT Implementation** | No JWT, plain text tokens | `jsonwebtoken` package, RS256 signing | 🔴 HIGH |
| 46 | **Refresh Token Flow** | Not implemented | Rotate refresh tokens, store in DB | 🟡 MEDIUM |
| 47 | **API Key Encryption** | Plain text in LocalStorage | Encrypt with user-specific key, store server-side | 🔴 HIGH |
| 48 | **CORS Configuration** | Allow all origins | Whitelist extension ID + production domain | 🟡 MEDIUM |

---

## 🤖 AI Integration (`packages/ai-service/`)

### LLM Connections

| # | Feature | Current State | Production Needed | Priority |
|---|---------|---------------|-------------------|----------|
| 49 | **OpenAI Integration** | Config exists, not called | Connect to tilt detection, chat features | 🟡 MEDIUM |
| 50 | **Anthropic Integration** | Config exists, not called | Alternative LLM for analysis | 🟢 LOW |
| 51 | **Prompt Engineering** | No prompts defined | Create prompts for tilt detection, advice | 🟡 MEDIUM |
| 52 | **Context Management** | No conversation state | Store chat history in sessions | 🟢 LOW |

---

## 📱 Discord Bot Integration (`apps/discord-bot/`)

### Extension ↔ Bot Communication

| # | Feature | Current State | Production Needed | Priority |
|---|---------|---------------|-------------------|----------|
| 53 | **Shared User Identity** | Separate user systems | Link extension users to Discord IDs | 🔴 HIGH |

---

## 🗺️ Replacement Roadmap

### Phase 1: Critical Infrastructure (Week 1-2)
**Goal**: Production-ready backend with persistent storage

- [ ] #19-21: Replace in-memory storage with Supabase
- [ ] #5-7: Implement real vault deposits/withdrawals with Solana
- [ ] #23-25: Real Discord OAuth + JWT tokens
- [ ] #44-45: Set up Discord app + JWT signing
- [ ] #34: Event Router with Redis Pub/Sub

### Phase 2: Core Features (Week 3-4)
**Goal**: Live scoring and session tracking

- [ ] #10: Integrate trust-rollup for real tilt scores
- [ ] #13: Database-backed session tracking
- [ ] #31-32: Live trust scoring algorithms
- [ ] #11-12: Real-time P/L graph and activity feed
- [ ] #53: Link extension users to Discord IDs

### Phase 3: Premium & Payments (Week 5-6)
**Goal**: Monetization infrastructure

- [ ] #15-16: Stripe integration for premium upgrades
- [ ] #27-28: Wallet connection with Magic.link/Phantom
- [ ] #38: CollectClock fee collection
- [ ] #17: License verification system

### Phase 4: Polish & Security (Week 7-8)
**Goal**: Production hardening

- [ ] #18, #47: Encrypted API key storage
- [ ] #25-26: Refresh token rotation
- [ ] #48: CORS whitelist
- [ ] #30: Email notifications
- [ ] #49-51: AI integration for tilt detection

### Phase 5: Advanced Features (Week 9+)
**Goal**: Enhanced user experience

- [ ] #36: WebSocket for real-time dashboard updates
- [ ] #35: Live casino data scraping
- [ ] #39: Admin panel for casino management
- [ ] #50-52: Advanced AI chat features

---

## 📊 Progress Tracking

### How to Mark Complete

When replacing a placeholder:

1. Update this file: Change status from ❌ to ✅
2. Document in CHANGELOG.md
3. Add test coverage
4. Update relevant documentation

### Example Entry

```markdown
## 🔴 REPLACED: #5 - Vault Balance Storage

**Before**: `let vaults = new Map()` in `server/api.js`

**After**: Supabase `vaults` table with:
- User foreign key
- Balance column (DECIMAL)
- Lock state (BOOLEAN)
- Transactions relation

**Code**: `server/api.js` lines 45-100

**Test**: `curl http://localhost:3333/api/vault/test-user` returns DB data

**Date**: 2025-01-15
```

---

## 🎯 Quick Wins (Easy Replacements)

These can be done in < 1 hour each:

1. **#39**: Migrate `casinos.json` to Supabase table
2. **#22**: Add `vault_transactions` table
3. **#48**: Update CORS whitelist
4. **#23**: Update guest auth to use database
5. **#4**: Fetch real user profile from DB

---

## 🚨 Critical Blockers (Must Fix First)

These block other features:

1. **#19-21**: Database setup (blocks all storage)
2. **#44**: Discord app creation (blocks real OAuth)
3. **#34**: Event Router (blocks service communication)
4. **#45**: JWT implementation (blocks secure auth)

---

## 📝 Notes

- **File References**: Line numbers may shift as code changes
- **Priority Key**:
  - 🔴 HIGH: Blocks production deployment
  - 🟡 MEDIUM: Improves functionality
  - 🟢 LOW: Nice to have
- **Update Frequency**: Review this file weekly during development

---

**Last Updated**: 2025-01-15  
**Next Review**: After Phase 1 completion
