# TiltCheck Ecosystem - LLM Context Source

## Project Overview
TiltCheck is a comprehensive "Degen Safety Net" ecosystem designed to provide responsible gambling tools, fraud detection, and bankroll management for crypto users. It shifts the focus from "Service-First" to "Consumer-First," empowering players to verify fairness and manage their own data.

## Core Mission
"Check Yourself" - Tools that allow players to generate their own entropy, verify casino fairness, and monitor their own behavioral patterns to prevent tilt.

## Key Components

### 1. TiltGuard (Browser Extension)
- **Function:** Real-time overlay on casino sites (Stake, Rollbit, etc.).
- **Features:**
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
- **Backend:** Node.js (Express), Cloudflare Workers (planned).
- **Database:** Supabase (PostgreSQL).
- **Blockchain:** Solana (for entropy, memos, and tipping).
- **AI:** Vercel AI Gateway (OpenAI/Anthropic) for coaching and analysis.

### "Double Provably Fair" System
A unique mechanism where the "Source of Truth" for randomness is externalized.
1. **Identity:** User's Discord ID + Client Seed.
2. **Entropy:** Solana Block Hash (Public, Immutable).
3. **Verification:** `HMAC_SHA256(Block_Hash, Discord_ID + Seed)`.

## Cloudflare Workers Use Cases (Planned)
1. **Geo-Compliance:** Edge worker to block restricted jurisdictions before app load.
2. **Nonce Generation:** High-speed edge generation of nonces for fairness verification.
3. **Image Optimization:** Resizing casino logos/assets on the fly.
4. **Event Router:** Handling webhooks from Discord/Stripe without spinning up full containers.

## Priority Index (Decide/Delegate/Delete)

### Delegate (Automate/Outsource)
- **Dependency Updates:** Handled by Dependabot.
- **Linting/Testing:** Handled by GitHub Actions.
- **Link Scanning:** Delegated to SusLink AI engine.

### Decide (Needs Approval)
- **New Casino Integrations:** Requires manual review of selectors.
- **Fee Structure Changes:** 0.0007 SOL is current standard.
- **Mod Log Policy:** Defining exact criteria for "Rain Farmer" flags.

### Delete (Deprecated)
- **Old Discord Commands:** `/cooldown` and `/tilt` (moved to PWA).
- **Legacy CSS:** `base.css` (migrating to `theme.css`).

## Deployment
- **Web:** Vercel (PWA).
- **API:** Railway/Render.
- **Extension:** Chrome Web Store (Manual load for dev).

---
*Use this file to ground LLM responses in the specific context of the TiltCheck architecture and mission.*