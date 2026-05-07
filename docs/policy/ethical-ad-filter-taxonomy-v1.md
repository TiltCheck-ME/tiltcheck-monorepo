<!--
© 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-07
-->

# Ethical ad filter — Taxonomy v1

**Linear:** TIL-70  
**Status:** Draft policy for MVP rule engine and user-facing controls  
**Scope:** High-harm advertising categories and normative tier semantics (`block`, `blur`, `allow+log`). Client-specific mechanics (DNS list vs DOM overlay vs extension API) are noted separately; tiers describe **user-visible outcomes** and **minimum accountability signals**, not one implementation.

---

## 1. Tier definitions (normative)

These tiers are **user-configurable per category** in the MVP mental model. Defaults may ship conservative per category; product can tune later without renaming tiers.

### 1.1 `block`

**Intent:** The promoted destination or creative does not achieve normal persuasive exposure.

**Behavior:**

- Network or render path prevents standard delivery (drop, substitute neutral asset, skip insertion, empty slot).
- No autoplay of blocked media; no readable marketing copy without an explicit override flow outside the default happy path (product may omit overrides in strict modes).
- User sees a neutral placeholder or silence consistent with the client (e.g. collapsed slot, blank panel, NXDOMAIN-equivalent for DNS-only stacks).

**Accountability / telemetry:**

- Emit structured decision records when logging is enabled: `{ categoryId, tier: "block", decisionSource, coarseReasonCode }` without storing full creative body unless user opts into forensic bundles.

**Rollback:** If false positives spike, downgrade category default from `block` to `blur` for that surface only; keep taxonomy IDs stable.

---

### 1.2 `blur`

**Intent:** Material may load technically, but persuasive content is **visually and interactively gated**.

**Behavior:**

- Creative is obscured (blur, heavy dim, reduced legibility) behind a single consistent chrome label (e.g. category name + short explanation).
- Primary CTA is not one-click actionable until the user completes an explicit reveal gesture (second tap, press-and-hold, or settings toggle). Exact UX is client-defined.
- Audio/video: default muted + obscured first frame or poster swap.

**DNS / VPN caveat:** Pure DNS or IP-list clients cannot reliably blur DOM-level creative. Map `blur` to **`block` at the edge** or skip categories that require DOM judgment unless paired with a browser-capable layer.

**Accountability / telemetry:** Same minimum structured record as `block`; optional coarse geometry signal (e.g. slot id) where privacy-preserving.

**Rollback:** Switch default to `allow+log` for noisy categories while retaining category IDs.

---

### 1.3 `allow+log`

**Intent:** Normal rendering for usability or compatibility; **harm reduction is retrospective and optional**.

**Behavior:**

- Creative renders without gating.
- Engine still classifies and emits logs / aggregates for dashboard export and optional SusLink-adjacent accountability bundles.

**Risk:** Weakest harm reduction; only appropriate where blocking breaks critical flows or classification confidence is low.

**Rollback:** Disable logging categories independently of tier display.

---

## 2. Categories (v1)

Seven categories. IDs are **stable snake_case** strings for configs and exports.

| ID | Label | One-line harm thesis |
|----|--------|----------------------|
| `predatory_gambling_marketing` | Predatory gambling marketing | Inducements and copy that pressure chasing losses, misrepresent odds, or weaponize urgency around wagering. |
| `deceptive_financial_crypto` | Deceptive financial / crypto | Fake platforms, impersonation, guaranteed-return narratives, wallet-drainer patterns in promoted destinations. |
| `predatory_credit_lending` | Predatory credit / lending | Payday spiral framing, hidden APR, harassment-as-collection aesthetics in creative. |
| `health_misinformation_high_risk` | High-risk health misinformation | Unapproved cure claims, anti-science substitution for care, exploitative wellness traps. |
| `illegal_or_policy_commerce` | Illegal or policy-violating commerce | Ads facilitating controlled substances, weapons, human trafficking signals, or clearly illegal services (jurisdiction-aware lists supplement taxonomy). |
| `vulnerability_targeted_exploitation` | Vulnerability-targeted exploitation | Creative explicitly tuned to grief, isolation, disability, or acute financial distress as the hook. |
| `dark_pattern_commerce` | Dark-pattern commerce | Trap subscriptions, dishonest pricing trails, malicious renewal patterns promoted in the unit. |

---

## 3. Per-category tier semantics

For each category the columns describe **recommended default posture** (product may override). “Detection hints” inform classifiers; they are **not** legal definitions.

### 3.1 `predatory_gambling_marketing`

| Tier | Definition |
|------|------------|
| **block** | Remove units promoting “risk-free” bets, bonus ladders tied to loss recovery, explicit encouragement to chase losses, or countdown pressure tied to deposit/wager. |
| **blur** | Allow gambling-adjacent promos that are promotional but not explicitly predatory under internal rubric; obscure until user confirms review. |
| **allow+log** | Record only; render unchanged — use when jurisdiction or partner policy requires display but accountability export is still valuable. |

**Detection hints:** Loss-chasing language, guaranteed outcomes, misleading “free money” framing, aggressive retargeting scripts paired with bonus CTAs (browser contexts).

---

### 3.2 `deceptive_financial_crypto`

| Tier | Definition |
|------|------------|
| **block** | Destination domains on impersonation lists, known drain semantics, “seed phrase” prompts, cloned exchange UI paths. |
| **blur** | High suspicion short of block (novel domains, aggressive ROI claims); user must acknowledge elevated risk label. |
| **allow+log** | Benign crypto tooling ads where policy trusts classification more than intervention; still log for audit. |

**Detection hints:** Typosquatting, recently registered domains with finance branding, approval phishing flows.

---

### 3.3 `predatory_credit_lending`

| Tier | Definition |
|------|------------|
| **block** | Ads for products or brokers known for APR obscuring, illegal collection threats, or explicitly threatening creative. |
| **blur** | Payday / BNPL / cash-advance promos where harm is contextual (rate bands, roll-over framing). |
| **allow+log** | Generic rate-disclosure-heavy lending ads when jurisdiction requires light touch. |

---

### 3.4 `health_misinformation_high_risk`

| Tier | Definition |
|------|------------|
| **block** | Miracle cure, vaccine conspiracy monetization, substitution for licensed care with monetized funnel. |
| **blur** | Aggressive supplement claims stopping short of automatic block confidence. |
| **allow+log** | Borderline wellness where engine confidence is low; pair with user-visible “low confidence” in exports only. |

---

### 3.5 `illegal_or_policy_commerce`

| Tier | Definition |
|------|------------|
| **block** | Default for entire category in nearly all deployments; legal and platform policy alignment takes precedence over user tier choice where required by law. |
| **blur** | Generally **not offered**; if UI forces a tri-state, treat as `block`. |
| **allow+log** | **Not recommended** except internal research builds with explicit waiver. |

---

### 3.6 `vulnerability_targeted_exploitation`

| Tier | Definition |
|------|------------|
| **block** | Ads explicitly referencing bereavement, loneliness, suicide-adjacent hooks, disability pity framing to monetize. |
| **blur** | Emotional appeals that may be legitimate charity but share exploit patterns; gate reveal. |
| **allow+log** | Only for classification rehearsal environments; production default should be `blur` minimum. |

---

### 3.7 `dark_pattern_commerce`

| Tier | Definition |
|------|------------|
| **block** | Known trap subscription brands or flows with documented regulatory action where list-backed. |
| **blur** | Free trial with opaque conversion, hard-to-cancel services promoted without clear terms in creative. |
| **allow+log** | Transparent pricing displayed in-unit; logging supports longitudinal accountability studies. |

---

## 4. Client mapping (non-blocking spike outcomes)

| Client posture | `block` | `blur` | `allow+log` |
|----------------|---------|--------|----------------|
| Browser / extension | Filter lists + DOM overlays | Obscure + delayed CTA | Full render + logs |
| DNS / VPN | NXDOMAIN or sinkhole | Treat as `block` unless paired with browser | Resolver logs / aggregates only |

---

## 5. Threat / validation notes

- Taxonomy does **not** replace legal review for regulated markets.
- Classifiers must **not** exfiltrate full page HTML by default; hashes and coarse features reduce leakage risk.
- Category **`illegal_or_policy_commerce`** must respect overrides where local law differs; static lists need jurisdiction scoped updates.

---

## 6. Change control

- **Patch:** Clarify detection hints and examples in prose only.
- **Minor:** Add sub-tags under a category (e.g. `predatory_gambling_marketing.retargeting_aggressive`) without changing parent tier tables.
- **Major:** Rename or remove category IDs — requires migration of stored user prefs and export schemas.
