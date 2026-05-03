<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-03 -->

# TiltCheck Chrome Extension (TiltGuard)

Source code and documentation for the TiltGuard Chrome extension.

Made for Degens. By Degens.

---

## Overview

TiltGuard is a Manifest V3 Chrome extension that runs as a content script on casino sites. It:

- Tracks betting patterns and session statistics in real time
- Detects tilt behavior (rage betting, loss chasing, bet escalation)
- Enforces the user's Surgical Self-Exclusion list — blocking specific games or whole categories at the DOM level
- Protects winnings with vault recommendations and stop-loss alerts
- Verifies casino licensing against known authorities
- Delivers real-time interventions when tilt is detected

---

## Authentication

Two runtime modes:

- **Authenticated mode** (Discord OAuth): full API-backed flows with persisted account and session data.
- **Demo mode** (no login): active automatically when no auth token is present. Mock responses are served for core sidebar interactions so users can explore the product before connecting Discord.

OAuth state integrity is validated server-side using signed state prefixes (extension origin vs web origin) during callback handling.

---

## Version

**Current Version:** 1.0.0 (see `manifest.json`)

---

## Known Gaps

- `manifest.json` declares `"default_popup": "popup.html"` under the `action` key, but `popup.html` does not exist in the source tree or the `dist/` output. The extension currently operates in sidebar-only mode; the popup entry point is not implemented. Until this file is created, clicking the toolbar icon will show an error in Chrome. This is a tracked gap, not a regression.

---

## Folder Structure

```
apps/chrome-extension/
├── README.md                     # This file
├── manifest.json                 # Active Chrome extension manifest (MV3)
├── package.json                  # Extension dependencies
├── tsconfig.json                 # TypeScript configuration
├── build.js                      # esbuild-based build script
├── src/
│   ├── manifest.json             # Source manifest (copied to dist/ by build)
│   ├── content.ts                # Content script entry point
│   ├── game-blocker.ts           # Surgical Self-Exclusion enforcer (GameBlocker class)
│   ├── sidebar.ts                # Legacy sidebar entry (superseded by sidebar/)
│   ├── sidebar/                  # Modular sidebar subsystem
│   │   ├── index.ts              # Sidebar bootstrap
│   │   ├── api.ts                # API call helpers
│   │   ├── auth.ts               # Auth state management
│   │   ├── session.ts            # Session tracking
│   │   ├── vault.ts              # Vault UI and actions
│   │   ├── bonuses.ts            # Bonus tracking
│   │   ├── buddy.ts              # Buddy system
│   │   ├── reports.ts            # Session reports
│   │   ├── predictor.ts          # Tilt predictor
│   │   ├── blockchain.ts         # Solana/wallet integration
│   │   ├── onboarding.ts         # First-run onboarding flow
│   │   ├── styles.ts             # Injected CSS
│   │   ├── template.ts           # HTML templates
│   │   ├── constants.ts          # Shared constants
│   │   └── types.ts              # Sidebar-specific types
│   ├── v2/                       # Next-generation sensor architecture
│   │   ├── content.ts            # v2 content entry point
│   │   ├── core/Sensor.ts        # Sensor base class
│   │   ├── hud/Sidebar.ts        # v2 HUD sidebar
│   │   ├── sensors/              # Per-casino sensors
│   │   │   ├── BcGameSensor.ts
│   │   │   ├── GenericCasinoSensor.ts
│   │   │   ├── RooSensor.ts
│   │   │   ├── SensorRegistry.ts
│   │   │   └── StakeSensor.ts
│   │   └── telemetry/HubRelay.ts # Telemetry relay to API hub
│   ├── background.js             # Service worker (icon click + auth tab open)
│   ├── extractor.ts              # Casino DOM data extraction
│   ├── tilt-detector.ts          # Tilt scoring engine
│   ├── license-verifier.ts       # Casino license checking
│   ├── analyzer.ts               # WebSocket analyzer client
│   ├── autovault.ts              # Automatic vault logic
│   ├── config.ts                 # EXT_CONFIG constants and Discord login URL builder
│   ├── FairnessService.ts        # Provably-fair verification
│   ├── fairness-tutorial.ts      # Fairness tutorial overlay
│   ├── page-bridge.ts            # page <-> content script bridge
│   ├── wallet-bridge.ts          # Solana wallet bridge
│   ├── SolanaProvider.ts         # Solana provider injection
│   ├── auth-bridge.html          # OAuth callback bridge page
│   ├── auth-bridge.js            # OAuth postMessage handler
│   ├── warning.html              # Tilt warning overlay page
│   └── DEPLOYMENT_MANUAL.md      # Ecosystem deployment reference
├── dist/                         # Compiled extension (load this in Chrome)
│   ├── manifest.json
│   ├── background.js
│   ├── content.js
│   ├── page-bridge.js
│   ├── auth-bridge.html
│   ├── auth-bridge.js
│   └── icons/
├── docs/
│   ├── installation.md
│   ├── features.md
│   ├── development.md
│   ├── publishing.md
│   └── surgical-self-exclusion.md  # Surgical Self-Exclusion technical reference
└── tests/unit/
    ├── background.test.ts
    ├── config.test.ts
    ├── content.test.ts
    └── message-contracts.test.ts
```

---

## Quick Start

### For Users

1. Download `tiltcheck-extension.zip` from the repository root.
2. Unzip to a local folder.
3. Open Chrome and navigate to `chrome://extensions/`.
4. Enable Developer mode.
5. Click "Load unpacked" and select the `dist/` folder from the unzipped archive.

### For Developers

```bash
# From repository root
pnpm install

# Build the extension
pnpm -C apps/chrome-extension build

# Load the dist/ folder in Chrome via chrome://extensions/
```

See `docs/development.md` for the full development workflow.

---

## Supported Casinos

Site-specific selectors are implemented for:

- Stake.com / Stake.us
- Roobet.com
- BC.Game
- Duelbits.com
- Rollbit.com
- Shuffle.com
- Gamdom.com

Generic fallback selectors activate on other casino sites.

---

## Features

- **Tilt Detection**: Rage betting, loss chasing, erratic clicking, bet escalation, duration thresholds.
- **Session Tracking**: Real-time P/L, RTP, bet count, session duration displayed in the sidebar.
- **Vault Integration**: Recommends vaulting at configurable profit thresholds; stop-loss alerts at 50% drawdown.
- **License Verification**: Scans casino footers against known licensing authorities across multiple jurisdictions.
- **Cooldown Enforcement**: Full-page overlay blocks betting during critical-tilt cooldown windows.
- **Surgical Self-Exclusion**: Blocks specific games or entire categories at the DOM level. See `docs/surgical-self-exclusion.md`.
- **Provably-Fair Verification**: FairnessService cross-checks server seeds against on-chain commitments.
- **Demo Mode**: Full sidebar walkthrough available before Discord login.

---

## Changelog

### v1.0.0
- Initial release.

### Unreleased
- Sidebar-only extension flow (popup UI not yet implemented — see Known Gaps).
- Demo mode with mock API responses for vault, dashboard, and session flows.
- Hardened OAuth callback handling via source/state validation.
- Surgical Self-Exclusion: GameBlocker class with MutationObserver-based DOM enforcement.
- Discord slash commands: `/block-game`, `/unblock-game`, `/my-exclusions`.
- API endpoints: `GET/POST/DELETE /user/:discordId/exclusions`, `POST /rgaas/check-game`.
- v2 sensor architecture with per-casino sensor classes and HubRelay telemetry.
- Canonical telemetry ingest now targets `https://api.tiltcheck.me/v1/telemetry/round` and `.../win-secure`.

---

## Related Documentation

- [Surgical Self-Exclusion Reference](docs/surgical-self-exclusion.md)
- [Features Reference](docs/features.md)
- [Development Guide](docs/development.md)
- [Installation Guide](docs/installation.md)
- [Publishing Guide](docs/publishing.md)
- [TiltCheck Core Architecture](/docs/tiltcheck/9-architecture.md)
- [RGaaS Pivot](/docs/tiltcheck/16-rgaas-pivot.md)
