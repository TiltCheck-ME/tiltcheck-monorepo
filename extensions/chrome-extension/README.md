# TiltCheck Chrome Extension

Browser extension for real-time scam detection, casino trust scores, and link scanning.

## Features

- **Sidebar Panel** - Always-visible trust dashboard
- **Auto Link Scanning** - Detects suspicious links on every page
- **Trust Scores** - Real-time casino & domain trust ratings
- **Session Stats** - Track scanned links and blocked threats
- **Visual Warnings** - Highlights dangerous links in red

## Installation (Development)

1. **Build the extension:**
   ```bash
   cd apps/chrome-extension
   # No build step needed - pure HTML/JS
   ```

2. **Load in Chrome:**
   - Open Chrome → `chrome://extensions/`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select `apps/chrome-extension/` folder

3. **Test:**
   - Click TiltCheck icon in toolbar
   - Click "Open Sidebar Panel"
   - Visit any website and see auto-scan results

## Files

```
apps/chrome-extension/
├── manifest.json       # Extension config (Manifest V3)
├── sidepanel.html      # Sidebar UI
├── sidepanel.js        # Sidebar logic
├── popup.html          # Toolbar popup
├── popup.js            # Popup logic
├── background.js       # Service worker (auto-scanning)
├── content.js          # Injected script (link detection)
└── icons/              # Extension icons (16x16, 48x48, 128x128)
```

## Usage

**Sidebar Panel:**
- Shows current page trust score
- Lists all detected links
- Displays session statistics
- Quick scan all links button

**Auto-Scanning:**
- Extension badge shows "!" for dangerous sites
- Links highlighted in red if suspicious
- Background scanning on every page load

## Publishing to Chrome Web Store

1. **Add icons:**
   ```bash
   mkdir icons
   # Add icon16.png, icon48.png, icon128.png
   ```

2. **Create ZIP:**
   ```bash
   cd apps/chrome-extension
   zip -r tiltcheck-extension.zip . -x "*.DS_Store" "README.md"
   ```

3. **Upload:**
   - Go to https://chrome.google.com/webstore/devconsole
   - Click "New Item"
   - Upload `tiltcheck-extension.zip`
   - Fill in store listing details
   - Submit for review

## Configuration

Update API endpoint in `sidepanel.js`:
```javascript
const API_BASE = 'https://your-domain.com'; // Production URL
```

## Permissions

- `activeTab` - Read current tab URL
- `storage` - Save session stats
- `host_permissions` - Scan links on all sites

## Development

**Test sidebar:**
```
chrome://extensions/ → TiltCheck → Details → "Allow in incognito"
```

**Debug:**
```
Right-click extension icon → Inspect popup
Sidebar → Right-click → Inspect
```

## Integration with TiltCheck API

Replace mock scoring in `sidepanel.js` with actual API calls:

```javascript
async function checkTrustScore(url) {
  const response = await fetch(`${API_BASE}/api/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  });
  return await response.json();
}
```

## License

Part of TiltCheck Ecosystem © 2024-2025 jmenichole

---

**Made for Degens. By Degens.™**
