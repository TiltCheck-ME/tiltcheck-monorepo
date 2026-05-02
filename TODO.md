<!-- Copyright 2024-2026 TiltCheck | v1.1.0 | Last Edited: 2026-04-29 -->

# TiltCheck TODO & Incomplete Work List

This list tracks any feature, plan, or concept that is **incomplete**, **not fully built**, **not planned**, or **not well thought out**.
*As per ecosystem guidelines, ALL team members/agents MUST append items here when encountering incomplete functionality.*

## Priority: "Redeem-to-Win" Core Feature
- [ ] **Finish Redeem-to-Win polish across extension + dashboard:**
  - [x] Track balance and redeem opportunities in the extension.
  - [x] Store per-site redeem thresholds for supported casinos.
  - [x] Trigger redeem nudge UI when the threshold is crossed.
  - [x] Relay secured-win actions to Hub telemetry.
  - [ ] Detect and confirm real redeem or cash-out completion on more supported sites instead of relying mainly on the secure-win relay.
  - [ ] Surface secured-win and redeem-window metrics more prominently in the dashboard UI, not just in the backing session summaries and stats payloads.
  - [ ] Tighten end-to-end tests for redeem telemetry between extension, Hub, and dashboard.

## Proposed Future Features (From 2026-03-12 & 2026-03-13 Sessions)

- [ ] **Implement Safe vs. Degen Mode fully:**
  - [x] Store core onboarding risk preference primitives.
  - [ ] Add an interactive onboarding tutorial or quiz that explicitly selects communication style.
  - [ ] Persist a clear Safe vs. Degen preference contract across surfaces.
  - [ ] Adapt bot and product messaging off that preference instead of using a mostly static tone.

- [ ] **BonusCheck 2.0 (Formula Reverse-Engineering):**
  - Allow users to input their weekly wager, P/L, and collected bonuses.
  - After receiving the actual bonus, use this data to reverse-engineer the casino's bonus calculation formula.
  - Use the derived formula to predict future bonuses and flag if the actual amount is "light," proving a change in the casino's formula.

- [ ] **Tilt-Nudge to Voice Chat:**
  - [x] Extension and API buddy or intervention plumbing exist.
  - [ ] Send a first-class tilt event from the extension or API into the Discord delivery path specifically for voice accountability.
  - [ ] Trigger a Discord DM or equivalent routed intervention that points the user into the right accountability lane.
  - [ ] Define the cooldown or voice-join UX so the alert is actionable instead of just informational.

## High-Level Features (Pending Definition/Implementation)

- [x] **Cloudflare Workers Use Cases:**
  - [x] Geo-Compliance edge worker to block restricted jurisdictions.
  - [x] Edge high-speed nonce generation.
  - [x] Image Optimization resizing.
  - [x] Event Router webhooks.
- [x] **Onboarding & Personalization:** AI-driven onboarding interview + tutorials.
- [x] **Safety & Accountability:** "Phone a Friend" buddy system, Zero Balance tasks.

## Current Debt Priorities

- [ ] **Backlog hygiene:**
  - [ ] Keep `TODO.md` and `GEMINI.md` aligned with current implementation so completed work is not tracked as untouched.
- [ ] **API debt reduction:**
  - [ ] Continue replacing `any` in `apps/api`.
  - [ ] Finish normalizing route and middleware errors around `@tiltcheck/error-factory`.
- [ ] **Chrome Extension debt reduction:**
  - [ ] Continue replacing `any` in `apps/chrome-extension`, especially DOM and intervention helpers.
- [ ] **Documentation debt:**
  - [ ] Generate API documentation from Zod schemas and TypeScript interfaces.

## Bug Fixes TODO List

- [x] **Chrome Extension Build:** Resolved Node.js polyfill errors for browser environment.

## Priority 1: index.ts (Cloudflare Worker) - Bug Fixes

- [x] 1.1 Add proper TypeScript interfaces for Solana RPC response (replace `any`)
- [x] 1.2 Add null check for blockhash before returning

## Priority 2: content.ts (Chrome Extension) - Bug Fixes

- [x] 2.1 Replace `Math.random()` with cryptographically secure random (line ~340)
- [x] 2.2 Fix non-null assertion `sessionId!` - add proper null check (line ~351)
- [x] 2.3 Fix stats calculation logic for totalWins (lines ~358-365)
- [x] 2.4 Replace `any` types with proper types where possible

## Status: Completed
