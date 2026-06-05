# Bonuses API (email inbox + CollectClock)

Public read endpoints for marketing bonuses. Ingest remains on `POST /rgaas/email-ingest` (crawler + manual).

## Email ingest fields (persisted)

Each inbox bonus (`source: email-inbox`) is stored in `data/email-bonus-feed.json` (override with `EMAIL_BONUS_FEED_PATH`):

| Field | Description |
|-------|-------------|
| `id` | Stable hash from brand, URL, signal, code |
| `brand` | Casino display name |
| `bonus` | Offer title / description |
| `url` | Best claim link from email |
| `bonusType` | e.g. Match, Free spins |
| `bonusValue` | Parsed amount or raw snippet |
| `terms` | Combined terms snippet |
| `expiryMessage` | Human expiry text from email |
| `expiresAt` | ISO timestamp when parseable |
| `code` | Promo code if found |
| `senderDomain` | From-domain |
| `discoveredAt` / `updatedAt` | Timestamps |

## GET /bonuses

**CollectClock (default)** — proxies [CollectClock bonus-data.json](https://raw.githubusercontent.com/TiltCheck-ME/CollectClock/main/bonus-data.json), 1h cache.

Query: optional `discordId` + `x-internal-secret` for exclusion-aware CollectClock list.

**Inbox feed** — `?source=inbox`

| Query | Default | Description |
|-------|---------|-------------|
| `source` | _(omit)_ | Set to `inbox` for email-sourced offers |
| `limit` | `50` | Max `100` |
| `sort` | `urgency` | `urgency` (expiring soon first) or `verified` (newest verified) |

Response (`source=inbox`):

```json
{
  "source": "email-inbox",
  "available": true,
  "updatedAt": "2026-05-27T12:00:00.000Z",
  "total": 12,
  "limit": 50,
  "sort": "urgency",
  "data": [
    {
      "id": "mcluck-…",
      "casinoName": "McLuck",
      "offerTitle": "100% match bonus up to $500",
      "brand": "McLuck",
      "bonus": "100% match bonus up to $500",
      "url": "https://mcluck.com/promos/claim",
      "expiresAt": "2026-05-29T23:59:59.999Z",
      "expiryMessage": "expires in 2 days",
      "expiresSoon": true,
      "urgent": false,
      "urgencyRank": 512000,
      "bonusType": "Match",
      "code": "DROP500",
      "source": "email-inbox"
    }
  ],
  "suppression": { "active": false, "hiddenCount": 0 }
}
```

Presentation fields on each item:

- `casinoName` — alias of `brand`
- `offerTitle` — alias of `bonus`
- `expiresSoon` — expires within 48h (or “today” wording)
- `urgent` — within 24h or strong urgency copy
- `urgencyRank` — internal sort key (higher = show first)

## GET /bonuses/inbox

Same payload shape as `GET /bonuses?source=inbox`. Supports `limit` and `sort`.

## GET /rgaas/bonus-feed

RGaaS alias for inbox list (`bonuses` array, same enrichment when `sort` / `limit` query params are passed).

## Crawler digest

`npx tsx scripts/email-crawler.ts --digest` writes ops digest text + optional JSON under `scripts/logs/`. Ingest uses `POST {CRAWLER_API_URL}/rgaas/email-ingest`.
