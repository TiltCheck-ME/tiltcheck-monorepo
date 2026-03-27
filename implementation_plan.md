# Implementation Plan - Week 1: Identity & Edge Storage

This phase focuses on the "Degen Handshake" and the initial edge-first telemetry pipe using Cloudflare D1 and KV.

## User Review Required

> [!IMPORTANT]
> **Edge Storage Migration:** We are moving from a mock relay to **Cloudflare D1 (SQL)** for user identity and **Cloudflare KV (NoSQL)** for high-frequency telemetry. This provides < 50ms latency for global trust updates.

---

## Proposed Changes

### [Activity] 🎮
The Dashboard for live telemetry.

#### [MODIFY] [main.ts](file:///c:/Users/jmeni/tiltcheck-monorepo/apps/activity/main.ts)
- Implement **Degen Handshake v2**:
    1. `discordSdk.commands.authorize()` (Client)
    2. `POST https://hub.tiltcheck.me/auth/Handshake` (API Exchange)
    3. Hub Worker writes Discord ID mapping to **Cloudflare D1**.
- Implement **Telemetry v1 Polling**:
    - `GET https://hub.tiltcheck.me/session/{userId}` (Polls Cloudflare KV).
- Restore the **Minimalist HUD v2** (Status Strip) for a cleaner, tool-first look.

---

### [Chrome Extension] 🔌
The Sensor capturing gameplay.

#### [MODIFY] [background.js](file:///c:/Users/jmeni/tiltcheck-monorepo/apps/chrome-extension/background.js)
- Update round capture to point to the new Edge Hub:
    - `POST https://hub.tiltcheck.me/telemetry/round` (Writes bet/win outcome to KV).

---

### [Hub Worker] 🧠
The Edge-first Relay.

#### [MODIFY] [index.ts](file:///c:/Users/jmeni/tiltcheck-monorepo/apps/hub/src/index.ts)
- [NEW] Add `/auth/Handshake` endpoint with D1 binding.
- [NEW] Add `/telemetry/round` endpoint with KV binding.
- [NEW] Add `GET /session/{userId}` endpoint for high-speed KV lookups.

---

## Verification Plan

### Automated Tests
- `wrangler dev` local simulation of D1/KV bindings.

### Manual Verification
1. **Degen Handshake:** Run Activity → Verify Discord ID appears in D1 local table.
2. **KV Relay:** Simulat bet outcome → Verify RTP dashboard updates in < 100ms.
