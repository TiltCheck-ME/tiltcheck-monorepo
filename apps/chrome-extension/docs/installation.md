# TiltGuard Chrome Extension - Installation Guide

## Quick Install (Users)

### Option 1: Load Unpacked Extension

1. **Download** the extension:
   - Download `tiltcheck-extension.zip` from the repository root
   - Or download `browser-extension.zip` for the full package with server

2. **Unzip** the downloaded file to a folder on your computer

3. **Open Chrome Extensions**:
   - Navigate to `chrome://extensions/`
   - Or click Menu (⋮) → More Tools → Extensions

4. **Enable Developer Mode**:
   - Toggle the "Developer mode" switch in the top right corner

5. **Load the Extension**:
   - Click "Load unpacked"
   - Select the `dist/` folder from the unzipped files
   - The extension should now appear in your extensions list

6. **Pin the Extension** (optional):
   - Click the puzzle piece icon in Chrome toolbar
   - Click the pin icon next to TiltGuard

### Option 2: Chrome Web Store (Coming Soon)

The extension will be available on the Chrome Web Store once published.

## Verifying Installation

After installation, you should see:

1. **Extension Icon**: A TiltGuard icon in your Chrome toolbar
2. **Popup**: Clicking the icon shows session stats and controls
3. **Sidebar**: On casino sites, a sidebar appears on the right side of the page

## Supported Sites

The extension activates on supported casino sites including:
- stake.com
- roobet.com
- bc.game
- duelbits.com
- And other casino sites with generic selectors

## Troubleshooting

### Extension Not Loading

1. Ensure Developer Mode is enabled
2. Check the `dist/` folder contains `manifest.json`
3. Look for errors in `chrome://extensions/`

### Sidebar Not Appearing

1. Refresh the page after installing
2. Check if the site is in the excluded list (e.g., Discord)
3. Open DevTools (F12) and check console for TiltGuard messages

### API Connection Issues

1. The extension can work in "offline" mode without backend connection
2. For full features, ensure the backend API is running
3. Check `chrome://extensions/` for any permission errors

## Updating the Extension

1. Download the new version
2. Unzip to the same folder (or a new one)
3. Go to `chrome://extensions/`
4. Click the refresh icon on the TiltGuard extension
5. Or click "Remove" and "Load unpacked" again

## Permissions

The extension requires the following permissions:

- **Active Tab**: To detect and analyze casino gameplay
- **Storage**: To save session data and user preferences
- **All URLs (optional)**: For broad casino site support

## Privacy

- Data is processed locally in your browser
- No personal betting data is sent to external servers without consent
- Session data can be exported locally
- See the privacy policy for full details
