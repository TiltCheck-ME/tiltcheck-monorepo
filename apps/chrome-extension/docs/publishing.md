# TiltGuard Chrome Extension - Publishing Guide

This guide covers publishing the TiltGuard extension to the Chrome Web Store.

## Prerequisites

- Google Developer account ($5 one-time fee)
- Extension source code
- Marketing assets (icons, screenshots)
- Privacy policy URL

## Preparation

### 1. Required Assets

| Asset | Size | Format |
|-------|------|--------|
| Store icon | 128x128 | PNG |
| Small promo tile | 440x280 | PNG/JPEG |
| Large promo tile | 920x680 | PNG/JPEG |
| Marquee promo tile | 1400x560 | PNG/JPEG |
| Screenshots | 1280x800 or 640x400 | PNG/JPEG |

### 2. Store Listing Content

Prepare the following:

**Title** (max 45 characters):
```
TiltGuard - Smart Casino Companion
```

**Summary** (max 132 characters):
```
Protect your casino balance with tilt detection, vault recommendations, and real-time session tracking.
```

**Description** (detailed):
```
TiltGuard helps casino players stay in control of their gambling sessions.

🧠 TILT DETECTION
- Detects rage betting patterns
- Identifies chasing losses behavior
- Monitors erratic clicking
- Alerts on bet escalation

📊 SESSION TRACKING
- Real-time bet counting
- Profit/loss tracking
- RTP calculation
- Session duration timer

🏦 VAULT INTEGRATION
- Smart vault recommendations
- Stop-loss alerts
- Real-world spending comparisons
- One-click balance protection

🔒 LICENSE VERIFICATION
- Automatic casino license checking
- Multi-jurisdiction support
- Red flag detection

Privacy-focused: All data processed locally in your browser.
```

**Category**: Productivity (or Tools)

**Language**: English (United States)

### 3. Privacy Policy

Create a privacy policy page covering:
- Data collected
- How data is used
- Data storage (local vs. cloud)
- Third-party services
- User rights

Host at: `https://tiltcheck.me/privacy`

## Packaging

### 1. Create Production Build

```bash
NODE_ENV=production node build.js
```

### 2. Verify manifest.json

Ensure manifest.json includes:
```json
{
  "manifest_version": 3,
  "name": "TiltGuard - Smart Casino Companion",
  "version": "1.0.0",
  "description": "Protect your casino balance with tilt detection",
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "permissions": ["activeTab", "storage"],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png"
    }
  },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"]
  }]
}
```

### 3. Create ZIP Package

```bash
cd dist
zip -r ../tiltguard-store.zip .
```

## Publishing

### 1. Access Developer Dashboard

Go to: https://chrome.google.com/webstore/devconsole

### 2. Create New Item

1. Click "New Item"
2. Upload the ZIP package
3. Fill in store listing details
4. Add screenshots and promotional images
5. Set privacy policy URL
6. Configure distribution options

### 3. Submit for Review

1. Review all information
2. Click "Submit for Review"
3. Wait for approval (typically 1-3 days)

## Post-Publishing

### Updating the Extension

1. Increment version in `manifest.json`
2. Build new package
3. Upload to Developer Dashboard
4. Submit for review

### Monitoring

- Check ratings and reviews
- Monitor crash reports
- Review usage statistics
- Respond to user feedback

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | TBD | Initial release |

## Support

For publishing issues:
- Check [Chrome Web Store policies](https://developer.chrome.com/docs/webstore/program-policies/)
- Review [Extension guidelines](https://developer.chrome.com/docs/extensions/)
- Contact: jmenichole007@outlook.com
