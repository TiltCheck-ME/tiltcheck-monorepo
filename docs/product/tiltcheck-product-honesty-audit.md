<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-28 -->

# Product honesty audit — what TiltCheck does vs should do

**Date:** 2026-07-28  
**Branch context:** Instant Redeem Phase 4–5 + web discovery (PR #647)  
**Rule:** Public copy must match default runtime. Sandbox ≠ live money. Core extension ≠ full Pro HUD.

---

## Product truths (must stay true)

1. **TiltCheck is an audit / guardrail layer** — read-only extension, trust directory, partner APIs. Not a casino. Not a bank.
2. **Player tools stay non-custodial** — no wallet keys, no TiltCheck-held player balances.
3. **Instant Redeem is B2B orchestration** — partner cashier product; processor/operator holds float; TiltCheck quotes, gates, irrevocable settle intent, cooloff, badge.
4. **Sandbox mocks money by default** — production grant ≠ live settlement flag.
5. **Scam / critically low-trust domains stay hard-blocked** on Instant Redeem rails.

---

## Capability snapshot

| Capability | Status | Public claim should say |
| :--- | :--- | :--- |
| Extension Core (click pacing + Touch Grass) | Shipped (sideload) | Click pacing guardrail; beta sideload |
| Extension Pro / full tilt HUD | Gated / opt-in | Only if Pro enabled — do not sell as default |
| Casino trust directory | Shipped (curated + live overlay) | Proof / grades; IR badges when partners enable |
| Instant Redeem API | Sandbox shipped + Phase 5 grants | Partner API; mocked settle; live money gated |
| Instant Redeem player cashier | Not shipped | Never claim TiltCheck cashes players out |
| RGaaS partner sandbox | Shipped | Mocked responses + quota |
| Discord bot | Shipped | Accountability + handoffs, not payout rail |
| Bonuses feed | Shipped (feed-dependent) | Source/last-updated honesty |
| Ask Intel | Shipped (rules engine) | Structured lookup, not LLM chat |
| AutoVault / dashboard | Shipped (narrow brands + handoff) | Supported sites only |

---

## Overclaims fixed in this pass

| Was | Now |
| :--- | :--- |
| Homepage IR: "See who pays fast" like supply is live | Badge directory + "supply may be zero"; player CTA ≠ enable |
| "Wen payout? Now." as product pitch | Honesty bar + grant/flag-gated language |
| "Market-ready (Phase 5 scaffolding)" | "Partner-ready (API scaffolding — no live money default)" |
| Hero: watches "pacing and tilt" | "click pacing" (matches Core default) |
| Step 03: "We enforce it" absolute | Pre-commit Touch Grass / dashboard rules on supported sites |
| OperatorBlock sold like live player cashouts | Labeled sandbox API / orchestration, not payout wallet |

---

## What TiltCheck should do next (shippable)

1. Keep homepage primary story on **guardrails** (extension + trust).
2. Use Instant Redeem as **partner BD + badge supply signal**, not player cashout CTA.
3. Processor outreach Wave 1 (Gigadat / Paramount / MuchBetter).
4. Optional later: extension ambient "Instant Redeem: yes/no" badge from capabilities — **no execute**.
5. Align badges with production policy when first real partner goes live (sandbox vs production labeling).

## What to stop

- Claiming Instant Redeem is a TiltCheck cashout
- Selling Pro tilt HUD as the default install experience
- Calling eng checklist "market-ready" for players
- Building player wallet / TiltCheck float / Discord payout commands

---

## Surfaces ownership

| Surface | Owns |
| :--- | :--- |
| **web** | Discovery, trust, partner BD, honesty copy |
| **extension** | Session guardrails; optional IR badge later |
| **dashboard** | Durable rules / vault lane on supported sites |
| **discord** | Accountability handoffs |
| **API** | RGaaS + Instant Redeem orchestration |

---

Made for Degens. By Degens.
