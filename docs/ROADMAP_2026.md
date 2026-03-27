# TiltCheck 2026: Detailed Implementation Roadmap

This roadmap defines the technical path to a production-ready, audit-hardened TiltCheck ecosystem.

## Phase 01: High-Intensity Hardening (Immediate)

*Focus: Security, Secrets, and Fundamental Stability.*

- [ ] **Secret Rotation (24h Window):**
  - Rotate `JUSTTHETIP_BOT_WALLET_PRIVATE_KEY`.
  - Rotate Discord Bot Tokens and Supabase Service Role Keys.
  - Move all secrets to GCP Secret Manager (production) or `.env.enc` (encrypted).
- [ ] **Zealynx Audit Compliance (H-01, M-01):**
  - Implement `Program_Data` constraints on `initialize_vault` in the Solana program.
  - Add explicit `token_mint` and `vault_authority` checks in `ProcessWithdrawal`.
- [ ] **Resource Governance:**
  - Sync `docker-compose.yml` and `vps-docker-compose.yml` with unified memory/cpu limits.
  - Baseline: 512MB for UI/API, 256MB for Rollup, 1GB for Arena.

## Phase 02: Stabilization & Memory Optimization

*Focus: Fixing the "Annus Horribilis" operational bugs.*

- [ ] **Trust Rollup Pruning:**
  - Implement a 24h sliding window for `CASINO_WINDOWS`.
  - Add a `globalCleanup` cron job to evict stale metrics and reasons.
- [ ] **Health Check Parity:**
  - Define `/health` endpoints for all 13 microservices.
  - Implement `liveness` and `readiness` probes in the GCP Cloud Run manifest.
- [ ] **Audit Fix Batch A (Critical):**
  - **B1:** Replace PWA manifest with MV3 manifest in `apps/chrome-extension`.
  - **B3:** Fix `report.ts` auth token bug (replace `DISCORD_TOKEN` with `INTERNAL_API_SECRET`).
  - **B12:** Rectify `freespinscan` auto-approval logic (Suspicious -> Mod Queue).

## Phase 03: Feature Refinement & Compliance (RGaaS)

*Focus: Scaling the Degen Audit Layer and meeting 2026 regs.*

- [ ] **Audit Fix Batch B (Medium):**
  - **B6:** Implement real USDC scanning in `walletcheck`.
  - **B7/B8:** Re-enable SusLink auto-scan in Discord message events.
  - **B10:** Integrate Ollama/OpenAI for dynamic trivia question generation.
- [ ] **AML/IRS Tracking:**
  - Build the Form 1099-DA auto-logger for tipping and vault events.
  - Implement "Friction Logic" for FinCEN velocity monitoring.
- [ ] **TiltLive Social Streaming:**
  - Implement low-latency session broadcasting for squad-based auditing.
  - Add "Ask to Join" and "Request Audit" triggers for live streams.
- [ ] **The "Emergency Brake" V2:**
  - Finalize browser-side "forced vaulting" prompts during high-tilt detection with glassmorphism HUD.

## Phase 04: Verification & Stress Testing

*Focus: Provable fairness and system resilience.*

- [ ] **Provably Fair Attestation:**
  - Verify HMAC-SHA256 calculations on the site against live dealer seeds.
- [ ] **Simulated "Rage-Betting" Stress Test:**
  - Trigger 100+ concurrent "Tilt Events" to verify Discord "Squad Pings" and rate-limiting.
- [ ] **End-to-End User Flow Video:** Capturing flow for Discord Developer Portal approval.

## Phase 05: Industrial SCADA Integration

*Focus: Scaling the Degen Audit Layer to Industrial Automation.*

- [ ] **SCADA/PLC Connector:** Build the Ed25519-verified gateway for legacy control systems.
- [ ] **Edge Computing PdM:** Deploy frame prefiltering and drift detection at the local source (VAST Lab integration).
- [ ] **Deterministic Commits:** Enable real-time intervento-level commits to the SCADA loop based on "Tilt Probability."

## Phase 06: AI Red Flag Detection

*Focus: Scaling the AI Fairness Watchdog and SusLink context models.*

- [ ] **SusLink v2:** Deploy the look-alike domain evaluation model for phishing/scam detection.
- [ ] **Ollama Sentiment Pipeline:** Implement the "Emotional State" evaluator for rage-betting and predatory loan signals.
- [ ] **Fairness Watchdog (Poker):** Build the anomaly detection engine for improbable betting patterns and rigged reshuffles.
- [ ] **Trust Engine Bridge:** Integrate AI red-flag signals directly into the Casino/Degen Trust loop for automated interventions.

---

**Status:** Planning Approved / Ready for Execution
**Lead Agent:** Antigravity (2026 Security Core)
