© 2024–2025 TiltCheck Ecosystem (Created by jmenichole). All Rights Reserved.

# 12. API Specifications
This document defines the API structure for the entire TiltCheck ecosystem.  
APIs are intentionally simple, serverless-friendly, and optimized for Cloudflare Workers, Supabase Edge Functions, or lightweight serverless runtimes.

Modules never call each other directly — they communicate through the Event Router.

---

# 12.1 API Philosophy

- Prefer **REST** for simplicity  
- Keep endpoints **minimal**  
- Avoid complex auth flows  
- Use **Discord signatures** for verification  
- Use **HMAC** or **API keys** for internal endpoints  
- Response always includes: `status`, `data`, `error`  

---

# 12.2 Authentication Model

### For Discord → TiltCheck:
- Discord interaction signatures validate authenticity.

### For Internal Modules:
- Use `X-TiltCheck-Key` (simple secret header)

### For External Providers:
- Magic.link for non-custodial wallets  
- Jupiter for swap execution  
- Public domain APIs for SusLink lookups  

---

# 12.3 Routes Overview

/api/tip
/api/airdrop
/api/swap
/api/wallet
/api/scan
/api/promo
/api/bonus
/api/predict
/api/trust/casino
/api/trust/degen
/api/surveys
/api/funding

Below are full definitions.

---

# 12.4 JustTheTip API

## POST `/api/tip`
Send a tip.

### Request:
```json
{
  "from_user": "123",
  "to_user": "456",
  "amount": 1.0,
  "token": "SOL"
}
Response:
{
  "status": "ok",
  "fee": 0.07,
  "tx": "signature_here"
}
POST /api/airdrop
Mass send.
Request:

{
  "from_user": "123",
  "users": ["456","789","222"],
  "amount": 0.5,
  "token": "SOL"
}
POST /api/swap
Perform Jupiter swap after fee deduction.
Request:

{
  "user_id": "123",
  "from_token": "SOL",
  "to_token": "USDC",
  "amount": 0.25
}
12.5 Wallet API
GET /api/wallet/:discord_id
Retrieve wallet mapping.
Response:

{
  "wallet": "SoL...xyz"
}
POST /api/wallet
Bind a wallet.
12.6 SusLink API
POST /api/scan
Scan URL for risk.
Request:

{
  "url": "https://example.com/free-spins"
}
Response:
{
  "risk": "suspicious",
  "explanation": "newly registered domain"
}
12.7 FreeSpinScan API
POST /api/promo/submit
Submit promo.
Request:

{
  "url": "...",
  "user_id": "123",
  "bonus_type": "free_spins",
  "notes": "10 spins on chaos crew"
}
POST /api/promo/approve
Approve.
12.8 CollectClock API
GET /api/bonus/:casino
Return recent bonus values.
POST /api/bonus
User-submitted bonus.
Request:

{
  "casino": "stake",
  "user_id": "123",
  "amount": 1.00,
  "nerfed": false
}
GET /api/predict/:casino
Return predicted next drop window.
12.9 Trust Engine APIs
POST /api/trust/casino
Submit casino event.
Request:

{
  "casino": "stake",
  "event": "nerf",
  "severity": 3
}
POST /api/trust/degen
Submit user trust event.
Request:

{
  "user_id": "123",
  "event": "rage_spam",
  "delta": -5
}
12.10 QualifyFirst API
GET /api/surveys
List survey matches.
Response:

{
  "matches": [
    { "id": 1, "payout": 1.25, "match": 0.82 }
  ]
}
POST /api/surveys/traits
Update profile traits.
12.11 Tilt Engine API
POST /api/tilt/signal
Submit indicator.
POST /api/tilt/cooldown
Trigger cooldown.

12.12 

Funding Intelligence API
GET /api/funding/opportunities
Return matched grants + hackathons.
POST /api/funding/update
Record application status.
12.13 Webhook Endpoints (Optional)
/webhook/jupiter
/webhook/magic
/webhook/promos
/webhook/trust
Used for:
swap confirmations
wallet bindings
new promo detection
trust update streaming


End of 12-apis.md