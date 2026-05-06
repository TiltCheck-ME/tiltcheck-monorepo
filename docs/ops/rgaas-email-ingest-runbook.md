# © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-06

# RGaaS email ingest runbook (`POST /rgaas/email-ingest`)

## What it does

Accepts `raw_email` (full RFC822-ish text), parses marketing signals, runs SusLink on the sender domain and a few embedded links, appends trust-signal lines, persists inbox bonuses, and publishes events. Abuse controls and failure telemetry are env-driven.

## When intake is broken

1. **Check API logs** for JSON lines prefixed with `[email-ingest]`. Events include `validation_failed`, `auth_failed`, `policy_reject`, `parse_failed`, `trust_signal_write_failed`, `bonus_publish_failed`, `rollup_publish_failed`, `processing_failed`.
2. **HTTP codes**: `400` invalid body, `401` missing secret when `EMAIL_INGEST_SECRET` is set, `403` allow/deny policy, `413` payload over `EMAIL_INGEST_MAX_BYTES`, `422` parse exception, `429` per-route rate limit, `500` unexpected post-parse failure.
3. **Sentry** (if `SENTRY_DSN` is set): exceptions from parse and post-parse paths include `route: email-ingest`.
4. **Discord / webhook alerts**: sustained parse failures hit `ALERT_RULES.EMAIL_INGEST_SUSTAINED_PARSE_FAILURES` via `triggerAlert` when failures exceed `EMAIL_INGEST_PARSE_FAILURE_ALERT_THRESHOLD` inside `EMAIL_INGEST_PARSE_FAILURE_WINDOW_MS` (in-process counter; resets on deploy).
5. **Disk / paths**: trust log (`TRUST_SIGNALS_LOG_PATH` or `data/trust-signals.jsonl`) and bonus feed (`EMAIL_BONUS_FEED_PATH` or `data/email-bonus-feed.json`) must be writable.

## Operational knobs

| Variable | Purpose |
| --- | --- |
| `EMAIL_INGEST_SECRET` | Optional; requires `Authorization: Bearer` or `X-Email-Ingest-Key`. Do not set if the public web domain verifier must call intake directly from the browser. |
| `EMAIL_INGEST_SENDER_DENYLIST` | Comma-separated domains to hard-reject. |
| `EMAIL_INGEST_SENDER_ALLOWLIST` | When non-empty, only listed sender domains pass. |
| `EMAIL_INGEST_MAX_BYTES` | UTF-8 cap on `raw_email` (default 524288). |
| `EMAIL_INGEST_RATE_LIMIT_MAX` / `EMAIL_INGEST_RATE_LIMIT_WINDOW_MS` | Per-IP cap for this route only. |
| `EMAIL_INGEST_PARSE_FAILURE_ALERT_THRESHOLD` / `EMAIL_INGEST_PARSE_FAILURE_WINDOW_MS` | Burst parse-failure alerting. |
| `DISCORD_ALERT_WEBHOOK_URL` / `ALERT_WEBHOOK_URL` | Standard alert dispatch targets from `@tiltcheck/monitoring`. |

## Rollback

Unset the `EMAIL_INGEST_*` variables you changed and redeploy the API. No schema migrations.

## Risk notes

Allowlists misconfigured block real mail. Secrets leaked in client-side JS defeat the control. The parse-failure counter is single-process; multi-instance APIs see partial counts unless you add external metrics later.
