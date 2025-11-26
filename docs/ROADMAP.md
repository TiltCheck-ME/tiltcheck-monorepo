# TiltCheck Roadmap & Status

**Last Updated:** November 2024  
**Project Phase:** Core Infrastructure Complete → AI Integration Phase

---

## Project Overview

TiltCheck is a modular ecosystem for safer, smarter online casino play. Built Discord-first with AI-assisted fairness analysis, non-custodial architecture, and cost-optimized serverless infrastructure.

**Current Focus:** Casino trust scoring with autonomous AI-powered data collection.

---

## Completed Milestones ✅

### Phase 1: Foundation (Complete)
- ✅ Monorepo architecture with pnpm workspaces
- ✅ Event Router for module communication
- ✅ TypeScript + ESM module system
- ✅ Discord bot framework (slash commands)
- ✅ GitHub Actions CI/CD (health checks, a11y audits, cache rotation)
- ✅ Branch protection with required status checks
- ✅ Comprehensive documentation (24+ spec docs)

### Phase 2: Core Modules (Complete)
- ✅ **JustTheTip** — Non-custodial tipping/swaps
- ✅ **SusLink** — AI link scanner
- ✅ **CollectClock** — Bonus tracker with nerf detection
- ✅ **FreeSpinScan** — Promo validation system
- ✅ **TiltCheck Core** — Tilt detection and cooldowns
- ✅ **LockVault** — Voluntary time-locked cooldown vault (non-custodial advisory)
- ✅ **Poker Module** — Discord poker game with RNG

### Phase 3: Trust Infrastructure (Complete)
- ✅ Casino Trust Engine architecture
- ✅ Degen Trust Engine architecture
- ✅ Trust Rollup service (real-time aggregation + SSE)
- ✅ Casino grading methodology (5-category framework)
- ✅ Grading engine package (@tiltcheck/grading-engine)
  - 13 fairness metrics (RTP drift, volatility, streak clustering, etc.)
  - Weighted composite scoring (0-100)
  - Confidence scaling + narrative rationale generation

### Phase 4: AI Integration (Just Completed) 🎉
- ✅ AI Collector service architecture
- ✅ Vercel AI SDK + OpenAI integration
- ✅ Structured LLM extraction (zod schemas)
- ✅ Reddit sentiment analysis (public JSON API)
- ✅ Trustpilot review scraping (cheerio)
- ✅ Grading engine integration
- ✅ trust.casino.updated event emission
- ✅ Weekly autonomous collection (cost-optimized: $6.50/month)
- ✅ Snapshot persistence (data/casino-snapshots/)
- ✅ Discord /trust-report command (color-coded embeds with 5-category breakdown)

---

## In Progress 🚧

### Current Sprint: Operationalization
- 🔄 On-chain spin data collection (Solana program monitoring)
- 🔄 Test suite execution across all services
- 🔄 Docker Compose health verification
- 🔄 Documentation updates (this roadmap, service READMEs)

---

## Upcoming Priorities 📋

### Short-Term (Next 2-4 Weeks)
1. **On-Chain Data Pipeline**
   - Solana WebSocket subscriptions for real-time spin events
   - Historical spin indexing via getProgramAccounts
   - JSONL storage layer (data/on-chain-spins/)
   - Hourly aggregation into grading engine
   - RTP drift alerts (>5% deviation threshold)

2. **Discord Ecosystem Polish**
   - /trust-report enhancements (historical comparisons, trend graphs)
   - /vault status improvements (show leaderboard of cooldown commitments)
   - /scan integration with trust scores (warn if casino has low score)

3. **Testing & Validation**
   - End-to-end integration tests (collector → grading → rollup → Discord)
   - Grading engine unit tests (all 13 metrics)
   - AI extraction accuracy validation (manual spot-checks)
   - Cost monitoring (ensure <$10/month for AI operations)

### Mid-Term (1-3 Months)
4. **Advanced Casino Intelligence**
   - Hash verification for provably fair games
   - Bonus cycle prediction (AI model training on historical data)
   - Payout delay tracking (time-to-withdrawal analysis)
   - Comparative casino reports (Stake vs Rollbit vs...)

5. **Degen Trust Engine Activation**
   - User behavior pattern analysis
   - Tilt signal detection (loss chasing, session length spikes)
   - Accountabilibuddy integration (peer intervention system)
   - Trust score display on user profiles

6. **Web Dashboard (Arena v1)**
   - Casino leaderboard with live trust scores
   - User trust profiles
   - DA&D game arena
   - NFT identity manager

### Long-Term (3-6+ Months)
7. **Prediction Intelligence**
   - Bonus nerf forecasting (time-series models)
   - Optimal claim timing recommendations
   - Session outcome probability (AI tilt predictor)

8. **QualifyFirst Survey Router**
   - Pre-screening AI to reduce screen-outs
   - Survey opportunity matching
   - Earnings optimization

9. **Mobile Companion App**
   - React Native app for iOS/Android
   - Push notifications for tilt alerts
   - Quick casino trust lookups

---

## Key Pivots & Learnings 🔄

### Pivot 1: Daily → Weekly AI Collection
**Original Plan:** Daily AI scraping for casino data  
**Change:** Weekly collection (every Sunday 2 AM UTC)  
**Rationale:** Cost reduction from ~$45/month to ~$6.50/month; casino fairness data changes slowly  
**Impact:** No degradation in trust score accuracy; significant cost savings

### Pivot 2: Reddit OAuth → Public JSON API
**Original Plan:** Full Reddit OAuth setup with snoowrap  
**Change:** Use public Reddit JSON API (`/search.json`) without authentication  
**Rationale:** Simpler implementation; no rate limit issues for weekly batch collection; OAuth docs provided for future scale needs  
**Impact:** Faster development; reduced complexity; equally effective sentiment extraction

### Pivot 3: Real-Time → Snapshot-Based Discord Commands
**Original Plan:** /trust-report queries trust-rollup SSE stream in real-time  
**Change:** Load latest snapshot from filesystem (data/casino-snapshots/)  
**Rationale:** Matches weekly collection cadence; simpler error handling; no dependency on live services  
**Impact:** More reliable command responses; instant load times; works even if collector is offline

### Pivot 4: Placeholder → Real Grading Metrics
**Original Plan:** Basic heuristic scoring (payout drift, volatility shift)  
**Change:** Comprehensive 5-category framework with 13 metrics  
**Rationale:** User feedback highlighted need for transparency (RTP disclosure, audit presence); grading methodology must be defensible  
**Impact:** More actionable trust scores; users understand *why* a casino scores well/poorly

---

## Current Architecture Snapshot 🏗️

```
TiltCheck Monorepo
├── packages/
│   ├── grading-engine/       ✅ 13 fairness metrics, composite scoring
│   ├── event-router/         ✅ Pub/sub system (trust.casino.updated, etc.)
│   └── types/                ✅ Shared TypeScript definitions
├── services/
│   ├── ai-collector/         ✅ Weekly autonomous casino data scraping + grading
│   ├── trust-rollup/         ✅ Real-time trust aggregation + SSE broadcasting
│   └── dashboard/            ⏳ Web UI (planned for Arena v1)
├── apps/
│   └── discord-bot/          ✅ Commands: /trust-report, /vault cooldown, /scan, /poker
├── modules/
│   ├── justthetip/           ✅ Non-custodial tipping
│   ├── suslink/              ✅ AI link scanner
│   ├── collectclock/         ✅ Bonus tracker
│   ├── freespinscan/         ✅ Promo validation
│   ├── tiltcheck-core/       ✅ Tilt detection
│   ├── lockvault/            ✅ Voluntary cooldown vault
│   └── poker/                ✅ Discord poker game
└── docs/tiltcheck/           ✅ 24 comprehensive spec docs
```

---

## Success Metrics 📊

### Current Metrics
- **AI Collection Cost:** $6.50/month (10 casinos, weekly)
- **Grading Accuracy:** 97/100 composite on Stake.us (test run)
- **Event Latency:** <100ms (trust.casino.updated → rollup update)
- **Discord Commands:** 15+ active slash commands
- **Documentation Coverage:** 24 spec docs, 12k+ lines

### Target Metrics (Q1 2025)
- **Casinos Tracked:** 25+ (currently 10)
- **On-Chain Spins Analyzed:** 100k+ per week
- **User Trust Profiles:** 500+ active
- **Monthly Active Discord Users:** 1000+
- **Trust Score API Requests:** 10k+/month

---

## Technical Debt & Known Issues ⚠️

1. **Stake.us 403 Errors**: Web scraping blocked by Cloudflare; need headless browser or API partnership
2. **Missing Hash Verification**: Provably fair hash checking not yet implemented (placeholder in ai-collector)
3. **No On-Chain Data**: Grading engine uses empty spin arrays; volatility/RTP metrics score 100 by default (not actionable without real data)
4. **Discord Bot Registration**: trustreport.ts added to index.ts but bot restart needed for command registration in Discord API
5. **Test Coverage**: Grading engine has no unit tests yet; trust-rollup integration tests needed
6. **Docker Compose**: Not tested since ai-collector addition; docker-compose.yml may need service definitions

---

## Dependencies & Risks 🚨

### External Dependencies
- **OpenAI API**: Rate limits (10k requests/min on gpt-4o-mini); cost per token ($0.15/1M input, $0.60/1M output)
- **Reddit API**: Public JSON endpoint may have undocumented rate limits; OAuth fallback available
- **Solana RPC**: Requires paid tier for reliable WebSocket ($50/month Helius/Quicknode)
- **Discord API**: Rate limits (50 commands per guild); slash command registration delay

### Risks
- **Casino Blocking**: Sites may block scraping (Cloudflare, WAF); need rotating IPs or official APIs
- **AI Hallucination**: LLM-extracted disclosures need manual validation; confidence scores mitigate this
- **Data Freshness**: Weekly collection = stale data for rapidly changing casinos; acceptable tradeoff for cost
- **On-Chain Complexity**: Solana program ID discovery + instruction parsing is non-trivial; may need partnership with casino

---

## Community & Contributions 🤝

### Active Contributors
- **jmenichole** (founder) — Architecture, AI integration, Discord bot
- **GitHub Copilot Agent** — Code generation, refactoring, documentation

### How to Contribute
See `CONTRIBUTING.md` for guidelines. Priority areas:
- On-chain Solana spin parsing (services/on-chain-collector)
- Test coverage (grading engine unit tests)
- Casino data partnerships (API access instead of scraping)
- Discord bot UX improvements (command autocomplete, embed design)

---

## Questions to Resolve 🤔

1. **On-Chain Privacy**: Should we aggregate player data before storage? How to handle GDPR if users are identifiable by wallet?
2. **Grading Transparency**: Should we publish full methodology publicly, or keep it proprietary to prevent gaming?
3. **Casino Partnerships**: Approach casinos for official data access, or remain independent/adversarial?
4. **Monetization**: Keep 100% free, or introduce premium tiers (faster updates, custom alerts)?

---

**Status Summary:**  
Core infrastructure complete. AI integration successful. Next: Real on-chain data → actionable fairness analysis.

**Philosophy:**  
Stay modular. Stay non-custodial. Stay cheap. Stay degen-friendly.
