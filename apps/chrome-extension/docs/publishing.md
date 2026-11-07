<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-07 -->

# Chrome Web Store Publishing & Submission Guide

This guide details everything required to submit the TiltCheck browser extension to the Google Chrome Web Store Developer Dashboard.

---

## 1. Quick File Reference

* **Production ZIP Archive:** `apps/chrome-extension/tiltcheck-extension.zip`
  * Automatically created via: `pnpm --filter @tiltcheck/chrome-extension package`
  * Contains root `manifest.json`, compiled scripts, `popup.html`, `warning.html`, and `icons/`.
  * Verified: 0 sourcemap leaks, 0 local development permissions.
* **Store Icon (128x128):** `apps/chrome-extension/src/icons/icon128.png`
* **Developer Console:** [https://chrome.google.com/webstore/devconsole](https://chrome.google.com/webstore/devconsole)
* **Privacy Policy URL:** `https://tiltcheck.me/privacy`

---

## 2. Chrome Web Store Listing Copy

Copy and paste these exact values into the Developer Console store listing fields.

### Item Details
* **Extension Name:**
  ```text
  TiltCheck: Non-Custodial Casino Guardrails
  ```
* **Short Description (118/132 characters):**
  ```text
  Non-custodial casino guardrails: 2-second spin brakes, deposit containment, profit lock, and on-chain cooldown timelocks.
  ```
* **Detailed Description (Zero emojis, Brand Law compliant):**
  ```text
  TiltCheck provides real-time harm reduction, tilt protection, and non-custodial voluntary cooldowns for players on supported crypto and sweepstakes gaming platforms.

  CORE FEATURES

  1. SPIN PACE LOCK
  - Enforces an automated 2-second delay between spin inputs.
  - Prevents rapid-fire mechanical autoplay and impulsive bet clicks.

  2. REVERSE-WITHDRAWAL SHIELD
  - Intercepts accidental or impulsive "Cancel Withdrawal" clicks in casino cashiers.
  - Keeps won funds queued for payout rather than returned to play balance.

  3. PROFIT-LOCK RATCHET & REALITY GOALS
  - Automatically locks in a designated floor once session profit targets are reached.
  - Provides instant cashout navigation buttons when profit goals are hit.

  4. SESSION VELOCITY & TILT DETECTION
  - Tracks bet frequency, rapid escalation, and cold-run loss volatility in real time.
  - Alerts on erratic behavior and escalation above player averages.
  - Automatically triggers a 24-hour local deposit barrier when high tilt (Level 3+) is detected.

  5. ON-CHAIN SOLANA COOLDOWN TIMELOCK
  - Direct integration with the TiltCheck on-chain voluntary timelock program on Solana.
  - Immutable self-exclusion: once signed client-side by your wallet, timelocks cannot be shortened or bypassed by anyone, including TiltCheck.
  - Real-time synchronization via Server-Sent Events (SSE).

  6. PHISHING & MALICIOUS MIRROR GUARD
  - Scans casino URLs against the verified SusLink database.
  - Blocks malicious mirror sites and fake phishing domains before page navigation completes.

  NON-CUSTODIAL & PRIVACY COMMITMENT
  - TiltCheck is strictly non-custodial. We never ask for, transmit, or store private keys, seed phrases, or passwords.
  - All session tracking and speed brakes execute locally in your browser.
  - We do not sell user data, track browsing outside supported gaming tabs, or use advertising analytics.
  ```

* **Category:** `Productivity`
* **Language:** `English (United States)`
* **Official Website:** `https://tiltcheck.me`

---

## 3. Privacy Practices Disclosures

Google requires precise justifications for all requested permissions and host permissions. Use the exact declarations below:

### Single Purpose Declaration
```text
To provide real-time responsible gaming brakes, session tilt detection, deposit barriers, and on-chain voluntary cooldown timelocks on supported online casino websites.
```

### Permission Justifications
* **`storage`:**
  ```text
  Required to store player preferences locally (spin delay preferences, profit lock targets, and voluntary cooldown timestamps) in chrome.storage.local.
  ```
* **`tabs`:**
  ```text
  Required to detect when a supported casino tab is active in order to mount the pace lock and session reality HUD.
  ```
* **`activeTab`:**
  ```text
  Required to open the quick settings and cooldown status popup on the currently focused casino page.
  ```
* **`notifications`:**
  ```text
  Required to display instant desktop alerts when session loss velocity spikes or an on-chain cooldown timelock triggers.
  ```
* **`alarms`:**
  ```text
  Required to run scheduled background checks verifying the expiration status of active cooldown timelocks.
  ```
* **`webNavigation`:**
  ```text
  Required to intercept page navigation before loading known phishing domains or malicious casino mirror sites.
  ```

### Host Permissions Justification
```text
Host permissions are strictly restricted to supported casino domains (Stake, Roobet, BC.Game, Shuffle, Rollbit, Gamdom, CSGOEmpire) to read game state and intercept deposit clicks during active cooldowns, and the TiltCheck API gateway (https://api.tiltcheck.me) for on-chain cooldown verification.
```

### Data Usage Attestation Checklist
* **Personally Identifiable Information:** No
* **Health Information:** No
* **Financial and Payment Information:** No (Extension is 100% non-custodial and never touches funds)
* **Authentication Information:** Only user Discord ID if voluntarily linked; otherwise anonymous local storage.
* **Personal Communications:** No
* **Location:** No
* **Web History:** No (Only active tab domains checked locally or against safety API)
* **User Activity:** Yes (Click velocity and session wager amounts processed locally for tilt detection)
* **Website Content:** No

### Three Mandatory Developer Certifications (Check all 3 boxes):
1. I confirm that data is not sold to third parties.
2. I confirm that data is not used or transferred for purposes unrelated to the item's core functionality.
3. I confirm that data is not used or transferred to determine creditworthiness or for lending purposes.

---

## 4. Visual Assets Checklist

Before submitting, upload the required images in the Store Listing tab:

| Asset | Dimensions | Status | Notes |
| :--- | :--- | :--- | :--- |
| **Store Icon** | 128x128 PNG | Ready | Use `apps/chrome-extension/src/icons/icon128.png`. |
| **Screenshots** | 1280x800 PNG | Ready to capture | At least 1 screenshot is required (up to 5 allowed). Recommended: Extension popup with Cooldown Status, Spin Brake active HUD on Stake/Roobet, and Profit Lock settings. |
| **Small Promo Tile** | 440x280 PNG | Optional/Recommended | Clean banner featuring the TiltCheck logo and "Non-Custodial Casino Guardrails". |
| **Marquee Banner** | 1400x560 PNG | Optional | For featured placement consideration on the Chrome Web Store. |

---

## 5. Step-by-Step Submission Procedure

1. Navigate to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).
2. Click **Add new item**.
3. Drag and drop `apps/chrome-extension/tiltcheck-extension.zip`.
4. Fill in the **Store Listing** tab using the copy from Section 2.
5. Upload the 128x128 store icon and at least 1 screenshot (1280x800).
6. Fill in the **Privacy Practices** tab using the exact justifications and attestations from Section 3.
7. Enter the Privacy Policy URL: `https://tiltcheck.me/privacy`.
8. Under **Distribution**, select:
   * Visibility: **Public**
   * Regions: **All regions** (or your target jurisdictions)
9. Click **Submit for review**. Review typically completes within 24 to 72 hours.
