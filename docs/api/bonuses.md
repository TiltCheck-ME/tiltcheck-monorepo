<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-18 -->

# Bonuses API

Daily promo tracker endpoints for free spins, daily logins, and codes on priority Sweeps casinos. Primary product surface: `tiltcheck.me/bonuses`.

Ops runbook: [docs/ops/DAILY-PROMOS.md](../ops/DAILY-PROMOS.md)

## `GET /bonuses/daily-feed`

Unified feed: `daily-promos.live` + email inbox + CollectClock (+ local `data/bonus-data.json` fallback when CollectClock is empty).

### Query

| Param | Type | Notes |
|-------|------|-------|
| `bonusType` | string | Optional. `free_spins`, `daily_login`, `code`, `deposit_match`, `other`, or `all` |

### Response

```json
{
  "updatedAt": "2026-07-18T12:00:00.000Z",
  "total": 2,
  "data": [
    {
      "id": "promo-id",
      "brand": "Pulsz",
      "bonus": "10 free spins",
      "url": "https://www.pulsz.com/",
      "verified": "2026-07-18",
      "code": null,
      "sources": ["daily-promos", "email-inbox"],
      "bonusType": "free_spins",
      "bonusValue": null,
      "expiresAt": null,
      "expiryMessage": null,
      "imageUrl": null,
      "slug": "pulsz",
      "stale": false
    }
  ],
  "sources": [
    {
      "key": "daily-promos",
      "label": "Daily promos (live)",
      "available": true,
      "count": 1,
      "updatedAt": "2026-07-18",
      "detail": "1 rows"
    }
  ],
  "suppression": {
    "active": false,
    "hiddenCount": 0
  }
}
```

### Notes

- CORS: `Access-Control-Allow-Origin: *`
- Auth optional (`optionalAuthMiddleware`); exclusion profile can suppress rows
- Public-page scrape proposals are **not** in this feed until promoted to live
- Expired / >14d unverified live rows are omitted by the store filter
- 7–14d unverified rows may appear with `stale: true`

## Related routes

| Route | Role |
|-------|------|
| `GET /bonuses/inbox` | Raw email inbox bonus entries |
| `GET /bonuses/trust/:casinoName` | Trust stub for casino name |

## Ops ingest

```bash
pnpm ops:promos:gather
pnpm ops:promos:gather -- --scrape
pnpm ops:promos:promote -- --list
```
