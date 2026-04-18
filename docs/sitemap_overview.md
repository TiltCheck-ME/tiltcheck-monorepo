<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-17 -->
# TiltCheck Web Sitemap & Standardization Plan

This document provides a comprehensive overview of the current TiltCheck web ecosystem, identifies gaps in the sitemap, and outlines the steps to ensure uniform styling across all pages.

## 1. Web Sitemap Overview

The TiltCheck web application is a monorepo-based static and dynamic site. Most public-facing pages are located in `apps/web/`.

### Core Public Pages
| Page | URL | Description | Status |
| :--- | :--- | :--- | :--- |
| **Homepage** | `/index.html` | The main landing page with hero, stats, and tool carousel. | ✅ Live |
| **Features** | `/features.html` | Detailed breakdown of Degen Intelligence, LockVault, and LinkGuard. | ✅ Live |
| **Casino Trust** | `/trust-scores.html` | Real-time "Rug Scores" and on-chain intelligence for casinos. | ✅ Live |
| **RTP Scanner** | `/bonuses.html` | Daily bonus audit and house-edge transparency reports. | ✅ Live |
| **How It Works** | `/how-it-works.html` | Explainer on the "Friction Point" strategy and bot logic. | ✅ Live |
| **Trust Explained** | `/trust-explained.html` | Documentation on the math behind the Trust Engine. | ✅ Live |
| **Chrome Extension** | `/extension.html` | Landing page for the browser-side audit layer. | ✅ Live |
| **Casino Directory** | `/casinos.html` | Verified list of "Safe Haven" casinos. | ✅ Live |
| **Login** | `/login.html` | Access to the user dashboard and vault settings. | ✅ Live |

### Tools & Simulators (`/tools/*`)
| Page | URL | Description | Status |
| :--- | :--- | :--- | :--- |
| **JustTheTip** | `/tools/justthetip` | Non-custodial tipping protocol demo/tool. | ✅ Live |
| **LinkCheck** | `/tools/domain-verifier` | Domain verifier and phishing protection simulator. | ✅ Live |
| **BonusCheck** | `/tools/collectclock` | Bonus audit tool (formerly CollectClock). | ✅ Live |
| **Fairness Analyzer** | `/tools/verify` | Gameplay math and RNG auditor. | ✅ Live |
| **Degen Arena** | `/tools/daad.html` | "Degens Against Decency" multiplayer card game. | ✅ Live |

### Support & Operational
| Page | URL | Description | Status |
| :--- | :--- | :--- | :--- |
| **Touch Grass** | `/touch-grass.html` | Emergency responsible gambling exit page. | ✅ Live |
| **Transparency** | `/transparency-reports.html` | System-wide audit logs and success metrics. | ✅ Live |
| **Privacy Policy** | `/privacy.html` | Data handling and non-custodial disclosures. | ✅ Live |
| **Terms of Service**| `/terms.html` | User agreement and risk warnings. | ✅ Live |
| **Site Map** | `/site-map.html` | Human-readable index (Current document). | 🛠️ Needs Update |

---

## 2. Note of Changes (Recent Updates)

*   **Renamed:** `BonusCheck` is being consolidated under `RTP Scanner` (`bonuses.html`).
*   **Added:** `/trust-scores.html` is now a primary navigation target replacing legacy trust links.
*   **Added:** `/tilt-live.html` for real-time scanner integration.
*   **Removed/Legacy:** Multiple `.placeholder.html` and `.mvp.html` files are being purged in favor of final versions.

---

## 3. Missing Links & Identified Gaps

The following pages are linked in the current `site-map.html` but do not exist in the filesystem:
- ❌ `/about.html` -> Needs to be created or redirected to `how-it-works.html`.
- ❌ `/faq.html` -> Needs content implementation.
- ❌ `/contact.html` -> Needs implementation (likely a Discord link).
- ❌ `/beta.html` -> Replaced by `/beta-tester`.

The following existing pages are **missing** from `site-map.html`:
- 🔗 `/bonuses.html` (RTP Scanner)
- 🔗 `/trust-scores.html` (Rug Scores)
- 🔗 `/tilt-live.html` (Live Scanner)
- 🔗 `/touch-grass.html` (Emergency Brake)
- 🔗 `/scam-reports.html` (Phish Logs)

---

## 4. Standardization & Styling Task List

To achieve a "100% Green" uniform UI, we must enforce the following across all 70+ HTML files:

### Phase 1: Component Unification
- [ ] **Global Header:** Replace hardcoded `<header>` blocks in `index.html` and others with `<div id="shared-nav"></div>`.
- [ ] **Global Footer:** Replace hardcoded footers in `site-map.html` and others with `<div id="shared-footer"></div>`.
- [ ] **Shared Loader:** Ensure every page includes `<script src="/scripts/components-loader.js"></script>` at the end of `<body>`.

### Phase 2: Design Token Enforcement
- [ ] **CSS Audit:** Ensure all pages use `styles/theme.css`, `styles/base.css`, and `styles/main.css`.
- [ ] **Logo Update:** Ensure the `nav-logo` uses the "Neural-Audit" animated SVG from `components/nav.html`.
- [ ] **Title Tags:** Standardize title format: `[Page Name] | TiltCheck | Nuke the House Edge`.

### Phase 3: Content Sync
- [ ] **Update Sitemap:** Sync `site-map.html` with the table in Section 1.
- [ ] **Fix Broken Links:** Create basic versions of `faq.html` and `about.html` using the core layout.

---

## 5. Implementation Sequence (Immediate Actions)

1.  **Update `site-map.html`** to include all live pages.
2.  **Harmonize `index.html`** by removing its hardcoded footer in favor of `shared-footer`.
3.  **Inject `shared-nav`** into pages currently lacking a header (or having an old one).
