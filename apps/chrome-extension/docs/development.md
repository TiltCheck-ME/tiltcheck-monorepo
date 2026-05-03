<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-03 -->

# TiltGuard Chrome Extension — Development Guide

---

## Prerequisites

- Node.js 18+
- pnpm (monorepo standard)
- Chrome browser

---

## Project Structure

```
apps/chrome-extension/
├── manifest.json             # Active MV3 manifest (root of app dir)
├── build.js                  # esbuild-based build script
├── package.json
├── tsconfig.json
├── src/
│   ├── manifest.json         # Source manifest (overrides root on build)
│   ├── content.ts            # Content script entry point
│   ├── game-blocker.ts       # Surgical Self-Exclusion enforcer
│   ├── sidebar/              # Modular sidebar subsystem
│   ├── v2/                   # Next-generation sensor architecture
│   ├── background.js         # Service worker
│   ├── extractor.ts          # Casino DOM data extraction
│   ├── tilt-detector.ts      # Tilt scoring engine
│   ├── license-verifier.ts   # Casino license verification
│   ├── analyzer.ts           # WebSocket analyzer client
│   ├── config.ts             # EXT_CONFIG and Discord login URL builder
│   ├── FairnessService.ts    # Provably-fair verification
│   ├── page-bridge.ts        # page <-> content script bridge
│   ├── wallet-bridge.ts      # Solana wallet bridge
│   ├── auth-bridge.html      # OAuth callback bridge page
│   └── DEPLOYMENT_MANUAL.md  # Ecosystem deployment reference
├── dist/                     # Build output — load this in Chrome
└── tests/unit/               # Vitest unit tests
```

---

## Getting Started

### 1. Install Dependencies

```bash
# From repository root
pnpm install
```

### 2. Build the Extension

```bash
pnpm -C apps/chrome-extension build
```

This runs `build.js` via esbuild, compiling TypeScript to JavaScript in the `dist/` folder and copying static assets (manifest, icons, HTML files).

### 3. Load in Chrome

1. Navigate to `chrome://extensions/`.
2. Enable Developer Mode.
3. Click "Load unpacked".
4. Select the `dist/` folder.

### 4. Development Workflow

```bash
# Make changes to src/ files
pnpm -C apps/chrome-extension build

# Reload extension in Chrome
# Click the refresh icon on the TiltGuard card at chrome://extensions/
```

---

## Source Files

### content.ts

Main content script. Runs on every page (minus excluded domains). Responsibilities:

- Early exit for excluded domains (discord.com, API auth routes, localhost dev ports).
- Initializes `CasinoDataExtractor`, `TiltDetector`, `CasinoLicenseVerifier`, `FairnessService`, and `GameBlocker`.
- Manages the sidebar lifecycle.
- Handles `WalletBridge` and `SolanaProvider` injection.
- Listens for messages from `background.js`.

`GameBlocker` is initialized after the user session resolves. If no Discord session is present, the blocker is skipped silently.

### game-blocker.ts

Enforces the user's Surgical Self-Exclusion list at the DOM level. See [docs/surgical-self-exclusion.md](surgical-self-exclusion.md) for the full reference.

Key internals:

- `GameBlocker(discordId: string)` — constructor.
- `init()` — fetches profile, runs initial scan, starts `MutationObserver`, starts 3-second refresh poller.
- `destroy()` — disconnects observer, clears poller, removes overlay.
- Profile is cached in-memory for 5 minutes (`CACHE_TTL_MS = 300_000`). The server-side Redis cache independently expires at 5 minutes.
- `OVERLAY_ID = 'tiltcheck-game-block-overlay'` — used to guard against duplicate overlay injection.

### extractor.ts

Extracts data from casino sites:

- Bet amounts, win amounts, balance, symbols, bonus indicators.
- Site-specific selectors take priority over generic fallbacks.

### tilt-detector.ts

Core tilt scoring:

- Tracks bet history for the current session.
- Detects rage betting, loss chasing, bet escalation.
- Emits intervention payloads at configurable severity thresholds.

### license-verifier.ts

Scans page footer for license information:

- Matches text against known licensing authority patterns.
- Returns a verification result including jurisdiction tier.

### sidebar/ (modular subsystem)

The `sidebar/` directory contains a fully modular sidebar implementation that supersedes the legacy `sidebar.ts`. Each module handles a distinct concern (auth, session, vault, buddy, etc.).

Entry point: `sidebar/index.ts` — call `initSidebar()` from `content.ts`.

### v2/ (next-generation sensor architecture)

Per-casino sensor classes extending a common `Sensor` base. `SensorRegistry` maps hostnames to sensor instances. `HubRelay` posts round telemetry to the canonical API hub at `https://api.tiltcheck.me/v1/telemetry/round`, which is persisted into the API audit/activity lane.

Status: active development. Not yet the default in `content.ts`.

### background.js

Service worker:

- Toggles the sidebar on toolbar icon click via `chrome.tabs.sendMessage`.
- Opens the Discord OAuth flow in a normal browser tab when it receives an `open_auth_tab` message.

### config.ts

Exports `EXT_CONFIG`:

```ts
{
  API_BASE_URL: 'https://api.tiltcheck.me',
  HUB_URL:      'https://api.tiltcheck.me',
  AI_GATEWAY_URL: 'https://api.tiltcheck.me/ai',
  WEB_APP_URL:  'https://tiltcheck.me',
  DISCORD_CLIENT_ID: '1445916179163250860',
  OPERATIONS_WALLET: 'BvzEqVRUicmW8Y6HFncLYrGXESpMbSNDkWUNTQj5GGGi',
  PROTOCOL_FEE_BPS:  250,
}
```

Also exports `TELEMETRY_PATH = '/v1/telemetry/round'`, `WIN_SECURE_PATH = '/v1/telemetry/win-secure'`, request headers for API CSRF compatibility, and `getDiscordLoginUrl(source?)` which builds the full OAuth URL with extension runtime ID and opener origin.

---

## Backend Dependency

The extension calls `https://api.tiltcheck.me`. For local development, override `EXT_CONFIG.API_BASE_URL` to point to your local API instance (e.g., `http://localhost:3000`).

The backend app is at `apps/api`. Run it with:

```bash
pnpm -C apps/api dev
```

Minimum required environment variables for the API (for exclusion feature):

```env
DATABASE_URL=          # Postgres connection string
REDIS_URL=             # Optional — exclusion cache degrades gracefully without it
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
JWT_SECRET=
```

---

## Testing

Unit tests use Vitest. Run from the monorepo root:

```bash
pnpm -C apps/chrome-extension test
```

Or run the full suite:

```bash
pnpm test
```

### Manual Testing

1. Load the extension in Chrome.
2. Visit a supported casino site.
3. Verify the sidebar renders on the right side.
4. Open DevTools (F12) and filter the console for `[TiltCheck]` prefixed messages.
5. Check the Network tab for `POST https://api.tiltcheck.me/v1/telemetry/round` returning 2xx/202 and `POST https://api.tiltcheck.me/v1/telemetry/win-secure` returning 2xx.
6. Confirm the linked user's recent activity feed now shows the persisted round in the API-backed audit lane.
7. Test game blocking: add an exclusion via Discord bot or API, then navigate to a matching game URL.

---

## Building for Production

```bash
NODE_ENV=production pnpm -C apps/chrome-extension build

# Create distribution zip from the dist/ folder
Compress-Archive -Path dist\* -DestinationPath tiltcheck-extension.zip
```

---

## Known Gaps

- `manifest.json` declares `"default_popup": "popup.html"` but that file does not exist. The toolbar icon click is handled by `background.js` toggling the sidebar. Until `popup.html` is created, Chrome will display an error when the toolbar icon is clicked in some configurations.

---

## Contributing

1. Fork the repository.
2. Create a feature branch.
3. Make changes in `src/`.
4. Build and manually verify in Chrome.
5. Run `pnpm -C apps/chrome-extension test`.
6. Submit a pull request.

See [CONTRIBUTING.md](/CONTRIBUTING.md) for full guidelines.

