# TiltCheck "Edge-First" Dev Milestone Plan

This 4-week schedule outlines the execution of the Cloudflare pivot, transforming the Discord Activity into a globally distributed, real-time trust engine.

## Week 1: Identity & Edge Storage 🪪
- **Goal:** Establish secure user identity and the first telemetry data pipe.
- **Milestones:**
    - [ ] **Handshake v2:** Discord SDK → Hub Worker (Cloudflare D1) → TiltCheck ID mapping.
    - [ ] **Telemetry v1:** Chrome Extension → Hub Worker (Cloudflare KV) → Activity UI.
    - [ ] **Infrastructure:** Deploy production Hub Worker via Wrangler (GitHub Actions).

## Week 2: Real-time Telemetry (Durable Objects) 🧠
- **Goal:** Move the math from the frontend to the "Digital Twin" on the edge.
- **Milestones:**
    - [ ] **initialize DO:** Create a Durable Object per active gambling session.
    - [ ] **Edge Math:** DO calculates 24/7 RTP Parity and Drift in real-time.
    - [ ] **Push Alerts:** Trigger "Tilt Alerts" from DO → Discord Voice Channel.

## Week 3: Proofs & Regional Compliance (R2 & Geo) 📂
- **Goal:** Decentralize data storage and enforce jurisdictional rules.
- **Milestones:**
    - [ ] **R2 Session Recording:** Pipe every round into Cloudflare R2 for immutable "receipts."
    - [ ] **Geo-Guard:** Edge Worker detects jurisdiction and serves compliance banners.
    - [ ] **Proof Sharing:** Generate shareable "Proof of Fair Play" links (Discord Embeds).

## Week 4: Hardening & Stake Beta Launch 🚀
- **Goal:** Final polish and first real-world integration.
- **Milestones:**
    - [ ] **UI Refinement:** Finalize the "Minimalist HUD" vs. "Glowing Hero" selection.
    - [ ] **Stake Integration:** Content scripts for Stake.com round capture (Plinko/Dice/Originals).
    - [ ] **Public Beta:** Open access to select voice channels for the "Beta Pilot."

---

### **Success Metrics (Beta Week 4):**
- **Latency:** < 100ms for RTP updates in the Activity.
- **Trust:** 100% hash parity with casino claims.
- **Compliance:** Regional warnings served to 100% of regulated users.
