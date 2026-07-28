<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-28 -->

# Instant Redeem Phase 5 — Production + Processor Integration

Sandbox proved the loop. Phase 5 makes Instant Redeem real without TiltCheck becoming a bank on day one.

## One-line

**Processor holds the float. TiltCheck orchestrates quote, RG gates, irrevocable settle intent, rebuy cooloff, and trust badges.**

## Custody / licensing posture (non-negotiable)

| Role | Holds player funds? | Job |
| :--- | :--- | :--- |
| **Payment processor partner** | Yes (their licensed rails / merchant book) | Float, ACH/Interac/crypto execution, PCI scope they already own |
| **Operator** | Casino balance / cashier UX | Brand surface, Instant Redeem CTA, player support |
| **TiltCheck** | No | Orchestration API, scam gate, irrevocable policy, rebuy cooloff, trust score + public badge |

TiltCheck does **not** need full money-transmitter day one if production Instant Redeem rides processor settlement. If TiltCheck later holds float, MTL/PCI land before that switch.

## Production promotion path

1. Partner completes sandbox checklist (`GET /v1/redeem/readiness`)
2. Partner calls `POST /v1/redeem/production/request` with float + rails + covered domains
3. Ops reviews contract terms (`partners@tiltcheck.me`)
4. Internal approve: `POST /v1/redeem/production/approve` (service auth)
5. Partner production credentials can hit `/v1/redeem/*` when grant status is `approved`
6. Settlement adapter calls processor webhook / API — live flag still defaults off until rail smoke passes

## Float desk contract (required fields)

```json
{
  "partnerType": "processor",
  "coveredDomains": ["alpha.casino", "beta.casino"],
  "float": {
    "holder": "processor",
    "currency": "USD",
    "softCapUsd": 50000,
    "hardCapUsd": 100000
  },
  "rails": ["ach", "interac"],
  "feeShareBps": 150,
  "rebuyCooloffHours": 24,
  "contractRef": "loi-or-msa-id"
}
```

Hard rules:

- `float.holder` must be `processor` or `operator` — never `tiltcheck` in Phase 5
- Scam gate still applies per domain
- Cancel still returns `REDEEM_IRREVOCABLE`
- Live settlement requires `INSTANT_REDEEM_LIVE_SETTLEMENT=true` **and** approved grant

## Settlement adapter

Interface lives in `apps/api/src/lib/instant-redeem-settlement.ts`:

- `sandbox` — in-memory settle (current behavior)
- `processor_stub` — production-shaped response without moving money
- `processor_live` — reserved; only when live flag is on

## API additions

| Method | Path | Auth | Purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/v1/redeem/production/request` | Partner | Submit Phase 5 production Instant Redeem request |
| `GET` | `/v1/redeem/production/status` | Partner | Grant + float desk status |
| `POST` | `/v1/redeem/production/approve` | Internal service | Approve / reject / suspend grant |
| `GET` | `/v1/redeem/readiness` | Public | Includes Phase 5 checklist items |

## Threat / risk notes

| Risk | Mitigation |
| :--- | :--- |
| Accidental live money | Live settlement flag off by default; approve != live |
| TiltCheck custody creep | Phase 5 rejects `float.holder=tiltcheck` |
| Scam processor book | Per-domain scam gate still blocks |
| Cancel theater | Irrevocable policy unchanged |
| Cap breach | Soft/hard float caps recorded on grant; live adapter must enforce |

## Rollback

1. Suspend grant (`status: suspended`)
2. Set `INSTANT_REDEEM_LIVE_SETTLEMENT=false`
3. Production partners fall back to `REDEEM_PRODUCTION_REQUIRED` / stub-only
4. Sandbox path remains intact

## Commercial contact

`partners@tiltcheck.me` — LOI, MSA, fee share, float caps, covered domain schedule.
