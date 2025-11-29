# TiltCheck Chrome Extension (TiltGuard)

This folder contains the source code and documentation for the TiltGuard Chrome extension.

## Overview

TiltGuard is a Chrome extension that helps casino players:
- Track betting patterns and session statistics
- Detect tilt behavior (rage betting, chasing losses, etc.)
- Protect winnings with vault recommendations
- Verify casino licensing
- Get real-time interventions when tilt is detected

## Version

**Current Version:** 1.1.0

## Folder Structure

```
apps/chrome-extension/
├── README.md           # This file
├── package.json        # Extension dependencies
├── tsconfig.json       # TypeScript configuration
├── build.js            # Build script
├── src/                # TypeScript source files
│   ├── manifest.json   # Chrome extension manifest
│   ├── content.ts      # Main content script
│   ├── popup.html      # Extension popup UI
│   ├── popup.js        # Popup script
│   ├── sidebar.ts      # Sidebar UI component
│   ├── extractor.ts    # Casino data extraction
│   ├── tilt-detector.ts # Tilt detection logic
│   └── license-verifier.ts # Casino license checking
├── dist/               # Built extension files
│   ├── icons/          # Extension icons
│   └── ...             # Compiled JS files
└── docs/               # Documentation
    ├── installation.md # Installation guide
    ├── features.md     # Feature documentation
    ├── development.md  # Development setup
    └── publishing.md   # Chrome Web Store publishing
```

## Quick Links

- **Extension Zip Files**: See `/browser-extension.zip` and `/tiltcheck-extension.zip` in the repository root
- **Built Output**: The compiled extension is in the `dist/` folder

## Installation

### For Users

1. Download `tiltcheck-extension.zip` from the repository root
2. Unzip to a local folder
3. Open Chrome and navigate to `chrome://extensions/`
4. Enable "Developer mode"
5. Click "Load unpacked" and select the unzipped folder

### For Developers

```bash
# From the apps/chrome-extension directory
npm install

# Build the extension
npm run build

# Load the dist/ folder in Chrome
```

See `docs/development.md` for full development setup instructions.

## Supported Casinos

The extension supports the following casinos with site-specific selectors:
- Stake.com / Stake.us
- Roobet.com
- BC.Game
- Duelbits.com
- Rollbit.com
- Shuffle.com
- Gamdom.com

Generic selectors also work on many other casino sites.

## Features

- **Tilt Detection**: Identifies rage betting, chasing losses, and erratic behavior
- **Session Tracking**: Monitors bets, wins, and session duration
- **Vault Integration**: Recommends vaulting winnings to protect profits
- **License Verification**: Checks casino licensing information
- **Real-time Metrics**: Displays P/L, RTP, and tilt score
- **Cooldown Periods**: Blocks betting when critical tilt is detected
- **Real-world Comparisons**: Shows what your profit could buy

## Changelog

### v1.1.0
- Fixed API URL consistency
- Added support for more casinos (Rollbit, Shuffle, Gamdom, Stake.us)
- Added more excluded domains (Google, GitHub)
- Improved selector coverage for existing casinos
- Added helper functions for better detection
- Updated manifest with icons configuration

### v1.0.0
- Initial release

## Related Documentation

- [TiltCheck Core Documentation](/docs/tiltcheck/7-tool-specs-3.md)
- [Trust Engines](/docs/tiltcheck/8-trust-engines.md)
- [Architecture](/docs/tiltcheck/9-architecture.md)
