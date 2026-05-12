# Stake Cruncher vs Stake Stats vs TiltCheck — competitive positioning

© 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-12

Internal reference. External competitor URLs and marketing copy are untrusted; this doc uses crawl-level structure and plausible user jobs, not endorsements.

---

## Evidence basis

Automated Playwright crawl (initial DOM `a[href]` from homepage, limited follow-up visits):

- **stakecruncher.com:** Broad same-origin route surface including `/vault`, `/tracker`, `/profit-loss`, `/bet-analyzer`, `/bonus-calculator`, `/slots-tracker` (+ `/stats`, `/verifier`), `/stake-bonuses`, `/raffle`, `/affiliate`, `/misc`, `/blog` (+ posts), `/support`, `/terms`. Home H1: “What do you want to do?” Sampled pages often shared one global document title/meta (typical SPA shell).
- **stakestats.net:** Homepage emphasizes provably fair + bet history analysis. Few static links on home (SPA); discovered `/stake/tools/bonuses` and `/stake/tools/stake-engine` with meta referencing Stake Engine scale and verification.

Re-run locally: `npx playwright install chromium` then `node scripts/explore-external-sites.mjs` from repo root.

---

## 1. Jobs-to-be-done map

### stakecruncher.com (inferred from routes)

| JTBD cluster | Example routes | TiltCheck overlap | Parity trap |
|--------------|----------------|---------------------|-------------|
| Vault / session economics | `/vault` | High if AutoVault + dashboard already cover vault-adjacent behavior | Owning “vault calculator” as the whole product story |
| Tracking / PnL | `/tracker`, `/profit-loss`, `/slots-tracker`, `/stats` | High for behavioral truth | Matching every chart and widget type |
| Forensics / analyzer | `/bet-analyzer` | Medium if tied to trust or tilt; weak if generic | Generic analyzer with no tilt or custody story |
| Bonuses / raffles | `/bonus-calculator`, `/stake-bonuses`, `/raffle` | Low for core mission | Bonus encyclopedia + raffle surface as primary identity |
| Growth / hygiene | `/affiliate`, `/blog`, `/support`, `/terms` | Blog/affiliate as SEO flywheel, not product core | TiltCheck as affiliate-first content farm |

### stakestats.net (inferred)

| JTBD cluster | Signals | TiltCheck overlap | Parity trap |
|--------------|---------|---------------------|-------------|
| Provably fair + bet history | Home copy | High for trust narrative | Owning “all PF tutorials” as main funnel |
| Stake Engine depth | `/stake/tools/stake-engine` | Low unless TiltCheck ships engine-specific product | Catalog depth arms race vs Stake’s own UI |
| Bonuses tool | `/stake/tools/bonuses` | Low unless tied to TiltCheck signals | Commodity bonus pages |

### TiltCheck-native jobs competitors do not own

Session tilt and limits, non-custodial in-session tooling (extension + injection), Discord accountability, durable cross-device settings (dashboard), trust rollup and receipts when tied to behavior — orthogonal to a public calculator matrix.

---

## 2. Positioning and acquisition

**Cruncher:** Many named routes equals classic **SEO + utility hub**. Same title/meta on many URLs weakens per-route SEO unless they fix SSR or per-route meta.

**Stats:** **Authority wedge** (PF + history + engine tooling) over raw breadth.

**Mirror for TiltCheck (structure, not scope):**

- A **small set** of stable public URLs for indexable pillars (trust explainer, flagship verifier entry, what TiltCheck does, optional one vault-adjacent landing).
- **One primary CTA** per money page: install extension, enable injection, open dashboard — not ten competing actions.

**Avoid:**

- Commodity **calculator arms race** as the main acquisition story.
- **Route-count parity** with Cruncher before the **injected behavioral loop** is the obvious retention driver.

**IA implication:** Public web **routes into** extension, dashboard, and mobile injection. It does not replace them as the canonical “brain.”

---

## 3. Surface architecture

**Consolidate:** One identity and settings source of truth (API + dashboard). One behavioral spec for vault/tilt rules (no long-term fork between userscript and extension; shared injected runtime as target).

**Multi-surface as moat:** In-session guardrails (extension, WebView injection), Discord at moment of tilt, API for trust distribution without forking product logic.

**Risk:** A giant public web hub duplicates Cruncher and dilutes non-custodial positioning unless every page reinforces custody boundaries.

---

## 4. Differentiation thesis

1. **Guardrails in the transaction path** — not only post-hoc dashboards; competitors optimize analysis and SEO breadth; TiltCheck optimizes **interruption quality** and repeat-session safety.
2. **Non-custodial + trust** — PF/history (Stats) and calculators (Cruncher) are table stakes; TiltCheck owns **what you do not hold** and **provenance of signals**.
3. **Cross-surface sync (when shipped)** — one mental model: durable settings off-session, enforcement in-session.
4. **Discord layer** — distribution and habit outside pure SEO; different from affiliate/blog flywheel unless explicitly chosen.
5. **Gaps to close:** Public IA clarity for 2–3 indexable pillars; single packaged trust entry; explicit de-duplication of userscript vs extension logic under one spec.

---

## 5. Recommendations

| Dimension | Recommendation |
|-----------|----------------|
| Primary product truth | Injected core + extension; web as narrow acquisition and trust narrative. |
| Secondary | User-dashboard for durable settings and history; Discord for reinforcement; API only where it extends trust without forking logic. |
| Do not duplicate | Full parallel AutoVault/tilt implementations; long-tail bonus/raffle surfaces unless they feed tilt or trust models. |
| Journey | First touch: one clear promise (tilt + non-custodial + trust) → install / script / dashboard → in-session proof → repeat via Discord or dashboard tied to **their** events. |
| Friction risks | Install drop-off vs no-install calculators; script maintenance; “where do I change this?” split; SPA-only marketing repeating weak SEO meta. |
| Metrics | (1) Install or injection enable → first guardrail within 24h. (2) Weekly active injected sessions vs web-only. (3) Dashboard setting edits vs conflict rate. (4) Trust page → verifier completion. (5) Discord nudge acknowledge vs mute. |

---

## 6. Risks

| Risk | Mitigation |
|------|------------|
| Parity trap | Gate roadmap: “Does this require us to be Stake Cruncher?” Default no for generic calculators. |
| Compliance / copy | Keep non-custodial and no-custody boundaries explicit; avoid implied advisory or wagering facilitation where regulated. |
| Web hub over injected core | Cap public tool routes; ship one flagship injected experience per planning cycle; measure injected activation before `/misc`-style expansion. |
| SEO shell | Per-route SSR or static meta for money pages if marketing stays SPA-heavy. |
| Trust without behavior | PF depth without tilt/limits/vault linkage makes TiltCheck a weaker Stats clone. |

---

## Bottom line

**Stake Cruncher** is breadth plus SEO utility matrix. **Stake Stats** is a narrower PF and analysis authority wedge. **TiltCheck** should use them as **IA and positioning references**, not a feature checklist. Win on **in-session behavioral infrastructure, non-custodial trust narrative, and multi-surface habit**, not on route-count parity.
