<!-- Copyright 2024-2026 TiltCheck | v1.1.0 | Last Edited: 2026-02-26 -->

# TiltCheck TODO & Incomplete Work List

This list tracks any feature, plan, or concept that is **incomplete**, **not fully built**, **not planned**, or **not well thought out**.
*As per ecosystem guidelines, ALL team members/agents MUST append items here when encountering incomplete functionality.*

## Proposed Future Features (From 2026-03-12 Session)

- [ ] **BonusCheck 2.0 (Formula Reverse-Engineering):**
  - Allow users to input their weekly wager, P/L, and collected bonuses.
  - After receiving the actual bonus, use this data to reverse-engineer the casino's bonus calculation formula.
  - Use the derived formula to predict future bonuses and flag if the actual amount is "light," proving a change in the casino's formula.

- [ ] **Tilt-Nudge to Voice Chat:**
  - When the Chrome Extension's `Tilt Detector` identifies a user is tilted, send an event to the backend.
  - The backend should trigger the Discord Bot to send a DM to the user.
  - The DM should contain a "nudge" message, encouraging them to join the "Degen Accountability" voice channel for a cooldown.

## High-Level Features (Pending Definition/Implementation)

- [x] **Cloudflare Workers Use Cases:**
  - [x] Geo-Compliance edge worker to block restricted jurisdictions.
  - [x] Edge high-speed nonce generation.
  - [x] Image Optimization resizing.
  - [x] Event Router webhooks.
- [x] **Onboarding & Personalization:** AI-driven onboarding interview + tutorials.
- [x] **Safety & Accountability:** "Phone a Friend" buddy system, Zero Balance tasks.

## Bug Fixes TODO List

- [x] **Chrome Extension Build:** Resolved Node.js polyfill errors for browser environment.

## Priority 1: index.ts (Cloudflare Worker) - Bug Fixes

- [x] 1.1 Add proper TypeScript interfaces for Solana RPC response (replace `any` type)
- [x] 1.2 Add null check for blockhash before returning

## Priority 2: content.ts (Chrome Extension) - Bug Fixes

- [x] 2.1 Replace `Math.random()` with cryptographically secure random (line ~340)
- [x] 2.2 Fix non-null assertion `sessionId!` - add proper null check (line ~351)
- [x] 2.3 Fix stats calculation logic for totalWins (lines ~358-365)
- [x] 2.4 Replace `any` types with proper types where possible

## Status: Completed
