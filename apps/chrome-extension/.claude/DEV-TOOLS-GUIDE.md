# TiltCheck Chrome Extension - MCP Dev Tools Guide

## Overview
This configuration sets up MCP (Model Context Protocol) development tools for the TiltCheck Chrome Extension, enabling automated builds, testing, and debugging workflows.

## Quick Commands

### Build & Dev
```bash
# Build once
pnpm --filter @tiltcheck/core build

# Watch mode (rebuilds on file changes)
pnpm --filter @tiltcheck/core dev

# Type checking only
pnpm --filter @tiltcheck/core build:tsc
```

### Testing
```bash
# Run unit tests once
pnpm --filter @tiltcheck/core test

# Watch mode for TDD
pnpm --filter @tiltcheck/core test:watch

# With coverage
pnpm --filter @tiltcheck/core test:coverage
```

### Linting
```bash
# Check for issues
pnpm --filter @tiltcheck/core lint

# Auto-fix
pnpm --filter @tiltcheck/core lint:fix
```

---

## Development Workflows

### 1. **Local Setup** (First Time)
```bash
pnpm install
cd apps/chrome-extension
pnpm build
```
Then manually load in Chrome:
- Go to `chrome://extensions/`
- Enable **Developer mode** (top right toggle)
- Click **Load unpacked**
- Select `apps/chrome-extension/dist/`

### 2. **Active Development** (Watch + Reload)
**Terminal 1:** Start watch mode
```bash
cd apps/chrome-extension
pnpm dev
```

**Chrome:** Reload the extension after changes
- Go to `chrome://extensions/`
- Click the **↻ refresh** button on the TiltCheck extension
- Or press **Ctrl+Shift+R** (or **Cmd+Shift+R** on Mac)

### 3. **Content Script Debugging**
Content scripts run in a page's context and can access the DOM.

**Chrome DevTools:**
1. Open the target page (e.g., casino website)
2. Press **F12** to open DevTools
3. Go to **Console** tab
4. Look for logs with `[CS]` prefix (content script logs)
5. Type `window.__TILTCHECK__` to inspect exposed APIs

**View Console Messages:**
- Content script logs appear in page's DevTools console
- Prefixed with `[TiltCheck Content Script]`
- Can access page's `window` object and DOM

### 4. **Background Service Worker Debugging**
The service worker handles messaging and background tasks.

**Chrome DevTools:**
1. Go to `chrome://extensions/`
2. Find TiltCheck extension → Click **Details**
3. Under "Inspect views", click **background page**
4. DevTools opens for the service worker
5. View logs, set breakpoints, inspect state

### 5. **Manifest Validation**
Before testing, ensure `src/manifest.json` is valid:

**Required v3 Fields:**
```json
{
  "manifest_version": 3,
  "name": "TiltCheck",
  "version": "1.2.0",
  "permissions": ["storage", "scripting"],
  "host_permissions": ["https://*/*", "http://*/*"],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["https://*/*", "http://*/*"],
      "js": ["content.js"],
      "run_at": "document_start"
    }
  ]
}
```

---

## Architecture

### File Structure
```
apps/chrome-extension/
├── src/
│   ├── manifest.json           # Extension metadata (v3)
│   ├── content.ts              # Content script (runs on all pages)
│   ├── background.js           # Service worker (persistent, handles messages)
│   ├── page-bridge.ts          # MAIN world script (wallet/page access)
│   ├── sidebar.ts              # Sidebar UI logic
│   ├── auth-bridge.html/js     # OAuth redirect handler
│   └── [feature files]
├── dist/                       # Build output (gitignored)
├── tests/
│   └── unit/                   # Vitest unit tests
├── build.js                    # esbuild configuration
└── package.json
```

### Key Scripts
- **content.ts** → Runs in ISOLATED world, accesses page DOM via messaging
- **page-bridge.ts** → Runs in MAIN world, accesses window.ethereum, etc.
- **background.js** → Service worker, handles message routing & persistence
- **sidebar.ts** → UI for extension sidebar panel

### Message Flow
```
Page (MAIN) ←→ page-bridge.ts ←→ content.ts ←→ background.js ←→ API
```

---

## Configuration Files

### MCP Tools Config
**Location:** `.claude/mcp-tools.json`

Defines build commands, test workflows, and debug configurations used by MCP agents.

### VS Code Debug Config
**Location:** `.claude/vscode-launch-config.json`

Includes launch configurations for:
- Attaching to Chrome extension background worker
- Content script debugging with source maps
- Node-based test debugging with Vitest

---

## Troubleshooting

### Extension not loading?
- Verify `dist/manifest.json` exists and is valid JSON
- Check `dist/` contains `content.js`, `background.js`, `manifest.json`
- Ensure manifest `version` matches package.json version

### Changes not appearing?
- Click the **refresh** button on the extension in `chrome://extensions/`
- Hard refresh target page with **Ctrl+Shift+R**
- Check for build errors in terminal: `pnpm dev`

### Content script not running?
- Verify `content_scripts` in manifest.json has correct `matches` pattern
- Check page URL matches `matches` pattern (case-sensitive)
- Open page DevTools and look for error messages

### Message passing errors?
- Enable verbose logging in content.ts and background.js
- Use Chrome DevTools → Network tab → find `chrome-extension://` messages
- Verify message listener is registered in background.js

### Tests failing?
```bash
cd apps/chrome-extension
pnpm test:watch              # See failures in real-time
pnpm test -- --reporter=verbose  # Detailed output
```

---

## Deployment

See `src/DEPLOYMENT_MANUAL.md` for:
- Creating production builds
- Packaging as .zip for Chrome Web Store
- Version management
- Release notes

---

**Last Updated:** 2026-03-13
**Extension Version:** 1.2.0 (see `src/manifest.json`)
