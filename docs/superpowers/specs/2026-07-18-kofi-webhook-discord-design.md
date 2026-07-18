<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-18 -->

# Ko-fi Donation Webhook + Discord Ping — Design Spec

Status: Approved (design); implementation not started  
Owner: founder (solo)  
Surface: `apps/api` webhook + Discord incoming webhook + JSONL ops log

## Problem

TiltCheck already links to Ko-fi for support. Tips arrive on Ko-fi with no first-party signal in Discord or ops logs. The founder has a Ko-fi verification token in local env and wants donations to:

1. Be recorded for ops metrics
2. Trigger a privacy-safe Discord shoutout (no tipper name or amount in chat)

Ko-fi does not offer a pull API for donation history. Webhooks are the integration surface.

## Goals

- Accept Ko-fi **donation** webhooks on the API
- Verify the payload with the server-side verification token
- Append a durable JSONL log row with full tip detail
- Post a **generic** Discord message (no name, no amount)
- Return HTTP 200 quickly so Ko-fi does not hammer retries

## Non-goals (v1)

- Membership / subscription / shop / commission event handling
- Discord roles, bot slash commands, or tip leaderboards on the website
- Exposing the donations log via a public HTTP route
- Using `NEXT_PUBLIC_*` for any Ko-fi secret
- Custodial payment rails or JustTheTip replacement

## Decisions (locked)

| Topic | Choice |
|-------|--------|
| Scope | Discord shoutout + store event |
| Discord privacy | Generic ping only — name/amount private (log only) |
| Event types | Donations / tips only |
| Architecture | API route + JSONL + Discord incoming webhook |

## Architecture

```
Ko-fi payment (Donation)
        │
        ▼
POST /webhooks/kofi  (apps/api)
  - parse form field `data` (JSON string)
  - verify verification_token === env token
  - if type !== Donation → 200 ignore (no Discord)
  - append JSONL row (full detail)
  - fetch Discord webhook (generic copy)
  - always prefer 200 after accept (Discord failure does not drop the tip)
        │
        ├── data/kofi-donations.jsonl  (ops only)
        └── Discord channel (incoming webhook)
```

Reuse the existing beta/collab pattern: `fetch(webhookUrl)` from the API — no discord-bot deploy required for v1.

## HTTP contract

### `POST /webhooks/kofi`

**Content-Type:** `application/x-www-form-urlencoded`  
**Body:** `data=<json string>` (Ko-fi standard)

**Success:** `200` with a small JSON ack (e.g. `{ "ok": true }`)  
**Unauthorized:** `401` when verification token missing/mismatch  
**Malformed body:** `400` when `data` cannot be parsed  
**Ignored non-donation:** `200` with `{ "ok": true, "ignored": true }` — no log Discord ping required; optional log of ignore is YAGNI (skip)

### Discord message (exact tone)

> Someone just fueled TiltCheck on Ko-fi. Appreciate you — Made for Degens. By Degens.

No tipper name. No amount. No message body from the tipper.

## Storage

**Default path:** `data/kofi-donations.jsonl`  
**Override:** `KOFI_DONATIONS_LOG_PATH`

**Example row fields:**

| Field | Source |
|-------|--------|
| `receivedAt` | Server ISO timestamp |
| `type` | Ko-fi type |
| `from_name` | Ko-fi |
| `amount` | Ko-fi |
| `currency` | Ko-fi |
| `message` | Ko-fi (optional) |
| `kofi_transaction_id` | Ko-fi |
| `timestamp` | Ko-fi event time |
| `is_public` | Ko-fi flag if present |

Gitignore the log file if it may contain PII in working trees; do not serve it publicly in v1.

## Environment

| Variable | Required | Role |
|----------|----------|------|
| `KOFI_API_KEY` | Yes (or alias below) | Ko-fi webhook verification token |
| `KOFI_VERIFICATION_TOKEN` | Optional alias | If set, preferred over `KOFI_API_KEY` for verify |
| `DISCORD_KOFI_WEBHOOK_URL` | Yes for Discord ping | Discord incoming webhook URL |
| `KOFI_DONATIONS_LOG_PATH` | No | JSONL path override |

Never put these in `NEXT_PUBLIC_*`. Document blanks in `.env.example`.

## Ops runbook (launch checklist)

1. Create a Discord channel incoming webhook → set `DISCORD_KOFI_WEBHOOK_URL` on API host (local `.env`, Railway, or VPS)
2. Confirm `KOFI_API_KEY` matches Ko-fi webhook verification token (rotate if previously exposed in chat)
3. In Ko-fi → Webhooks, set URL to `https://api.tiltcheck.me/webhooks/kofi` (or current public API base)
4. Send Ko-fi test donation
5. Expect: HTTP 200, new JSONL line with full detail, generic Discord message only

## Failure behavior

| Case | Behavior |
|------|----------|
| Bad/missing token | `401`, no log, no Discord |
| Non-donation type | `200` ignore, no Discord |
| Discord webhook unset or fetch fails | Still append JSONL if donation verified; return `200`; log server warning |
| Disk write fails | `500` (Ko-fi may retry — acceptable) |

## Testing

- Unit: parse `data` form body; reject bad token; accept donation → append + Discord called; non-donation ignored; Discord failure still returns ok after log
- No live Ko-fi calls in CI — fixtures only

## Risk notes

| Risk | Mitigation |
|------|------------|
| Token leaked in chat | Rotate in Ko-fi; update env only |
| Public Discord doxxing tippers | Generic copy only |
| Log file PII | Ops-only path; gitignore; no public read route |
| Webhook replay | Optional later: dedupe by `kofi_transaction_id` — not required for v1 |

## Success criteria

- Test donation produces one JSONL row with amount/name and one Discord message with neither
- Invalid token never creates a log row or Discord ping

---

Made for Degens. By Degens.
