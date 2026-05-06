<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-03 -->

# TiltCheck Ecosystem - LLM Context Source

## Project Overview
TiltCheck is a comprehensive "Degen Safety Net" ecosystem designed to provide responsible gambling tools, fraud detection, and bankroll management for crypto users. It shifts the focus from "Service-First" to "Consumer-First," empowering players to verify fairness and manage their own data.

## Core Mission
"Redeem-to-Win" - Our primary goal is to shift the definition of a "win." Instead of encouraging endless play, TiltCheck actively nudges users to cash out (redeem) their winnings once they cross a profitable threshold. The core mission is to help users secure wins, not just prevent losses.

## Key Components

### 1. TiltGuard (Browser Extension)
- **Function:** Real-time overlay on casino sites (Stake, Rollbit, etc.).
- **Features:**
  - **Redeem Nudge:** Actively monitors user balance and nudges them to cash out when they cross a profitable, casino-specific redeem threshold.
  - **Tilt Detection:** Analyzes betting patterns (rage betting, chasing losses) and suggests interventions.
  - **Fairness Verifier:** Intercepts "Play" buttons to lock in client seeds and verify results against Solana block hashes.
  - **SusLink:** Scans URLs for scams/phishing.
  - **Vault:** Bankroll management and lock timers.

### 2. Trust Identity (formerly Degen Identity)
- **Function:** Reputation and identity layer.
- **Features:**
  - **Trust Score:** 0-100 score based on behavior, verification, and community history.
  - **KYC-Lite:** Links Discord ID to Solana Wallet without invasive data collection.
  - **Mod Logs:** Tracks disciplinary actions (scammers, rain farmers) to protect the community.

### 3. JustTheTip
- **Function:** Non-custodial tipping and wallet management.
- **Features:** Multi-chain support, QR code tipping, fee collection for the ecosystem.

### 4. QualifyFirst
- **Function:** Survey pre-screening tool.
- **Features:** Matches users to surveys they actually qualify for to prevent time waste.

### 5. DA&D (Degens Against Decency)
- **Function:** Community engagement.
- **Features:** Cards Against Humanity style game played via Discord bot.

## Technical Architecture

### Stack
- **Frontend:** React, HTML5 PWA (Progressive Web App).
- **Backend:** Node.js (Express) services deployed through GHCR -> Railway where production wiring exists.
- **Database:** Supabase (PostgreSQL).
- **Blockchain:** Solana (for entropy, memos, and tipping).
- **AI:** Google Cloud AI Platform for coaching and analysis.

### "Double Provably Fair" System
A unique mechanism where the "Source of Truth" for randomness is externalized.
1. **Identity:** User's Discord ID + Client Seed.
2. **Entropy:** Solana Block Hash (Public, Immutable).
3. **Verification:** `HMAC_SHA256(Block_Hash, Discord_ID + Seed)`.

## Platform Services
- **Railway + GHCR:** Host the wired container services and publish their deployable images.
- **Cloudflare / DNS:** Public hostnames must resolve to the live service origin. A Cloudflare Tunnel is optional infrastructure, not a guaranteed production dependency.
- **Google Cloud Storage:** Used for storing user-uploaded assets and application data where those integrations still exist.
- **Google Secret Manager:** Manages secrets for GCP-scoped integrations where still in use.
- **Geo-Information:** The platform aims to inform users about regional online gambling laws and regulations to help them make informed decisions, rather than strictly blocking access based on location.

## Priority Index (Decide/Delegate/Delete)

### Delegate (Automate/Outsource)
- **Dependency Updates:** Handled by Dependabot.
- **Linting/Testing:** Handled by GitHub Actions.
- **Link Scanning:** Delegated to SusLink AI engine.

## General Agent & Developer Workflow Rules
1. **Date & Version All Edits:** Going forward, whenever an agent or developer edits a file, they MUST include a date and version number in the copyright area (or at the bottom/top of the file if no copyright exists). Example: `// Copyright 2024-2026 TiltCheck | v1.1.0 | Last Edited: 2026-02-25`
2. **Incomplete Work:** If you find that something is incomplete, not fully built, planned, or thought out, you MUST add it to the `TODO.md` file in the root of the repository so it is tracked for the team.

### Decide (Needs Approval)
- **New Casino Integrations:** Requires manual review of selectors.
- **Fee Structure Changes:** 0.0007 SOL is current standard.
- **Mod Log Policy:** Defining exact criteria for "Rain Farmer" flags.

### Delete (Deprecated)
- **Old Discord Commands:** `/cooldown` and `/tilt` (moved to PWA).
- **Legacy CSS:** `base.css` (migrating to `theme.css`).

## Deployment
- **Infrastructure:** Wired production services run on Railway with Cloudflare-managed ingress.
- **Compute:** Services are built in GitHub Actions, pushed to GHCR, and redeployed on Railway.
- **CI/CD:** `.github/workflows/deploy-railway.yml` is the primary production deploy pipeline in-repo.
- **Extension:** Chrome Web Store or manual load for dev.

---
*Use this file to ground LLM responses in the specific context of the TiltCheck architecture and mission.*