<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-01 -->

# Android AutoVault install (Share Edition)

Production URLs (after web deploy):

| Page | URL |
|------|-----|
| **QR wizard (recommended)** | https://tiltcheck.me/tools/auto-vault/android |
| Static fallback | https://tiltcheck.me/userscripts/android-install.html |
| Script only | https://tiltcheck.me/userscripts/tiltcheck-autovault-share.user.js |
| Copy-link share | https://tiltcheck.me/tools/auto-vault/share |
| Session wager docs | https://tiltcheck.me/tools/session-wager |

## Install order

Scan QRs **top to bottom** on the android page. Do not skip to the script before the userscript manager is installed.

### Track A — Firefox + Violentmonkey (recommended)

1. Install **Firefox** from Google Play.
2. Add **Violentmonkey** from Firefox Add-ons (AMO).
3. Install **TiltCheck AutoVault — Share Edition** userscript from tiltcheck.me.
4. Open **stake.us** or **nuts.gg**, log in, complete one-time setup, use **AUTOVAULT** toggle.

### Track B — Edge + Tampermonkey

1. Install **Microsoft Edge** from Google Play.
2. Enable **Tampermonkey** from Edge Add-ons.
3. Install Share Edition script.
4. Open stake.us or nuts.gg.

## Notes

- Play Store Tampermonkey app is a sandbox browser — **not** the same as extension Tampermonkey. Use Firefox or Edge paths above.
- Auto-tip on nuts.gg is **off by default** (Advanced only).
- Disable legacy scripts (`tiltcheck-autovault.user.js`, `tiltcheck-nuts-autovault.user.js`) if using Share Edition only.

## Deploy requirement

These routes live in `apps/web`. Until the branch is deployed to production, `tiltcheck.me` URLs return 404. Static files under `public/userscripts/` deploy with the same web service.

Made for Degens. By Degens.
