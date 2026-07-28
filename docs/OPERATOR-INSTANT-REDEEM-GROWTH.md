<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-28 -->

# Instant Redeem Growth Architecture

Operators will not all line up because we asked nicely. This product has to **pull** demand and **multiply** each commercial win — or it stalls as a sandbox toy.

## Honest constraint

Casino-by-casino BD is slow: compliance review, float terms, legal, procurement. If Instant Redeem only grows when a single brand signs, it does not scale.

## Growth flywheel (build for this)

```text
Player trust directory
   shows "Instant Redeem" badge
        |
        v
Players ask "wen payout?" at cashiers without it
        |
        v
Operator FOMO / trust score gap
        |
        v
Sandbox keys + enable (free)
        |
        v
Production float contract
        |
        v
Same-rail deposit cooloff + fee share
        |
        v
More badges live on /casinos  ----+
        ^                         |
        +-------------------------+
```

Player-visible proof creates pressure. Trust score +5 for enablement makes the gap measurable. The badge makes it social.

## Scale channels (priority order)

| Channel | Why it scales | What we build |
| :--- | :--- | :--- |
| **1. Payment processor / aggregator partners** | One contract covers many casino domains | `partnerType: processor` + `coveredDomains[]` on enable |
| **2. Player demand via trust directory** | No sales call required for awareness | Public `GET /v1/redeem/capabilities` + `/casinos` badge |
| **3. RGaaS wedge upsell** | Operators already in sandbox for trust APIs | Instant Redeem lives on same keys |
| **4. Direct operator deals** | Still needed for float + brand UX | `/operators/instant-redeem` + production review |

Do not bet the company on channel 4 alone.

## Durable capability registry

Enablement is **not** an in-memory Map. Capabilities persist to `data/instant-redeem-capabilities.json` (override with `INSTANT_REDEEM_REGISTRY_PATH`).

Each record:

- `domain`
- `partnerId` / `partnerAppId`
- `partnerType`: `operator` | `processor`
- `mode`
- `enabledAt`
- `rebuyCooloffDefaultHours`
- `trustBoostApplied`

Public read: `GET /v1/redeem/capabilities` and `GET /v1/redeem/capabilities/:domain`.

## Same-rail processor thesis (why processors care)

If the Instant Redeem desk is also the deposit rail:

1. Settled win redeem arms rebuy cooloff
2. Operator (or processor) reduces tilt-driven reload churn as a **product feature**, not a lecture
3. Fee on Instant Redeem + RG differentiation beats commodity payout APIs

Processors sell this across their merchant book. That is the heater.

## Metrics that matter

| Signal | Meaning |
| :--- | :--- |
| Capability registry count | Supply of Instant Redeem live domains |
| `/casinos` badge impressions (funnel) | Demand awareness |
| `POST /v1/redeem/enable` | Operator/processor activation |
| Production access requests | Commercial pipeline |
| Settled redeem + deposit `REBUY_COOLDOWN` rate | RG loop working |

## What not to build yet

- Real money transmitter stack before processor LOIs
- Consumer pirate middle wallet
- Per-casino custom float UI before registry + badge + processor multi-domain path exist

## Rollback

Disable public capabilities route and hide `/casinos` badge if signal quality is junk. Registry file can be archived without touching RGaaS.
