<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-28 -->

# Operator Instant Redeem (Phase 4)

Wen payout? Now. Operators sell the exit lane. Players stop waiting on soon™.

## Product thesis

Instant Redeem is a **white-label, operator-sanctioned liquidity desk** — not a pirate middle wallet and not a consumer bypass of casino ToS.

It is **not** a “hope operators partner” plan. Growth is built as a flywheel: player-visible badges, payment-processor partners covering many domains, trust-score FOMO, then direct operator deals. See [OPERATOR-INSTANT-REDEEM-GROWTH.md](./OPERATOR-INSTANT-REDEEM-GROWTH.md).

| Layer | Owner | Job |
| :--- | :--- | :--- |
| Cashier UX | Operator | Player taps Instant Redeem inside the licensed brand |
| Quote + fee | TiltCheck API | Price the cost of not waiting the standard redeem window |
| Float / settlement | Operator **or processor** contract | Funded desk; TiltCheck orchestrates |
| RG gates | RGaaS | Velocity, tilt, jurisdiction, self-exclusion, **post-redeem rebuy cooloff** |
| Public supply signal | Capabilities registry | `/casinos` badge + `GET /v1/redeem/capabilities` |
| Billing | Partner commercial | Fee share on successful instant redeems |

Player tooling elsewhere stays non-custodial. This B2B surface is **operator/processor-contracted liquidity**, sandbox-mocked first.

## Same-rail payment processor + rebuy cooloff

Instant Redeem is strongest when it is also the **deposit rail**. Same processor identity means a settled win redeem can arm a deposit cooloff so players cannot immediately buy back in with the cash they just exited.

| Step | Behavior |
| :--- | :--- |
| `POST /execute` settles | Arms `rebuyLock` for `playerRef` (default **24h**, sandbox override via `rebuyCooldownMinutes`) |
| `POST /deposit-check` | Returns `allowed: false` + `REBUY_COOLDOWN` while lock is active |
| `POST /deposit` | Mock deposit: `423` while locked, `201` when clear |

Blocked / pending redeems do **not** arm the cooloff. Only settled Instant Redeems do.

This is operator-contracted RG tooling — not a pirate middle wallet. Real money transmitter / PCI / licensing work stays out of sandbox.

---

## Casino trust boost

Operators that enable Instant Redeem earn a **+5 `financialPayouts`** bump (same magnitude as the `<2h` withdrawal vault boost). Overall score reweights with the Five Pillars (40% financial).

Enable via:

```bash
curl -X POST "https://api.tiltcheck.me/v1/redeem/enable" \
  -H "Content-Type: application/json" \
  -H "X-Requested-With: TiltCheckPartner" \
  -H "X-TiltCheck-App-Id: sandbox_your_app" \
  -H "X-TiltCheck-Secret-Key: sk_sandbox_..." \
  --data '{}'
```

Uses `partner.casino_domain` by default (or pass `casinoName`). Publishes `trust.casino.feature.enabled`. Idempotent per casino — no double-dipping the heater.

Sandbox activations are tagged in score history. Mock quote/execute alone does **not** write trust; enablement does.

---

## Scope of this ship

**In:**

- Product / API contract
- Sandbox `POST /v1/redeem/quote` and `POST /v1/redeem/execute`
- Sandbox `GET /v1/redeem/:redeemId`
- Sandbox `POST /v1/redeem/enable` (casino trust boost)
- Sandbox `POST /v1/redeem/deposit-check` + `POST /v1/redeem/deposit` (same-rail rebuy cooloff)
- Durable capability registry + public `GET /v1/redeem/capabilities`
- Processor multi-domain enable (`partnerType: processor`, `coveredDomains[]`)
- Player-facing Instant Redeem badge on `/casinos`
- Growth architecture doc
- Partner auth (`X-TiltCheck-App-Id` / `X-TiltCheck-Secret-Key`)
- Mock RG gate decisions
- Operator portal + docs pointers

**Out (later phases):**

- Real float ledger and bank rails
- Production money movement
- Operator float funding UI
- Live fee settlement / invoices
- White-label iframe SDK packaging

## Fee model (sandbox default)

Default instant fee: **150 bps (1.5%)** of gross redeem amount, floor **$0.50**.

Copy energy for cashier copy: the fee is the cost of not waiting soon™. Standard redeem stays free-and-slow; Instant Redeem is paid-and-now.

## Auth

Same partner headers as RGaaS sandbox:

| Header | Required |
| :--- | :--- |
| `X-TiltCheck-App-Id` | Yes |
| `X-TiltCheck-Secret-Key` | Yes |
| `X-Requested-With` | Yes on POST (CSRF custom-header pattern) |

Sandbox-only in this phase. Production credentials receive `403` with `REDEEM_SANDBOX_ONLY`.

## Endpoints

Base: `https://api.tiltcheck.me/v1/redeem`

### `POST /quote`

Request:

```json
{
  "playerRef": "player_abc",
  "amount": 100.0,
  "currency": "USD",
  "destination": {
    "rail": "ach",
    "accountRef": "acct_masked_****1234"
  },
  "jurisdiction": "CA"
}
```

Response (shape):

```json
{
  "success": true,
  "mode": "sandbox",
  "quoteId": "qr_...",
  "expiresAt": "2026-07-28T12:05:00.000Z",
  "amountGross": 100,
  "currency": "USD",
  "feeBps": 150,
  "feeFloor": 0.5,
  "feeAmount": 1.5,
  "amountNet": 98.5,
  "etaSeconds": 60,
  "rg": {
    "allowed": true,
    "riskBand": "low",
    "gates": [],
    "intervention": null
  },
  "note": "Sandbox quote only. No funds moved."
}
```

### `POST /execute`

Request:

```json
{
  "quoteId": "qr_...",
  "playerRef": "player_abc",
  "idempotencyKey": "idem_operator_batch_1"
}
```

Response (shape):

```json
{
  "success": true,
  "mode": "sandbox",
  "redeemId": "rd_...",
  "status": "settled",
  "amountGross": 100,
  "feeAmount": 1.5,
  "amountNet": 98.5,
  "currency": "USD",
  "settledAt": "2026-07-28T12:01:00.000Z",
  "rg": { "allowed": true, "riskBand": "low", "gates": [] },
  "note": "Sandbox settle only. No funds moved."
}
```

Statuses: `settled` | `pending` | `blocked` | `expired`.

### `GET /:redeemId`

Returns the stored sandbox redeem record for the authenticated partner.

## RG gate rules (sandbox mocks)

| Signal | Behavior |
| :--- | :--- |
| `playerRef` contains `selfex` | Block (`SELF_EXCLUSION`) |
| `playerRef` contains `tilt` | Block (`TILT_VELOCITY`) |
| `amount` >= `5000` | Soft review → `pending` on execute |
| Missing / invalid destination | `400` validation error |

Production will call live RGaaS decisioning; sandbox keeps these deterministic so operators can write integration tests without flaking.

## Threat / validation notes

- Partner secret comparison stays server-side; secrets are never returned from redeem routes
- Amounts are validated as finite positive numbers with a hard ceiling (`100000`) in sandbox
- Quotes expire after 5 minutes; expired quotes cannot execute
- Idempotency keys dedupe execute calls per partner
- No real bank / crypto rail calls in sandbox

## Rollback

If Instant Redeem regresses:

1. Unmount `/v1/redeem` in the API gateway (or return `503` from the router)
2. Remove Instant Redeem CTA from `/operators` and `/operators/instant-redeem`
3. RGaaS sandbox (`/partner/*`) stays independent and unaffected

## Commercial contact

`partners@tiltcheck.me` — float terms, fee share, and production promotion stay human-gated.
