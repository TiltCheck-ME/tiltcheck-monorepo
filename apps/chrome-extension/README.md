# TiltCheck Chrome Extension

This folder contains documentation and resources for the TiltCheck Chrome extension (TiltGuard).

## Overview

TiltGuard is a Chrome extension that helps casino players:
- Track betting patterns and session statistics
- Detect tilt behavior (rage betting, chasing losses, etc.)
- Protect winnings with vault recommendations
- Verify casino licensing

## Folder Structure

```
apps/chrome-extension/
├── README.md           # This file
└── docs/               # Chrome extension documentation
    ├── installation.md # Installation guide
    ├── features.md     # Feature documentation
    ├── development.md  # Development setup
    └── publishing.md   # Chrome Web Store publishing
```

## Quick Links

- **Extension Zip Files**: See `/browser-extension.zip` and `/tiltcheck-extension.zip` in the repository root
- **Source Code**: The extension source is bundled in the zip files
- **Content Script**: See `/content.js` for the main content script (built output)

## Installation

### For Users

1. Download `tiltcheck-extension.zip` from the repository root
2. Unzip to a local folder
3. Open Chrome and navigate to `chrome://extensions/`
4. Enable "Developer mode"
5. Click "Load unpacked" and select the unzipped folder

### For Developers

See `docs/development.md` for development setup instructions.

## Features

- **Tilt Detection**: Identifies rage betting, chasing losses, and erratic behavior
- **Session Tracking**: Monitors bets, wins, and session duration
- **Vault Integration**: Recommends vaulting winnings to protect profits
- **License Verification**: Checks casino licensing information
- **Real-time Metrics**: Displays P/L, RTP, and tilt score

## Related Documentation

- [TiltCheck Core Documentation](/docs/tiltcheck/7-tool-specs-3.md)
- [Trust Engines](/docs/tiltcheck/8-trust-engines.md)
- [Architecture](/docs/tiltcheck/9-architecture.md)
