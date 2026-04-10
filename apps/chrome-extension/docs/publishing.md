<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-10 -->

# TiltGuard Chrome Extension — Publishing Guide

---

## Prerequisites

- Google Developer account ($5 one-time registration fee)
- Production build of the extension
- Marketing assets (icons, screenshots)
- Privacy policy hosted at a public URL

---

## Preparation

### Required Assets

| Asset              | Size       | Format    |
|--------------------|------------|-----------|
| Store icon         | 128x128    | PNG       |
| Small promo tile   | 440x280    | PNG/JPEG  |
| Large promo tile   | 920x680    | PNG/JPEG  |
| Marquee promo tile | 1400x560   | PNG/JPEG  |
| Screenshots        | 1280x800 or 640x400 | PNG/JPEG |

### Store Listing Content

**Title** (max 45 characters):
```
TiltCheck: The Degen's HUD
```

**Summary** (max 132 characters):
```
Real-time tilt detection, surgical game blocking, and profit protection for serious casino players.
```

**Description** (detailed — no emojis per brand policy):
```
TiltGuard keeps you in control at the casino.

TILT DETECTION
- Detects rage betting patterns
- Identifies loss chasing behavior
- Monitors erratic clicking
- Alerts on bet escalation above session average
- Duration warnings after 1+ hour sessions

SESSION TRACKING
- Real-time bet counting
- Profit/loss tracking
- RTP calculation
- Session duration timer
- P/L graph updated on every bet

VAULT INTEGRATION
- Smart vault recommendations
- Stop-loss alerts at 50% drawdown
- Real-world spending comparisons
- One-click balance protection

SURGICAL SELF-EXCLUSION
- Block specific games or entire categories (crash, slots, live dealer, bonus buys)
- Set via Discord slash commands (/block-game)
- Full-page overlay enforced at the DOM level
- Your own note is shown back to you when a block fires

LICENSE VERIFICATION
- Automatic casino license checking
- Multi-jurisdiction support
- Red flag detection

Privacy-focused. All betting data processed locally. No data sent without explicit consent.

Made for Degens. By Degens.
```

**Category**: Productivity

**Language**: English (United States)

### Privacy Policy

Host a privacy policy at `https://tiltcheck.me/privacy` covering:

- Data collected
- How data is used
- Local vs. server-side storage
- Third-party services (Discord OAuth, Solana RPC)
- User rights and data deletion

---

## Packaging

### 1. Create Production Build

```bash
NODE_ENV=production pnpm -C apps/chrome-extension build
```

### 2. Verify manifest.json

Confirm the manifest in `dist/manifest.json` matches the expected shape. The current active manifest:

```json
{
  "manifest_version": 3,
  "name": "TiltCheck: The Degen's HUD",
  "version": "1.0.0",
  "description": "Real-time tilt detection and profit guards. For degens, by degens.",
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png"
    }
  },
  "permissions": ["storage", "activeTab", "identity", "notifications", "alarms"],
  "host_permissions": ["<all_urls>"],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"]
  }]
}
```

IMPORTANT: `popup.html` is declared in the manifest but does not exist in the current build output. This will cause a Chrome Web Store review rejection. Create `popup.html` before submitting, or remove the `default_popup` key and rely solely on the sidebar approach.

### 3. Create ZIP Package

```bash
# From apps/chrome-extension/
Compress-Archive -Path dist\* -DestinationPath tiltguard-store.zip
```

---

## Publishing

### 1. Access Developer Dashboard

Go to: https://chrome.google.com/webstore/devconsole

### 2. Create New Item

1. Click "New Item".
2. Upload the ZIP package.
3. Fill in store listing details.
4. Add screenshots and promotional images.
5. Set privacy policy URL.
6. Configure distribution options.

### 3. Submit for Review

1. Review all information.
2. Click "Submit for Review".
3. Review typically takes 1–3 business days.

---

## Post-Publishing

### Updating the Extension

1. Increment version in `src/manifest.json` and `manifest.json`.
2. Build a new package.
3. Upload to the Developer Dashboard.
4. Submit for review.

### Monitoring

- Review user ratings and comments.
- Monitor crash reports in the Developer Dashboard.
- Check usage statistics.

---

## Version History

| Version | Date       | Changes          |
|---------|------------|------------------|
| 1.0.0   | Unreleased | Initial release  |

---

## Support

For publishing issues:

- Chrome Web Store policies: https://developer.chrome.com/docs/webstore/program-policies/
- Extension guidelines: https://developer.chrome.com/docs/extensions/
- Contact: jme@tiltcheck.me

