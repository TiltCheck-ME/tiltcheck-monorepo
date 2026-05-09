<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-08 -->

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

- **Discord-linked account** (primary): user clicks **Log in with Discord** in the sidebar (toolbar icon on supported casino pages). OAuth runs in a small API-driven flow; the API callback page `postMessage`s a JWT plus user payload to `auth-bridge.html` (packaged inside the extension). The bridge writes **`chrome.storage.local`** (`authToken`, `userData`, and `tiltguard_user_id`). That storage is origin-scoped to the extension, persists across browser restarts, and is what the sidebar polls after login. The API also sets an **httpOnly session cookie** on `api.tiltcheck.me` during the OAuth round-trip in the browser; the extension does not read that cookie. API calls from the extension send **`Authorization: Bearer <authToken>`** where required. The built `popup.html` flow matches the same storage contract for builds that set `action.default_popup` in the manifest.
- **Demo / guest mode** (sidebar): no token; mock-friendly paths until the user logs in.
- **Magic Link** (popup only): optional email sign-in stores the same `chrome.storage.local` keys; Discord-only tools stay gated until `userData.discordId` exists.

### Marketing site (`tiltcheck.me`)

When you visit **`https://tiltcheck.me`** (or `www.`) with the extension enabled, the content script copies the extension **`authToken`** into the page **`localStorage`** entry **`tc_token`** — the same key `apps/web` uses in `fetchAuthSession`. That keeps the public marketing Next.js app aligned with extension Discord login even if browser storage partitioning makes the API session cookie flaky for `fetch` from the page. Subdomains such as `dashboard.tiltcheck.me` are left alone (different app and token key). Extension **Log out** clears `authToken`; an active marketing tab gets `tc_token` removed via `chrome.storage.onChanged`, or the next full page load re-syncs from storage.

### Native <-> Web bridge contract

`src/page-bridge.ts` installs the versioned native/web bridge in the MAIN world. Native means the extension/content-script side posting into the page. Web means the injected page runtime posting state, logs, and errors back out.

Transport uses `window.postMessage` with a fixed source plus `version: 1`. Config payloads must stay non-secret because they cross a page message boundary.

Native -> Web source: `TILTCHECK_NATIVE`

| Type | Purpose | Required fields |
| :--- | :--- | :--- |
| `init` | Initialize bridge feature flags and runtime config. | `version`, `type` |
| `module.start` | Start a registered module. | `version`, `type`, `module` |
| `module.stop` | Stop a registered module. | `version`, `type`, `module` |
| `status.request` | Request current bridge status. | `version`, `type` |

Web -> Native source: `TILTCHECK_WEB`

| Type | Purpose | Required fields |
| :--- | :--- | :--- |
| `log` | Stream runtime log events. | `version`, `type`, `level`, `message` |
| `module.state` | Report module state changes. | `version`, `type`, `module`, `state` |
| `error` | Report validation, module, or runtime errors. | `version`, `type`, `code`, `message` |
| `status.response` | Return the current initialized/config/module snapshot. | `version`, `type`, `status` |

Example native init:

```json
{
  "source": "TILTCHECK_NATIVE",
  "version": 1,
  "type": "init",
  "requestId": "init-1",
  "features": { "wallet": true },
  "config": { "logLevel": "debug" }
}
```

Example module state response:

```json
{
  "source": "TILTCHECK_WEB",
  "version": 1,
  "type": "module.state",
  "requestId": "start-1",
  "module": "wallet",
  "state": "running"
}
```

### Discord Developer Portal redirect URIs

Register the callback URL that matches your API environment (same value the API uses for `redirect_uri` when `source=extension`):

| Environment | Redirect URI to register in Discord |
| :--- | :--- |
| Production (extension OAuth) | `https://api.tiltcheck.me/auth/discord/callback` |
| Local API (`NODE_ENV` not production, host `localhost` / `127.0.0.1`) | Whatever your API `DISCORD_REDIRECT_URI` / `TILT_DISCORD_REDIRECT_URI` resolves to (often `http://localhost:8080/auth/discord/callback`). |

The extension never uses `https://<extension-id>.chromiumapp.org/` for this flow; the auth bridge keeps `opener_origin` as `chrome-extension://<id>` so the callback can target the bridge tab safely.

### Log out

Sidebar header control and popup **Log out** call `POST /auth/logout` with the bearer token when present, then clear the same `chrome.storage.local` keys so UI returns to signed-out state everywhere.

---

## Server tilt detection (manual E2E)

The sidebar **Server Tilt Check** block calls the central API AI gateway:

- **HTTP:** `POST {AI_GATEWAY_URL}/api/ai` (from `src/config.ts`, production resolves to `https://api.tiltcheck.me/ai/api/ai`).
- **Auth:** `Authorization: Bearer <JWT>` from Discord OAuth. Demo tabs without a token get `NO_SESSION` in the result panel instead of burning provider quota.
- **Body:** `{ "application": "tilt-detection", "context": { "sessionDuration", "losses", "recentBets" } }` (matches `@tiltcheck/ai-client` tilt-detection contract).
- **API env (server):** `JWT_SECRET` plus whichever LLM keys your `AI_PROVIDER_PROFILE` allows (`GEMINI_API_KEY`, `GROQ_API_KEY`, `HF_TOKEN`, etc.). Inspect readiness via `GET /health/ai` on the API host.
- **Failure UX:** Network errors (`NETWORK`), client abort at 55s (`TIMEOUT`), HTTP 401 from bad/expired JWT, and non-2xx bodies are surfaced as JSON in the panel plus a line in **Live Signals**.

Full redirect URI list, popup wiring, and failure cases: [docs/discord-oauth.md](./docs/discord-oauth.md).

---

## Version

**Current Version:** 1.2.2 (see `manifest.json`)

---

## Known Gaps

- Toolbar icon behavior follows `src/manifest.json`. Rebuild (`pnpm build` in this package) so `dist/` matches source before loading unpacked in Chrome.

---

## Folder Structure

```
apps/chrome-extension/
├── README.md                     # This file
├── manifest.json                 # Legacy / alternate manifest (see src/manifest.json for shipped MV3)
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
│   ├── discord-oauth.md            # Extension Discord OAuth + redirect URIs
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
