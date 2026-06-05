© 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-01

# Intel Agent API

Public conversational intel for casino trust lookups, filtered lists, and domain scans. Responses are structured JSON blocks rendered by the web UI — not LLM-generated HTML.

## Web routes

| Route | Purpose |
|-------|---------|
| `GET /ask` | Full-page intel chat |
| `GET /ask/v/{token}` | Read-only shared list/card view (7-day TTL) |

## API routes (Next.js BFF)

Base path on `tiltcheck.me` (local route handlers; not proxied to RGaaS).

### `POST /api/intel/chat`

Send a user message; receive structured blocks.

**Request**

```json
{
  "sessionId": "uuid",
  "message": "Is roobet a scam?"
}
```

**Response**

```json
{
  "blocks": [
    { "type": "text", "content": "..." },
    { "type": "casino_card", "casino": { "...": "..." } },
    { "type": "cta", "label": "Open full audit", "href": "/casinos/roobet" }
  ],
  "dataSource": "mixed",
  "shareEligible": true,
  "rateLimit": { "remaining": 19, "resetAt": 1710000000000 }
}
```

**Rate limits**

| Tier | Limit |
|------|-------|
| Anonymous (IP) | 20 messages / hour |
| Authenticated (Discord) | 60 messages / hour |

429 body: `{ "error": "Rate limit hit...", "resetAt": number }`

### `POST /api/intel/share`

Persist a block snapshot for permalink sharing.

**Request**

```json
{
  "title": "US crypto casinos",
  "blocks": [{ "type": "casino_list", "...": "..." }]
}
```

**Response**

```json
{
  "token": "abc123",
  "href": "/ask/v/abc123",
  "expiresAt": "2026-06-08T00:00:00.000Z"
}
```

### `GET /api/intel/share?token={token}`

Fetch snapshot JSON for client use. Returns 404 when expired or missing.

## Block types

| Type | Fields |
|------|--------|
| `text` | `content`, optional `citations` |
| `casino_card` | `casino` (CasinoSummary) |
| `casino_list` | `title`, `filters`, `casinos[]` |
| `domain_scan` | `domain`, `threatLevel`, `licenseStatus` |
| `cta` | `label`, `href` |
| `login_prompt` | `reason`, optional `handoff` |

## Tiered access

| Tier | Capabilities |
|------|----------------|
| Public | lookup, list, domain check, methodology |
| Authenticated | above + personal handoff CTAs (dashboard) |

Personal bonus/session/vault reads return `login_prompt` when unauthenticated.

## Packages

| Package | Role |
|---------|------|
| `@tiltcheck/intel-tools` | RGaaS + casino.json tool implementations |
| `@tiltcheck/intel-agent` | Intent router + block builder |

## Data sources

Grades and lists use curated `apps/web/src/data/casinos.json` overlaid with `GET /rgaas/casino-scores` when live. Domain scans call `/rgaas/domain-check` and `/rgaas/license-check`.

## Legal copy

All `/ask` and share views include: **Not financial advice. Not a legal ruling.**

Site footer: **Made for Degens. By Degens.**
