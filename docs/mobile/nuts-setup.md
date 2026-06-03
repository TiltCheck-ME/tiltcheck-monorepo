# nuts.gg setup page

© 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-03

## Purpose

**https://tiltcheck.me/nuts** — single link for DMs. Plain-language install for nuts.gg auto-vault. No site nav, no jargon.

## Distribution

- **Public nuts chat:** do not post the link (mute risk). One casual line only; link in DM.
- **DM:** send `https://tiltcheck.me/nuts` or use **Copy DM text** on the page.

## User flow

1. Pick Firefox (easiest) or Edge.
2. Install browser from Play Store.
3. Add Violentmonkey (Firefox) or Tampermonkey (Edge).
4. Tap **Install auto-vault** → confirm in browser.
5. Open nuts.gg → flip **AUTOVAULT ON**.

## Code

- Copy and steps: `apps/web/src/lib/nuts-setup.ts`
- Page: `apps/web/src/app/nuts/`
- Script: `/userscripts/tiltcheck-autovault-share.user.js` (Share Edition — mobile UI + session wager)

## Chrome on Android

Page shows a warning. Chrome cannot run userscript managers; user must switch to Firefox or Edge.
