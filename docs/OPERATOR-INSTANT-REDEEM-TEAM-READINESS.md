<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-28 -->

# Instant Redeem — team onboarding and readiness

Use this to onboard BD, eng, ops, or a new pod onto Instant Redeem without tribal knowledge.

## Mission (one breath)

Ship a scalable Instant Redeem wedge: processor-first distribution, player-visible badges, scam hard-blocks, same-rail rebuy cooloff. Sandbox proves the loop. Production stays human-gated.

## Roles

| Role | Owns | First day |
| :--- | :--- | :--- |
| **BD / partnerships** | Processor LOIs, operator float intros | Read pitch one-pager; run sandbox demo; open `partners@` threads |
| **Eng** | `/v1/redeem/*`, registry, scam gate, badges | Green the readiness checklist; run vitest suite |
| **Ops / trust** | Blacklist hygiene, badge quality | Verify scam gate + capabilities suppression |
| **Product / brand** | Copy, portal, FOMO loop | Keep pitch + `/operators/instant-redeem` aligned |

## Day-one reading (in order)

1. [Pitch one-pager](./product/instant-redeem-pitch-one-pager.md) — marketable framing
2. [API / product contract](./OPERATOR-INSTANT-REDEEM.md) — endpoints + gates
3. [Growth architecture](./OPERATOR-INSTANT-REDEEM-GROWTH.md) — why processors first
4. Live readiness UI: `/operators/instant-redeem/readiness`
5. Live API: `GET /v1/redeem/readiness`

## Sandbox demo script (10 minutes)

```bash
# 1) Keys from /operators (or existing sandbox partner)
# 2) Enable
curl -X POST "$API/v1/redeem/enable" \
  -H "Content-Type: application/json" \
  -H "X-Requested-With: TiltCheckPartner" \
  -H "X-TiltCheck-App-Id: $APP_ID" \
  -H "X-TiltCheck-Secret-Key: $SECRET" \
  --data '{"partnerType":"processor","coveredDomains":["demo.casino"]}'

# 3) Quote + execute (arms rebuy cooloff)
# 4) deposit-check should return REBUY_COOLDOWN
# 5) Quote against known-scam-casino.com should 403 REDEEM_SCAM_CASINO_BLOCKED
# 6) GET /v1/redeem/capabilities should list demo.casino
# 7) /casinos should show Instant Redeem badge when domain matches
```

## Readiness checklist (pass before BD scale-up)

| ID | Check | Pass criteria |
| :--- | :--- | :--- |
| `pitch` | Marketable framing published | Pitch one-pager + portal CTAs live |
| `registry` | Durable capability registry | Enable persists across API restart |
| `public_capabilities` | Public supply signal | `GET /v1/redeem/capabilities` returns count |
| `irrevocable` | No canceled redeems | Cancel routes return `REDEEM_IRREVOCABLE` |
| `scam_gate` | Scam hard-block | Blacklist / deny pattern / low trust refuse redeem |
| `rebuy_cooloff` | Same-rail RG lock | Settled execute arms deposit cooloff |
| `trust_boost` | Casino incentive | Enable publishes trust feature event |
| `processor_multidomain` | Scale channel | `partnerType: processor` accepts coveredDomains |
| `badge_surface` | Player FOMO | `/casinos` reads capabilities |
| `production_gate` | No accidental live money | Non-sandbox partners get `REDEEM_SANDBOX_ONLY` |
| `tests` | Regression net | Redeem + scam-gate vitest suites green |

Live machine-readable status: `GET /v1/redeem/readiness`.

## Out of scope until production review

- Real float / bank rails
- Money transmitter licensing
- PCI / card acquiring
- Fee invoicing automation
- White-label iframe SDK packaging

## Escalation

- Commercial: `partners@tiltcheck.me`
- Eng incidents: follow monorepo API on-call path
- Trust blacklist updates: SusLink / RGaaS scam-domains pipeline

## Brand

No emojis. Degen tone. Footer: Made for Degens. By Degens.
