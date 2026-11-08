<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-08 -->

# Chrome Web Store Listing — TiltCheck

> Last Updated: 2026-11-08
> Version: 1.2.3
> Package Path: `apps/chrome-extension/tiltcheck-extension.zip`
> Mirror Download: `apps/web/public/downloads/tiltcheck-extension.zip`

---

## 1. Store Listing Details

**Extension Name** [REQUIRED]
```text
TiltCheck
```
*(Optional Display Title in developer dashboard: `TiltCheck - Non-Custodial Casino Guardrails`)*

**Short Description** [REQUIRED]
*(120 / 132 characters)*
```text
Non-custodial casino guardrails: 2-second spin brakes, deposit containment, profit lock, client seed hygiene, and cooldowns.
```

**Single Purpose Statement** [REQUIRED]
```text
To provide real-time responsible gaming brakes, session tilt detection, deposit containment, provably fair client seed hygiene, and on-chain voluntary cooldown timelocks on supported online casino websites.
```

**Category** [REQUIRED]
```text
Productivity
```

**Primary Language** [REQUIRED]
```text
English (United States)
```

**Detailed Description** [REQUIRED]
*(Plain text formatted for Chrome Web Store; no emojis; markdown styling avoided to prevent formatting breakage in store dashboard)*
```text
TiltCheck provides real-time harm reduction, tilt protection, provably fair client seed hygiene, and non-custodial voluntary cooldowns for players on supported crypto and sweepstakes gaming platforms.

CORE CAPABILITIES

1. SPIN PACE BRAKE
Enforces a configurable 2-second delay between spin inputs. Prevents rapid-fire autoplay loops and impulsive tilt clicks during high-volatility sessions.

2. REVERSE-WITHDRAWAL SHIELD
Intercepts accidental or impulsive "Cancel Withdrawal" clicks in casino cashier interfaces, preserving pending payouts and preventing immediate balance recycling.

3. PROFIT-LOCK RATCHET AND REALITY GOALS
Automatically tracks session profit targets and secures a designated floor once target thresholds are reached. Provides instant cashier navigation buttons upon goal completion.

4. CLIENT SEED MANAGER AND FAIRNESS HYGIENE
Generates cryptographically secure, high-entropy client seeds directly on-device using global browser CSPRNG. Evaluates Shannon entropy, detects stale seed compromise patterns, and facilitates safe seed rotation for provably fair verification without exposing player entropy.

5. SESSION VELOCITY AND TILT DETECTION
Monitors bet frequencies, rapid escalation curves, and cold-run loss volatility in real time. Flags behavioral drift against historical averages and triggers automated 24-hour local deposit barriers upon detecting severe tilt indicators.

6. ON-CHAIN SOLANA COOLDOWN TIMELOCKS
Direct, trustless integration with the TiltCheck voluntary timelock program on Solana Devnet and Mainnet. When locked by the user, cooldown periods are cryptographically enforced on-chain and cannot be shortened or bypassed by anyone, including the TiltCheck team. Real-time lock states sync continuously via Server-Sent Events.

7. PHISHING AND MALICIOUS MIRROR GUARD
Inspects casino page domains against verified threat registries to detect spoofed mirrors and phishing domains before navigation executes.

NON-CUSTODIAL AND ZERO-KNOWLEDGE ARCHITECTURE
- TiltCheck is strictly non-custodial. We never ask for, access, hold, or transmit private keys, seed phrases, or login credentials.
- All bet velocity tracking, seed generation, and speed brakes execute strictly inside local browser memory.
- No user tracking occurs outside supported gaming domains. We do not sell user data or deploy advertising trackers.

SUPPORTED PLATFORMS
Stake, Roobet, BC.Game, Shuffle, Rollbit, Gamdom, and CSGOEmpire.

OFFICIAL CHANNELS
- Website: https://tiltcheck.me
- Documentation: https://tiltcheck.me/docs
- Verification Hub: https://tiltcheck.me/tools/verify
- Source Code: https://github.com/TiltCheck-ME/tiltcheck-monorepo
```

---

## 2. Graphics & Asset Requirements

| Asset | Dimensions | Status | Location / Notes |
| :--- | :--- | :--- | :--- |
| **Store Icon** [REQUIRED] | 128x128 PNG | Ready | `apps/chrome-extension/src/icons/icon128.png` |
| **Screenshot 1** [REQUIRED] | 1280x800 PNG | Ready to capture | Active extension popup displaying Cooldown Status, Spin Brake toggle, and Seed Hygiene indicator. |
| **Screenshot 2** [RECOMMENDED] | 1280x800 PNG | Ready to capture | In-game overlay on Stake/Roobet showing the 2-second Spin Brake cooldown in effect. |
| **Screenshot 3** [RECOMMENDED] | 1280x800 PNG | Ready to capture | Client Seed Manager showing CSPRNG generation, Shannon entropy score, and "Apply to Page" action. |
| **Screenshot 4** [RECOMMENDED] | 1280x800 PNG | Ready to capture | Profit Lock Ratchet and Session Loss velocity limits configuration screen. |
| **Small Promo Tile** [RECOMMENDED] | 440x280 PNG | Optional | Clean branded graphic: TiltCheck shield logo with "Non-Custodial Casino Guardrails". |
| **Marquee Promo Tile** | 1400x560 PNG | Optional | Promotional header for Chrome Web Store editorial showcase consideration. |

### Screenshot Guidance
1. Ensure all screenshots are crisp 1280x800 (or 640x400) PNG images without OS taskbars or personal bookmarks visible.
2. Use dark mode across all captures to match the native TiltCheck aesthetic.
3. Keep focus on functionality (e.g. Spin Brake countdown badge, Client Seed entropy meter, Solana Cooldown lock confirmation).

---

## 3. Permissions Justifications

Provide these exact justifications when prompted in the Chrome Developer Dashboard "Privacy Practices" tab:

| Permission | Type | Exact Justification for Store Reviewers |
| :--- | :--- | :--- |
| `storage` | permissions | Required to store player safety configurations (spin brake delays, profit lock thresholds, active cooldown timestamps, and client seed state) locally on-device via chrome.storage.local. |
| `tabs` | permissions | Required to detect when a supported casino domain tab is active and to establish local message routing with the in-tab guardrail HUD without reading cross-tab browsing history. |
| `activeTab` | permissions | Required to open the quick settings, cooldown verification status, and seed rotation controls on the currently focused casino tab. |
| `notifications` | permissions | Required to display urgent desktop notifications when high tilt volatility spikes or when an on-chain cooldown timelock triggers. |
| `alarms` | permissions | Required to run periodic background checks verifying the expiration status and on-chain synchronization of active cooldown timelocks. |
| `webNavigation` | permissions | Required to intercept navigations to supported casino domains in order to mount guardrails immediately upon page transition and block confirmed phishing mirrors. |
| `host_permissions` | host_permissions | Host permissions are strictly restricted to supported casino domains (Stake, Roobet, BC.Game, Shuffle, Rollbit, Gamdom, CSGOEmpire) to mount responsible gaming guardrails and to the official TiltCheck API gateway (https://api.tiltcheck.me) for on-chain cooldown status verification and phishing threat intelligence. |

---

## 4. Privacy & Data Use Disclosures

### Data Collection Checklist
* **Personally Identifiable Information:** No
* **Health Information:** No
* **Financial and Payment Information:** No (Extension is 100% non-custodial and never holds, transfers, or touches user funds or keys)
* **Authentication Information:** Only Discord account ID if the user voluntarily connects for community role synchronization; otherwise completely anonymous local storage.
* **Personal Communications:** No
* **Location:** No
* **Web History:** No (Only active tab domains checked locally or against safety API)
* **User Activity:** Yes (Click velocity and session spin timestamps processed locally on-device for tilt and pace detection)
* **Website Content:** No

### Three Mandatory Developer Certifications
In the Developer Dashboard, check all three boxes:
1. `[x]` I confirm that data is not sold to third parties.
2. `[x]` I confirm that data is not used or transferred for purposes unrelated to the item's core functionality.
3. `[x]` I confirm that data is not used or transferred to determine creditworthiness or for lending purposes.

---

## 5. Official URLs & Metadata

* **Privacy Policy URL:** `https://tiltcheck.me/privacy`
* **Official Website:** `https://tiltcheck.me`
* **Support Email / URL:** `https://github.com/TiltCheck-ME/tiltcheck-monorepo/issues`
* **Publisher Visibility:** Public
* **Distribution Regions:** All regions

---

## 6. Version History

| Version | Date | Changes | Status |
| :--- | :--- | :--- | :--- |
| 1.2.3 | 2026-11-08 | Client Seed Manager (CSPRNG, Shannon entropy hygiene, provably fair rotation), Spin Pace Lock, Reverse-Withdrawal Shield, Profit Lock Ratchet, On-Chain Solana Cooldown Timelock integration, SusLink Phishing Guard. | Ready for Store Review |
