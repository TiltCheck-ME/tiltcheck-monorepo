# TiltCheck Project Map

This document outlines the current and future architecture of the TiltCheck ecosystem.

---

## Vision

TiltCheck = a real-time behavioral safety system for gamblers. It never exploits users, never targets them with predatory tactics, never touches funds, and never scrapes unauthorized data.

**It provides:**
- Tilt detection
- Stress indicators
- Cooldown suggestions
- Responsible-gaming nudges
- Fairness checks for casinos
- Moderator tools
- Player Health Scores (ethical)
- Personal analytics for users who opt in
- Anonymous aggregate trends for servers

---

## Core Components

The TiltCheck ecosystem consists of three core components that work together to detect tilt behavior, protect users, and support responsible play — without custodial actions, without reading other users' messages, and without violating Discord ToS or privacy regulations.

1. **TiltCheck Bot** (Discord server bot)
2. **TiltCheck Personal Guard** (browser extension for Discord web/app)
3. **TiltCheck Mobile Guard** (mobile overlay / companion app)

---

## APPS

### /apps/tiltcheck-bot 
Discord server bot for:
- Real-time tilt detection (chat-based)
- Fairness checks
- Moderator tools
- Cooldown reminders

**Capabilities:**
- Read server chat ONLY where bot is installed
- Detect tilt patterns (rapid loss-chasing, impulsive language, stress signals)
- Provide private cooldown warnings
- Offer /fairness and /check commands that use TiltCheck API
- Provide moderator tools for RG and anti-abuse
- Never analyze DMs or servers it's not in
- Never store personal user data beyond anonymized event logs

**Packages used:**
- /packages/behavior-models
- /packages/safety-engine
- /packages/fairness-analyzer
- /packages/mod-tools
- /packages/types
- /packages/logger
- /packages/utils

### /apps/api
Central API gateway that:
- Validates identity
- Handles shared services
- Provides tilt/fairness endpoints

*(Already exists; continue improving, no rewrites.)*

---

## PACKAGES

### /packages/tc-analyzer (NEW)
Shared analysis engine for:
- Tilt detection
- Sentiment analysis
- Behavioral scoring

**Used by:**
- tiltcheck-bot
- browser extension
- mobile app (future)

### /packages/behavior-models 
Patterns, thresholds, and rule sets for tilt detection.

### /packages/safety-engine
Implements cooldown logic, warnings, and user-support behaviors.

### /packages/fairness-analyzer
Tools for casino fairness checking and session evaluation.

### /packages/mod-tools
Tools for server moderators (risk flags, self-exclusion, anti-abuse).

### /packages/types
Global TypeScript types for all apps and packages.

### /packages/logger
Unified logging utility.

### /packages/utils
Shared utilities.

---

## EXTENSION (FUTURE WORK)

### /extension/tc-guard-web
**TiltCheck Personal Guard** - Browser extension:
- Analyzes ONLY the user's own typed text
- Warns before sending
- Client-side and privacy-focused

**Goal:** Analyze the user's OWN outgoing messages before they send them in Discord.

This must NOT read server logs or other people's messages.

**The extension:**
- Runs on Discord web and app.discord.com
- Hooks ONLY into the user's message input field
- Performs client-side tilt analysis
- Shows warnings before sending risky messages
- Never transmits message content to servers

---

## MOBILE (FUTURE WORK)

### /mobile/tc-mobile-guard
**TiltCheck Mobile Guard** - Mobile app or overlay using same analyzer.
- Uses /packages/tc-analyzer for consistency
- Provides tilt warnings on mobile
- Optional integration with Discord mobile

---

## Ethical Boundaries

- **No custodial features ever.**
- **No reading other users' messages without permission.**
- **Ethical boundaries prioritized.**
- **Privacy-first design.**
- **Transparency in all scoring and recommendations.**

---

## Related Documentation

- [PAGE-CONSISTENCY-ANALYSIS.md](./PAGE-CONSISTENCY-ANALYSIS.md) - Frontend page migration roadmap
- [NON-CUSTODIAL-ARCHITECTURE.md](./NON-CUSTODIAL-ARCHITECTURE.md) - Non-custodial design principles
- [/docs/tiltcheck/](./tiltcheck/) - Detailed TiltCheck documentation

---

*TiltCheck Ecosystem © 2024–2025 | Created by jmenichole*
