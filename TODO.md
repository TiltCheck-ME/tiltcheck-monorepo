<!-- Copyright 2024-2026 TiltCheck | v1.1.0 | Last Edited: 2026-02-25 -->

# TiltCheck TODO & Incomplete Work List

This list tracks any feature, plan, or concept that is **incomplete**, **not fully built**, **not planned**, or **not well thought out**. 
*As per ecosystem guidelines, ALL team members/agents MUST append items here when encountering incomplete functionality.*

## High-Level Features (Pending Definition/Implementation)
- [ ] **Cloudflare Workers Use Cases:** 
  - Geo-Compliance edge worker to block restricted jurisdictions.
  - Edge high-speed nonce generation.
  - Image Optimization resizing.
  - Event Router webhooks.
- [ ] **Onboarding & Personalization:** AI-driven onboarding interview + tutorials.
- [ ] **Safety & Accountability:** "Phone a Friend" buddy system, Zero Balance tasks.

## Status: Completed Bug Fixes

# Bug Fixes TODO List

## Priority 1: index.ts (Cloudflare Worker) - Bug Fixes

- [x] 1.1 Add proper TypeScript interfaces for Solana RPC response (replace `any` type)
- [x] 1.2 Add null check for blockhash before returning

## Priority 2: content.ts (Chrome Extension) - Bug Fixes

- [x] 2.1 Replace `Math.random()` with cryptographically secure random (line ~340)
- [x] 2.2 Fix non-null assertion `sessionId!` - add proper null check (line ~351)
- [x] 2.3 Fix stats calculation logic for totalWins (lines ~358-365)
- [x] 2.4 Replace `any` types with proper types where possible

## Status: Completed
