# Partner Integration Guide

Welcome to the TiltCheck Ecosystem. This guide provides technical instructions for developers and partners looking to integrate with TiltCheck's Responsible Gaming (RG) intelligence and Trust Engine.

## 1. Authentication

All requests to the TiltCheck Partner API must include your unique application credentials in the HTTP headers.

| Header | Description |
|---|---|
| `X-TiltCheck-App-Id` | Your unique Partner ID |
| `X-TiltCheck-Secret-Key` | Your private secret key (do not share) |

### Base URL
`https://api.tiltcheck.me/partner`

---

## 2. Webhooks (Real-Time Intelligence)

TiltCheck dispatches real-time events to your registered endpoints when critical safety or trust events occur.

### HMAC Verification
To ensure the authenticity of webhook events, TiltCheck signs every payload using your `Secret Key`.

**Verification Steps:**
1. Get the signature from the `X-TiltCheck-Signature` header.
2. Generate an HMAC-SHA256 hash of the raw JSON body using your secret key.
3. Compare the generated hash with the header signature.

```javascript
const crypto = require('crypto');
const signature = req.headers['x-tiltcheck-signature'];
const hmac = crypto.createHmac('sha256', YOUR_SECRET_KEY);
hmac.update(JSON.stringify(req.body));
const expected = hmac.digest('hex');

if (signature === expected) {
  // Payload is authentic
}
```

### Supported Events
| Event Type | Description |
|---|---|
| `safety.breathalyzer.evaluated` | Triggered when a high-risk velocity score is detected. |
| `safety.sentiment.flagged` | Triggered when a user expresses high distress (sentiment). |
| `link.flagged` | Triggered when a malicious or restricted link is scanned. |
| `trust.degen-intel.ingested` | Triggered when new community intelligence is ingested. |

---

## 3. Trust Signal Ingestion

Partners can contribute to a user's **Global Trust Score** by reporting signals from their own platforms.

### Logging a Signal
`POST /partner/trust/signal`

**Payload:**
```json
{
  "discord_id": "123456789",
  "origin_id": "your-app-id",
  "origin_type": "partner_app",
  "signal_type": "manual_review",
  "delta": -50,
  "metadata": {
    "reason": "Suspicious pattern detected in game history"
  }
}
```

---

## 4. Geo-Compliance

TiltCheck enforces automated regional restrictions on specific endpoints to comply with local gambling regulations. 

**Restricted Jurisdictions:**
By default, access is blocked for users in: **US, GB, FR, AU**.
Requests from these regions will receive a `403 Forbidden` with the code `GEO_RESTRICTED`.

---

## 5. Support & Sandbox
For sandbox access or technical support, contact the TiltCheck engineering team at `dev@tiltcheck.me`.
