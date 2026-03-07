# TiltCheck GitLab Development Map

This document translates the TiltCheck codebase `implementation_plan.md` and `15-future-roadmap.md` into actionable **Milestones**, **Epics**, and **Issues** that you can map directly into your GitLab repository.

---

## 🗺️ Milestone 1: Phase 1 — Core Launch (MVP) & RGaaS Pivot

**Epic: Core Infrastructure & Monitoring**
* **Issue:** Implement Retry Utility (`packages/retry-utility`)
  * Create `withRetry<T>` function with backoff logic.
  * Add unit tests: `packages/retry-utility/tests/index.test.ts`.
* **Issue:** Define API Response Types (`packages/api-response-types`)
  * Create robust interfaces for `ApiResponse` handling (success, data, error, metadata).
* **Issue:** Implement Sentry Integration (`packages/monitoring`)
  * Create `sentry.ts` with `initSentry`, `captureException`, `captureMessage`, `setUser`, `clearUser`.
* **Issue:** Implement Metrics Collection (`packages/monitoring`)
  * Create `metrics.ts` using `prom-client` (increment, gauge, timing, flush).
* **Issue:** Implement Logflare Integration (`packages/monitoring`)
  * Create `logflare.ts` to buffer and send logs to Logflare.

**Epic: Telegram & Event Router Integration**
* **Issue:** Connect Telegram Client to Event Router
  * Modify `services/telegram-code-ingest/src/telegram-client.ts` to remove TODOs and emit events.
* **Issue:** Implement Telegram Code Monitor
  * Modify `services/telegram-code-ingest/src/telegram-monitor.ts` to emit `code.detected` events via event-router.

**Epic: Core Modules Polish(JustTheTip, SusLink, Core Bot)**
* **Issue:** SusLink AI Integration
  * Update `modules/suslink/src/scanner.ts` to remove TODOs and enable full AI client integration for URL analysis.
* **Issue:** JustTheTip Auto-Processing
  * Update `modules/justthetip/src/tip-engine.ts` to remove TODOs and implement auto-processing for valid tips.
* **Issue:** Bot Mod Notifications
  * Update `bot/src/handlers/events.ts` to cleanly handle mod actions and dispatch mod notifications.
* **Issue:** Expose Initial RGaaS APIs
  * Finalize exposing SusLink, Trust, and Tilt as early developer APIs.

---

## 🗺️ Milestone 2: Phase 2 — Intelligence Expansion

**Epic: Prediction Engines & Advanced Scoring**
* **Issue:** FreeSpinScan Prediction Engine
  * Build models to categorize and predict free spin promo hit rates.
* **Issue:** CollectClock Bonus Cycle Prediction
  * Determine cyclical nature of reload/bonus drops and predict nerfs.
* **Issue:** Advanced Casino & Degen Trust Scoring
  * Refine the existing baseline trust engines into reactive real-time scoring.
* **Issue:** AI Fairness Watchdog (Beta)
  * Introduce modules to actively scan and flag statistically improbable casino outcomes.
* **Issue:** QualifyFirst Survey Router Integration
  * Implement logic to route high-trust users to pre-qualified surveys.
* **Issue:** Accountabilibuddy Integration
  * Add wallet monitoring and "phone-a-friend" panic-button intervention for users on tilt.

---

## 🗺️ Milestone 3: Phase 3 & 4 — TiltCheck Arena & Poker

**Epic: Web UI (TiltCheck Arena)**
* **Issue:** DA&D Game Arena Interface
  * Build the initial UI for DA&D games (Next.js/Astro/Svelte depending on dev choice).
* **Issue:** Visual Trust Dashboards
  * Build personal and casino trust score visualization dashboards on Web UI.
* **Issue:** NFT Identity Manager Web Portal
  * Launch front-end interface for holding trust/tilt NFTs and badges.

**Epic: Poker Module Launch**
* **Issue:** Discord-first Poker Lobby
  * Build SNG & Lobby matchmaking strictly in Discord logic.
* **Issue:** Poker Non-Custodial Buy-ins & Verification
  * Leverage existing JustTheTip/Wallet logic for poker buy-ins.
* **Issue:** Fairness Seed Engine Integration
  * Validate provably fair seeds specifically tailored to multiplayer poker hands.

---

## 🗺️ Milestone 4: Phase 5, 6, 7 — Expansion & Monetization

**Epic: Network Expansion**
* **Issue:** Cross-Community Trust Systems
  * Share Identity & Trust metadata across major Discord servers safely.
* **Issue:** Network-Wide Degen Leaderboards
  * Compile inter-server gameplay & tipping statuses.

**Epic: Monetization & Enterprise APIs**
* **Issue:** Premium Bot Multi-tier Release
  * Release Zero-fee tipping modes, DAO analytics, custom DA&D decks.
* **Issue:** Dedicated QualifyFirst Revenue Pipeline
  * Form partnerships to monetize high-trust surveys.
* **Issue:** Advanced RGaaS Developer Portals
  * Rollout full public API limits, dashboards, and SDKs for developer consumption.
