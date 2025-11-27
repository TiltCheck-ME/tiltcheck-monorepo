# TiltGuard Chrome Extension - Development Guide

## Prerequisites

- Node.js 18+
- pnpm (preferred) or npm
- Chrome browser

## Project Structure

```
browser-extension/
├── dist/                 # Built extension files
│   ├── manifest.json     # Chrome extension manifest
│   ├── content.js        # Content script (injected into pages)
│   ├── popup.html        # Extension popup UI
│   ├── popup.js          # Popup script
│   └── icons/            # Extension icons
├── src/                  # Source files (TypeScript)
│   ├── content.ts        # Main content script
│   ├── extractor.ts      # Casino data extraction
│   ├── tilt-detector.ts  # Tilt detection logic
│   ├── license-verifier.ts # Casino license checking
│   ├── sidebar.ts        # Sidebar UI component
│   └── popup.ts          # Popup script
├── server/               # Backend API server
│   ├── api.js            # Express API server
│   └── package.json      # Server dependencies
├── build.js              # Build script
└── package.json          # Project dependencies
```

## Getting Started

### 1. Extract the Extension Source

```bash
# From repository root
unzip browser-extension.zip -d browser-extension-src

cd browser-extension-src/browser-extension
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Build the Extension

```bash
node build.js
```

This compiles TypeScript to JavaScript in the `dist/` folder.

### 4. Load in Chrome

1. Navigate to `chrome://extensions/`
2. Enable Developer Mode
3. Click "Load unpacked"
4. Select the `dist/` folder

### 5. Development Workflow

```bash
# Make changes to src/ files
# Rebuild
node build.js

# Refresh extension in Chrome
# Ctrl+Shift+R on the extension card
```

## Source Files

### content.ts

Main entry point that:
- Initializes the sidebar
- Verifies casino licensing
- Starts gameplay monitoring
- Handles interventions

### extractor.ts

Extracts data from casino sites:
- Bet amounts
- Win amounts
- Balance
- Symbols
- Bonus indicators

Uses site-specific selectors for accuracy.

### tilt-detector.ts

Monitors betting behavior:
- Tracks bet history
- Detects rage betting
- Identifies loss chasing
- Calculates tilt score
- Generates interventions

### license-verifier.ts

Scans pages for license info:
- Checks footer content
- Matches against known authorities
- Returns verification status

### sidebar.ts

Creates and manages the sidebar UI:
- Authentication flow
- Metrics display
- P/L graph
- Vault actions
- Settings panel

## Backend Server

The optional backend server provides:
- Discord OAuth authentication
- Vault storage
- Dashboard data
- Premium features

### Running Locally

```bash
cd server
npm install
cp .env.example .env
# Edit .env with your credentials
npm start
```

### Environment Variables

```env
PORT=3000
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_REDIRECT_URI=http://localhost:3000/auth/discord/callback
JWT_SECRET=your_jwt_secret
```

## Testing

### Manual Testing

1. Load extension in Chrome
2. Visit a supported casino site
3. Verify sidebar appears
4. Test tilt detection with simulated betting
5. Check console for `[TiltGuard]` logs

### Debug Mode

Open Chrome DevTools (F12) and check:
- Console for TiltGuard messages
- Network tab for API calls
- Application tab for storage data

## Building for Production

```bash
# Build optimized version
NODE_ENV=production node build.js

# Create distribution zip
zip -r tiltcheck-extension.zip dist/
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes
4. Test thoroughly
5. Submit a pull request

See [CONTRIBUTING.md](/CONTRIBUTING.md) for full guidelines.
