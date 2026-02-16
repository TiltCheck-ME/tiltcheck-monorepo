# TiltCheck Trust Dashboard Service (Draft)

Lightweight Express + SSE service exposing real-time trust metrics (domain, casino, degen) and rollup snapshots.

## Endpoints
- `GET /` static dashboard HTML (served from `public/index.html`)
- `GET /events` (SSE): live stream of trust events (init snapshot + incremental updates)
- `GET /api/rollups/latest` latest aggregate batch from `data/trust-rollups.json`
- `GET /api/domains` domain score snapshot from `data/domain-trust-scores.json`
- `GET /api/degens` user/degen trust scores if snapshot exists
- `GET /api/health` snapshot age, throttled count, buffer size, retentionDays
- `GET /api/config` configuration details (pollIntervalMs, retentionDays, throttleWindowMs, snapshotDir)
- `GET /api/severity` current severity bucket counts
- `GET /api/alerts` current risk alerts list
- `POST /api/request-snapshot` publish `trust.state.requested` event (subject to upstream throttle)

## Development
```bash
pnpm install
pnpm --filter @tiltcheck/dashboard dev
```
Server listens on `PORT` (default 5055).

## Notes
- Poll interval configurable via `DASHBOARD_POLL_MS` (default 30s)
- Event retention for daily logs configurable via `DASHBOARD_EVENTS_KEEP_DAYS` (default 7)
- Discord webhook alerts configurable via `DISCORD_WEBHOOK_URL` (optional)
- Throttle heuristic increments when snapshot requested inside 5s window since last snapshot
- Event buffer limited to last 500 trust events

## Next Steps
- Enhance alert de-duplication with rollup window reset logic
- Improve throttled detection using explicit response correlation
- Add severity distribution chart (Chart.js) and sparklines for movers
- Persist event buffer daily for historical analysis (implemented: daily rotation with pruning)
