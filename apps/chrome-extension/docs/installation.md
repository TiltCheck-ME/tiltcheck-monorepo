<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-10 -->

# TiltGuard Chrome Extension — Installation Guide

Made for Degens. By Degens.

---

## Quick Install (Users)

### Option 1: Load Unpacked Extension

1. **Download** the extension:
   - Get `tiltcheck-extension.zip` from the repository root.

2. **Unzip** the downloaded file to a folder on your computer.

3. **Open Chrome Extensions**:
   - Navigate to `chrome://extensions/`.

4. **Enable Developer Mode**:
   - Toggle the "Developer mode" switch in the top-right corner.

5. **Load the Extension**:
   - Click "Load unpacked".
   - Select the `dist/` folder from the unzipped archive.
   - The TiltGuard extension should appear in your extensions list.

6. **Pin the Extension** (optional):
   - Click the puzzle piece icon in the Chrome toolbar.
   - Click the pin icon next to TiltGuard.

### Option 2: Chrome Web Store (Pending)

The extension has not yet been published to the Chrome Web Store. Track progress in the repository changelog.

---

## Verifying Installation

After loading, you should see:

1. **Extension Icon**: TiltGuard icon in the Chrome toolbar.
2. **Sidebar**: On supported casino sites, the TiltGuard sidebar appears on the right side of the page.

Note: Clicking the toolbar icon currently does not open a popup — there is no popup.html implemented yet. The sidebar is toggled from within the casino page itself. This is a known gap tracked in the repository.

---

## Supported Sites

The extension activates on supported casino sites including:

- stake.com / stake.us
- roobet.com
- bc.game
- duelbits.com
- rollbit.com
- shuffle.com
- gamdom.com

Generic fallback selectors also activate on other casino sites.

---

## Permissions

The extension requests the following permissions:

- **activeTab**: Detect and interact with the current casino page.
- **storage**: Save session data and user preferences locally.
- **identity**: Discord OAuth flow support.
- **notifications**: Alert delivery for tilt interventions.
- **alarms**: Periodic background tasks (cooldown timers, session checks).
- **host permissions (all URLs)**: Broad casino site support.

---

## Troubleshooting

### Extension Not Loading

1. Confirm Developer Mode is enabled.
2. Verify the `dist/` folder contains `manifest.json`.
3. Check for errors on the `chrome://extensions/` page.

### Sidebar Not Appearing

1. Refresh the page after installing.
2. Check that the site is not in the excluded domains list (discord.com, localhost API ports).
3. Open DevTools (F12) and filter the Console for `[TiltCheck]` messages.

### API Connection Issues

1. The extension can operate in demo mode without a backend connection.
2. For full features including Surgical Self-Exclusion, the backend API must be reachable at `https://api.tiltcheck.me`.
3. Check `chrome://extensions/` for permission errors.

### Game Blocking Not Activating

1. Confirm you are logged in via Discord OAuth (demo mode does not support game blocking).
2. Verify you have set at least one exclusion via `/block-game` in Discord or via the API directly.
3. The profile refreshes every 5 minutes. Wait or reload the page to force a refresh.

---

## Updating the Extension

1. Download the new version.
2. Unzip to the same folder (or a new folder).
3. Go to `chrome://extensions/`.
4. Click the refresh icon on the TiltGuard entry.
5. Or click "Remove" and "Load unpacked" again with the new folder.

---

## Privacy

- Session data is processed locally in your browser.
- No personal betting data is sent to external servers without your explicit consent.
- Session data can be exported locally via the sidebar.
- See the privacy policy at `https://tiltcheck.me/privacy` for full details.

