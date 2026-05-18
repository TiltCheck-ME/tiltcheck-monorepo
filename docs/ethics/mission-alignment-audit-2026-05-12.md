# TiltCheck mission and ethics alignment audit

© 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-12

## Purpose

This document evaluates how well the TiltCheck monorepo (code, product surfaces, and selected docs) aligns with an **ethical mission** framed as:

- **Honest limits:** Say what the product can and cannot control (casino session vs operator servers vs chain).
- **User agency with friction:** Help users pre-commit and cool down without trickery or false rescue.
- **Non-custodial boundary:** Avoid presenting TiltCheck as holding user funds or keys unless that is literally true for a given flow.
- **Harm reduction posture:** Reduce tilt-driven damage; signpost real help; avoid monetizing desperation invisibly.
- **Data and power:** Consent for sensitive sharing; guardian and admin powers are explicit and revocable where possible.

This is **not** legal advice, regulatory certification, or a line-by-line review of every file. It is a **risk-based audit** of representative patterns and high-impact surfaces.

---

## Methodology

- Keyword and concept scans across `apps/`, `modules/`, `packages/`, and `docs/tiltcheck/`.
- Targeted reads of vault routes, LockVault UI, onboarding/legal paths, tipping credits, and public marketing copy.
- Comparison of **stated principles** (web legal copy, onboarding, READMEs) vs **implementation language** (e.g. “custodial credits,” “advisory only”).

---

## Executive summary

**Strong alignment**

- Public web repeatedly states **non-casino, non-bank, not financial advice**, and surfaces **NCPG / 1-800-GAMBLER** style resources on Touch Grass, onboarding, landing, limits, microgrant, and Discord recovery flows.
- **LockVault** UI distinguishes **non-custodial** positioning and labels vault locks as **advisory only** where shown, which is ethically conservative if enforcement is client-side or operator-dependent.
- **Timer-only wallet lock** (server policy) is documented as **not** on-chain immutability — good honesty relative to RipGuard-class products.
- Internal competitive positioning doc explicitly warns against **blurring** casino-session tools with on-chain locks.

**Material tension (must resolve for mission integrity)**

- **JustTheTip / credits:** Implementation and at least one ecosystem doc describe **custodial credits** and a **custodial bot-wallet liquidity** model, while many surfaces still market **non-custodial** as a blanket brand property. That is the single largest **truth-in-labeling** risk in the repo.

**Moderate risks**

- **`complianceBypass` / consent flags** in onboarding and API: powerful for product testing; ethically dangerous if it can weaken real user protections in production without extreme guardrails, audit logging, and role restriction.
- **Early-unlock economics:** Paid early unlock with configurable fee and pool splits can be ethical if **pre-disclosed** and not framed as punishment; ensure every surface that offers exit shows **fee mechanics before commitment** (Hub already partially does; Discord paths need parity).
- **Automation (AutoVault / userscripts):** Ethically fine when **opt-in, visible, and stoppable**; risk rises if defaults automate withdrawals without a clear consent moment per surface.

**Lower risks (watch)**

- **Degen tone:** Can support community honesty; must not **shame** people in crisis or mock help-seeking. Most RG-adjacent pages stay blunt but humane — spot-check new copy on money-loss flows.
- **Trust scores and AI:** Any score or model that influences **social standing or access** needs transparency, contestability, and human escalation — not audited deeply in this pass.

---

## Findings by theme

### 1. Truth in labeling (custody and “non-custodial”)

| Severity | Finding | Evidence / location | Mission impact |
|----------|---------|---------------------|----------------|
| **Critical** | **Split narrative: “non-custodial” brand vs custodial JTT credits path** | `modules/justthetip/src/credits.ts` documents “Custodial balances”; `docs/tiltcheck/4-tools-overview.md` states JustTheTip “centralizes liquidity in a custodial bot-wallet.” Elsewhere: onboarding (“No custodial control. Ever.”), many READMEs and web copy assert non-custodial flows. | Users and partners cannot derive a single true custody model from public materials. That erodes trust faster than a missing feature. |
| **Medium** | **LockVault “advisory only”** is ethically correct if enforcement is not overstated — but must stay consistent across Discord, extension, and dashboard. | `apps/web/src/components/LockVault.tsx` footer copy. | If any surface implies TiltCheck **enforces** casino withdrawals without operator cooperation, mission misalignment. |
| **Low** | **RipGuard / on-chain comparisons** handled well in internal competitive doc; keep that discipline in user-facing vault marketing. | `docs/competitive/stake-cruncher-stake-stats-tiltcheck-positioning.md` | Reduces “fake hardness” claims. |

**Recommendation**

1. Publish a **single custody matrix** (user-facing): per flow (JTT direct tip vs credits vs LockVault timer vs AutoVault) state **who signs, who stores, who can reverse, what happens if TiltCheck is down**.
2. Either **reconcile** JTT credits language with reality (rename to “pooled relay credits” with explicit disclosures) or **narrow** marketing claims so “non-custodial” applies only where true.

---

### 2. Harm reduction and crisis posture

| Severity | Finding | Evidence | Mission impact |
|----------|---------|----------|----------------|
| **Low (positive)** | Multiple surfaces link **national helplines** and Touch Grass as an emergency exit. | `apps/web/src/app/touch-grass/page.tsx`, `apps/web/src/app/page.tsx`, `apps/web/src/app/onboarding/page.tsx`, `apps/discord-bot/src/commands/recover.ts`, `packages/shared/src/legal.ts` | Aligns with “sharp friend who gives a damn” without blocking professional help. |
| **Medium** | **Self-exclusion language** must stay precise: TiltCheck can block **injected / owned surfaces**, not operator accounts. | Geo laws page references GAMSTOP (good as education). | Mislabeling “self-excluded from Stake” would be ethically worse than a narrower “TiltCheck pause.” |
| **Medium** | **Microgrant / recovery** flows mix hope and guardrails — rejection messages re-link helpline (good). Keep **approval criteria** transparent to avoid perceived predatory tease. | `apps/discord-bot/src/commands/recover.ts` | Power imbalance if users share trauma for uncertain payouts. |

---

### 3. Fees, friction, and “pain pricing”

| Severity | Finding | Evidence | Mission impact |
|----------|---------|----------|----------------|
| **Medium** | **Paid early unlock** takes a percentage of vault balance and routes splits to trivia/microgrant/dev per env — can be ethical **if disclosed before lock** and not optimized to maximize breakage. | `modules/lockvault/src/vault-manager.ts` (`computeEarlyUnlockFeeSplit`, `requestPaidWalletUnlock`); `apps/api/src/services/community-pools.ts` | Monetizing distress is a reputational and moral hazard. Disclosure and caps matter more than the percentage number. |
| **Low (positive)** | **Timer-only wallet lock** removes early-exit paths when chosen — aligns with informed pre-commitment when copy is clear. | `modules/lockvault/src/vault-manager.ts`, `apps/web/src/components/LockVault.tsx` | Good match for “protect past-you” **if** users understand server vs chain limits. |

**Recommendation**

- Add a **pre-lock modal** (or equivalent) listing **exact fee formula and destinations** for any paid exit path, not only post-lock UI.
- Publish a **fee ethics policy** (short): no surprise fees, no dark patterns to trigger early exit, optional “cooling off” before fee-bearing exit confirms.

---

### 4. Data, consent, and power (guardians, admins, bypass)

| Severity | Finding | Evidence | Mission impact |
|----------|---------|----------|----------------|
| **Medium** | **`complianceBypass` and granular `dataSharing`** allow strong consent modeling — or over-collection if abused. | `apps/api/src/routes/me.ts`, `apps/api/src/routes/user.ts` | Ethically fine for **test roles**; production needs **hard gates**, audit logs, and “why we would ever enable this” documentation. |
| **Medium** | **Admin wallet unlock approval** is a necessary break-glass for some models; ethically risky if routine or invisible to the user. | `apps/api/src/routes/vault.ts`, `modules/lockvault/src/vault-manager.ts` | Must be rare, logged, and user-visible when used; timer-only mode correctly removes this path when user chooses. |
| **Low** | **Guardian flows** (LockVault docs) can help coercion-sensitive design if documented; can hurt if guardians are not user-chosen or revocable. | `docs/tiltcheck/17-lockvault.md` | Power must be legible. |

---

### 5. Automation and user control (AutoVault, userscripts, extension)

| Severity | Finding | Evidence | Mission impact |
|----------|---------|----------|----------------|
| **Medium** | Userscripts automate casino-side actions using **the user’s session** — ethically aligned if framed as **user-controlled automation**, not TiltCheck acting as agent of the house. | `apps/web/public/userscripts/tiltcheck-autovault.user.js` (non-custodial language; session cookie pass-through comments) | Risk: silent automation on shared devices; mitigate with visible HUD and kill switch (mobile wrapper direction supports this). |
| **Low** | AutoVault web page explains vault API vs DOM nudge — good transparency. | `apps/web/src/app/tools/auto-vault/page.tsx` | Keep parity with extension behavior descriptions. |

---

### 6. Tone, community, and vulnerability

| Severity | Finding | Evidence | Mission impact |
|----------|---------|----------|----------------|
| **Low** | Brand voice is **degen-forward**; most RG-critical paths keep help links literal. | Various `apps/web` pages vs `apps/web/src/app/getting-started/page.tsx` (“No Magic… math favors the house”) | Good balance when crisis pages stay non-ironic. |
| **Watch** | NLP / “tilt agent” copy can nudge behavior — audit prompts periodically so they do not **mock** users in acute loss. | `apps/discord-bot/src/services/tilt-agent.ts` (example: `/lockvault` suggestion) | Helpful nudge vs pile-on is a fine line. |

---

## Positive patterns to preserve

- **Helpline and Touch Grass** as first-class routes, not buried footnotes.
- **“Not a miracle”** positioning on About — sets expectations ethically.
- **Honest competitive analysis** internal doc — models the kind of clarity users deserve externally.
- **Timer-only lock** explicit “server-enforced; not smart-contract” copy — template for other features.

---

## Prioritized recommendations

1. **P0 — Resolve the non-custodial / JTT credits narrative** with a published custody matrix and doc/code alignment (`docs/tiltcheck/4-tools-overview.md` vs `modules/justthetip/src/credits.ts` vs marketing).
2. **P1 — Fee disclosure standard** for any early exit that takes a cut; one UX pattern reused on Hub, Discord, and API error payloads.
3. **P1 — Production policy for `complianceBypass`**: who can set it, logging, and whether it should exist outside non-prod environments.
4. **P2 — Guardian / admin power manifest**: user-visible audit trail when admin or guardian actions move money or end locks.
5. **P2 — “Session pause” naming** for any client-enforced casino block — avoid false “self-exclusion” claims unless operator-integrated.

---

## Out of scope for this audit

- Full legal review per jurisdiction.
- Complete AI prompt inventory and trust-score algorithm audit.
- Third-party casino terms compliance.
- On-chain program security (not present as a shipped TiltCheck program in this pass).

---

## Conclusion

TiltCheck’s **stated mission** (honest guardrails, harm reduction signals, non-casino positioning) is **well supported on the web and Discord crisis surfaces**. The **largest ethical gap** is **inconsistent custody truth** between **JustTheTip credits / bot-wallet documentation** and the **ecosystem’s non-custodial brand**. Fixing that alignment is the highest-leverage ethical upgrade: it makes every other feature more trustworthy by default.

The second lever is **economic transparency** on any **early-exit fee** path, so friction helps users without reading as **extraction**.

Everything else is refinement: tighten language on self-exclusion, keep timer-only honesty as the standard, and treat guardian and admin powers as **visible social contracts**, not background magic.
