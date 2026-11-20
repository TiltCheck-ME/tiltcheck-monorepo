<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-19 -->

# TiltCheck beta: install the extension in Chrome

This beta is not on the Chrome Web Store yet. You load it yourself from a zip file. It takes about two minutes.

**You need:** desktop Chrome (or Brave / Edge), the `tiltcheck-extension.zip` file from the beta channel, and about 2 MB of space.

---

## 1. Download and unzip

1. Download `tiltcheck-extension.zip` from the beta channel. <!-- TODO(Jamie): link to where testers get the zip (Discord channel / gated download page) -->
2. Unzip it into a folder you will keep, for example `Documents/TiltCheck`. Chrome loads the extension from this folder every time it starts, so do not delete or move it.
   - Windows: right-click the zip, **Extract All**.
   - Mac: double-click the zip.
3. Open the folder. You should see `manifest.json` inside it (not another folder). If you see a single folder, open that one; that is the folder you will pick in step 3.

![Unzipped folder showing manifest.json](./images/beta-install/01-unzipped-folder.png) <!-- SCREENSHOT PLACEHOLDER -->

## 2. Turn on Developer mode

1. In Chrome's address bar, go to `chrome://extensions`.
2. Switch on **Developer mode** (top right).

![chrome://extensions with Developer mode switched on](./images/beta-install/02-developer-mode.png) <!-- SCREENSHOT PLACEHOLDER -->

## 3. Load the extension

1. Click **Load unpacked** (top left).
2. Pick the folder from step 1 (the one that has `manifest.json` in it) and click **Select**.
3. A **TiltCheck** card appears. Leave its switch on.

![Load unpacked, folder picker](./images/beta-install/03-load-unpacked.png) <!-- SCREENSHOT PLACEHOLDER -->
![TiltCheck card on chrome://extensions](./images/beta-install/04-extension-card.png) <!-- SCREENSHOT PLACEHOLDER -->

## 4. Pin it

1. Click the puzzle-piece icon to the right of the address bar.
2. Click the pin next to **TiltCheck** so its icon stays in the toolbar.

![Pinning TiltCheck from the extensions menu](./images/beta-install/05-pin.png) <!-- SCREENSHOT PLACEHOLDER -->

## 5. First run

1. Click the TiltCheck icon. The popup opens on **Settings**. Everything there works without an account.
2. Optional: **Log in with Discord** at the top of the popup. You need this to send feedback from inside the extension.
3. Optional: scroll to **Beta** and switch on **Share anonymous beta counts**. It is off until you turn it on. It counts only how often things happen (nudges shown, Touch Grass breaks, Keep the Win holds and cash-outs). It never records your account, wallet, username, the sites you visit, or bet amounts. Turning it off deletes the counts on your device.
4. Open a casino tab you normally use and play as you normally would.

![Popup Settings with the Beta section](./images/beta-install/06-beta-section.png) <!-- SCREENSHOT PLACEHOLDER -->

## Send feedback

In the popup, go to **Settings > Beta > Send feedback**, type what worked, what broke, or what you want next, and click **Send**. You need to be logged in with Discord. <!-- TODO(Jamie): add the fallback (Discord channel or form) for testers who do not log in -->

## Updating to a new beta build

1. Download the new zip and unzip it **over the same folder** (replace the files).
2. Go to `chrome://extensions` and click the reload arrow on the TiltCheck card.

Your settings stay; they live in Chrome, not in the folder.

![Reload button on the TiltCheck card](./images/beta-install/07-reload.png) <!-- SCREENSHOT PLACEHOLDER -->

## Removing it

Go to `chrome://extensions` and click **Remove** on the TiltCheck card. Then you can delete the folder.

## If something goes wrong

| What you see | What to do |
| --- | --- |
| "Manifest file is missing or unreadable" | You picked the wrong folder. Pick the one with `manifest.json` directly inside it. |
| TiltCheck disappeared after restarting Chrome | The folder was moved or deleted. Unzip again and repeat step 3. |
| Chrome shows "Disable developer mode extensions" on startup | Normal for sideloaded extensions. Click the X / **Keep**, not **Disable**. |
| The icon is grey or nothing happens on a casino tab | Reload the casino tab once after installing. |
| Errors button on the TiltCheck card | Click it, screenshot it, and send it with your feedback. |

---

Need help? <!-- TODO(Jamie): beta support channel link -->
