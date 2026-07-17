# Dashboard Enhancements (Experimental & Classic)

Date: 2025-11-20

## Overview
This document captures recent improvements to the TiltCheck dashboard layer: experimental trust view, legal rights & evidence API stubs, accessibility updates, gauge configuration abstraction, persistence for evidence packages, and contrast adjustments.

## Changes Implemented

### 1. Experimental Trust View (`services/dashboard/public/experimental.html`)
- Added new page with: summary bar, fairness gauges, payout timeline, anomaly map, evidence export form.
- Accessibility: semantic landmarks (`header`, `nav`, `main`, `section` with `role="region"` + `aria-labelledby`), `aria-live` for anomaly updates, focus outline injection.
- Evidence export form: downloads client-side JSON from `/api/evidence/package` aggregation.

### 2. Classic Dashboard Link (`services/dashboard/public/index.html`)
- Added inline link promoting Experimental Trust View.
- Introduced `GAUGE_CONFIG` object (refresh interval and formula tuning constants).

### 3. Gauge Formula Configuration
- Centralized tunable parameters (`volatilityInvertMax`, `midSeverityPenalty`, `highSeverityPenalty`, `refreshMs`) in `GAUGE_CONFIG`.
- Externalized to JSON: `services/dashboard/public/config/gauge-config.json` fetched at runtime (falls back to defaults if unavailable).
- Front-end starts gauge refresh interval only after config load; page reload required to apply new `refreshMs` currently.

### 4. Legal Rights Evaluation Stub (`/api/legal-rights/evaluate`)
- Returns mock triggers derived from casino rollup deltas, low score, existing risk alerts, region placeholders (CA, EU).
- Disclaimer included; non-advisory transparency signal.

### 5. Evidence Package Aggregation & Pruning (`/api/evidence/package`)
- GET variant (existing) provides transient snapshot bundling alerts + severity + legal triggers.
- POST `/api/evidence/package` persists a package with generated `id` under `data/evidence-packages/`.
- Listing endpoint: `GET /api/evidence/packages` returns IDs (now includes retention metadata).
- Retrieval endpoint: `GET /api/evidence/package/:id` serves stored JSON.
- Pruning: automatic age & count pruning after each persist and during listing.
	- Env `EVIDENCE_RETENTION_DAYS` (default 14) controls age-based deletion.
	- Env `EVIDENCE_MAX_COUNT` (default 150) ensures storage ceiling (oldest removed first).

### 6. Accessibility & Contrast
- Muted text variable `--color-text-muted` updated from `#888` to `#9aa` for improved contrast against dark background.
- Added focus-visible outline style in experimental page for keyboard navigation clarity.

### 7. Evidence Export Integration
- Form allows region & optional casino filter.
- Generates downloadable JSON transparency artifact including: alerts, severity buckets, rollup slice, legal rights triggers, advisory.
- Future extension: Add server-side artifact creation directly from front-end with persistent ID returned (POST now available).

## Endpoints Summary
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/legal-rights/evaluate` | GET | Stub legal rights heuristic triggers |
| `/api/evidence/package` | GET | Transient evidence aggregation (no persistence) |
| `/api/evidence/package` | POST | Persist evidence snapshot (returns `id`) |
| `/api/evidence/packages` | GET | List persisted package IDs |
| `/api/evidence/package/:id` | GET | Retrieve specific persisted package |
| `/api/config/gauges` | GET (planned) | (Planned) Serve current gauge config JSON |
| `/api/config/gauges` | PATCH (planned) | (Planned) Mutate & persist allowed gauge parameters |
| `/api/evidence/package/:id.csv` | GET | CSV export of a persisted evidence package |
| `/api/evidence/package.csv` | GET | CSV transient evidence aggregation (query filters) |

## Follow-Up Opportunities
- Front-end gauge admin panel now supports live PATCH; consider adding auth UX (token currently via `GAUGE_ADMIN_TOKEN` header `x-admin-token`).
- Add severity trend mini-sparklines to experimental summary bar.
- Extend legal rights badge system with per-trigger detail tooltip & historical count trend.
- Multi-format export: add NDJSON stream endpoint for bulk evidence.
- Evidence storage monitoring: surface disk usage & prune by size threshold.
- Add severity trend mini-sparklines to experimental summary bar.
- Integrate legal rights triggers visual badges in anomaly map panel.
- Provide CSV export option for evidence data alongside JSON.
- Automated deletion / pruning for evidence packages older than retention period.

## Notes
- All stubs intentionally heuristic; replace with rule engine later.
- Persistence currently synchronous writes; consider batching or queue for high-frequency requests.
- Contrast changes limited to muted text; full WCAG audit pending.
- Gauge PATCH endpoint gated by optional `GAUGE_ADMIN_TOKEN`; if set, clients must send `x-admin-token` header.
- CSV exports flatten structured arrays (alerts, triggers) into row-wise key/value pairs for simplicity.

## Author
GitHub Copilot (TiltCheck Development Agent)
