# TiltCheck Project Map

This document outlines the current architecture of the TiltCheck ecosystem.

---

## Vision

TiltCheck = a real-time behavioral safety system for gamblers. It never exploits users, never targets them with predatory tactics, never touches funds, and never scrapes unauthorized data.

---

## Monorepo Structure

The project is organized as a pnpm monorepo with the following components:

### 📱 Applications (`/apps`) - All Live on Cloud Run

- **api**: Central backend API (api.tiltcheck.me).
- **chrome-extension**: Browser-based safety guard.
- **control-room**: Admin management panel.
- **discord-bot**: The primary Discord interaction point (bot.tiltcheck.me).
- **game-arena**: Multiplayer game server (Socket.io).
- **trust-rollup**: Trust score aggregator and rollup service.
- **user-dashboard**: Primary Degen Hub profile entry point (dashboard.tiltcheck.me).
- **web**: Main landing page (tiltcheck.me).

### ⚙️ Services (`/services`)

- **regulatory-scout**: Monitors commission filings and regulatory data.

### 🧩 Modules (`/modules`)

- **collectclock**: Bonus tracking and cycle prediction.
- **dad**: Degens Against Decency card game logic.
- **justthetip**: Non-custodial tipping and financial logic.
- **linkguard**: Advanced URL protection.
- **lockvault**: Secure data storage for modules.
- **poker**: Future poker module implementation.
- **stake**: Stake-specific integration logic.
- **suslink**: Scam link detection and prevention.
- **tiltcheck-core**: Core tilt detection and intervention logic.
- **triviadrops**: Trivia and engagement drops.
- **walletcheck**: Wallet validation and safety.

### 📦 Packages (`/packages`)

- **agent**: Degen Intelligence Agent (DIA) built with Google ADK.
- **ai-client**: Unified interface for AI services.
- **analytics**: Usage and behavioral analytics.
- **api-client**: Frontend and cross-service API client.
- **api-response-types**: Shared API response definitions.
- **auth / auth-flow**: Shared authentication logic.
- **cli**: Command-line interface tools.
- **comic-generator**: Cloud service for Daily Degen Comic generation.
- **config**: Shared configuration management.
- **database / db / db-client**: Shared database schemas and clients.
- **discord-utils**: Shared helpers for Discord bot development.
- **error-factory**: Unified error handling.
- **esm-utils**: ESM compatibility helpers.
- **event-router**: Centralized event communication bus.
- **event-types**: Shared event definitions.
- **express-utils**: Utilities for Express-based services.
- **identity-core**: Identity and profile management.
- **logger**: Unified logging infrastructure.
- **monitoring**: Performance and health monitoring.
- **natural-language-parser**: AI-powered text analysis.
- **rate-limiter**: API rate limiting logic.
- **retry-utility**: Robust operation retries.
- **session-store**: Shared session management.
- **supabase-auth**: Supabase-specific auth integration.
- **trust-engines**: Core logic for casino and user trust scoring.
- **trust-score-types**: Shared trust score definitions.
- **types**: Global TypeScript definitions.
- **utils**: Common utility functions.
- **validator**: Shared data validation logic.

---

## Ethical Boundaries

- **No custodial features ever.**
- **No reading other users' messages without permission.**
- **Ethical boundaries prioritized.**
- **Privacy-first design.**
- **Transparency in all scoring and recommendations.**

---

## Related Documentation

- **[QUICKSTART.md](../QUICKSTART.md)** - Get running in 5 minutes
- **[SETUP.md](./SETUP.md)** - Detailed development setup
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Production deployment guide
- **[docs/tiltcheck/](./tiltcheck/)** - Detailed ecosystem specifications

---

*TiltCheck Ecosystem © 2024–2026 | Created by jmenichole*
