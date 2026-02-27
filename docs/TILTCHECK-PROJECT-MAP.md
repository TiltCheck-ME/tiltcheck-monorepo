# TiltCheck Project Map

This document outlines the current architecture of the TiltCheck ecosystem.

---

## Vision

TiltCheck = a real-time behavioral safety system for gamblers. It never exploits users, never targets them with predatory tactics, never touches funds, and never scrapes unauthorized data.

---

## Monorepo Structure

The project is organized as a pnpm monorepo with the following components:

### 📱 Applications (`/apps`)

- **discord-bot**: The primary Discord interaction point.
- **web**: The main web frontend.
- **dashboard**: Admin and user dashboard applications.
- **chrome-extension**: Browser-based safety guard.
- **dad-bot**: Degens Against Decency game bot.
- **justthetip**: Financial module application.
- **api**: Central backend API.

### ⚙️ Services (`/services`)

- **event-router**: Centralized event communication bus.
- **ai-gateway**: Managed access to AI models (OpenAI, etc.).
- **trust-engines**: Core logic for casino and user trust scoring.
- **trust-rollup**: Real-time data aggregation for trust scores.
- **gameplay-analyzer**: Predictive analysis of gambling patterns.
- **landing**: Ecosystem landing pages.
- **pricing-oracle**: Real-time price data for assets.
- **reverse-proxy**: Network management and routing.

### 🧩 Modules (`/modules`)

- **suslink**: Scam link detection and prevention.
- **collectclock**: Bonus tracking and cycle prediction.
- **tiltcheck-core**: Core tilt detection and intervention logic.
- **justthetip**: Non-custodial tipping and swapping.
- **freespinscan**: Promo scanning and validation.
- **qualifyfirst**: AI-powered survey routing.
- **dad**: Degens Against Decency card game logic.
- **poker**: Future poker module implementation.
- **linkguard**: Advanced URL protection.
- **lockvault**: Secure data storage for modules.

### 📦 Packages (`/packages`)

- **types**: Global TypeScript definitions.
- **config**: Shared configuration management.
- **utils**: Common utility functions.
- **database**: Shared database schemas and clients.
- **discord-utils**: Shared helpers for Discord bot development.
- **ai-client**: Unified interface for AI services.
- **event-types**: Shared event definitions.
- **logger**: Unified logging infrastructure.
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
