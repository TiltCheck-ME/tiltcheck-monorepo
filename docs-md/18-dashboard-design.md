# Trust Metrics Dashboard Design (Draft)

Purpose: Provide a scrappy, real-time window into multi-dimensional trust signals (domain, casino, degen/user) with emphasis on top movers, severity distribution, and snapshot throttle health. Enables rapid detection of emerging malicious domains, unusual casino trust swings, and abuse of snapshot requests.

## Core Objectives
1. Surface Top Movers (negative domain deltas, positive/negative casino deltas).
2. Visualize Severity Distribution (last hour events bucketed by severity 1–5).
3. Expose Snapshot Throttle Status (age, next allowed, throttled count).
4. Provide Recent Degen Trust Events (social/reputation activity feed).
5. Maintain Scrappy Infra: file-based snapshots + lightweight in-memory event relay.

## Data Sources
| Source | File / Stream | Purpose |
|--------|---------------|---------|
| trust-rollup service | `data/trust-rollups.json` | Hourly aggregate deltas (domain + casino) |
| SusLink / LinkGuard | `data/domain-trust-scores.json` | Current domain scores baseline |
| JustTheTip | `data/justthetip-user-trust.json` (if present) | User (degen) trust scores |
| Event Router (in-memory) | SSE/WebSocket bridge | Live push of `trust.*.updated` events |
| Event Router (throttle responder) | `trust.state.snapshot` events | On-demand snapshot summary |

## Metrics & Widgets
### 1. Domain Movers (Table)
Columns: Rank, Domain, Δ (last hour totalDelta), Events, Last Severity Badge, Current Score.
Sorting: totalDelta ascending (most negative first). Highlight rows: severity >=4 red background tint.
Source: latest batch in `trust-rollups.json` domain -> `domains` map.

### 2. Casino Movers (Dual Tables)
Positive Movers: sort by totalDelta desc (top reinforcement). Negative Movers: sort by totalDelta asc.
Show: Casino, totalDelta, events, lastScore.

### 3. Severity Distribution (Bar / Donut)
Derive counts of event severities (1–5) from live event buffer (rolling 60 min) maintained by dashboard server.
Fallback: if buffer thin, approximate using last rollup's lastSeverity occurrences.

### 4. Snapshot Health Panel
Fields:
- Last Snapshot Received At (ISO + relative time)
- Age (seconds since)
- Throttled Requests (count since startup)
- Next Allowed Request ETA (throttle window minus elapsed)
Indicators:
- Green: age < 30s
- Yellow: 30s–120s
- Red: >120s (stale)
Data: tracked client-side by injecting timestamp when `trust.state.snapshot` arrives; increment on log line "Snapshot request throttled" (if exposed) or throttle response counter event (optional enhancement).

### 5. Live Event Ticker
Streams last N (e.g. 50) trust events across domain, casino, degen.
Format: Timestamp, Type, Entity (domain/casino/user), Δ, Severity badge, Reason.
Color: severity-based emoji (🟢🟡🟠🔴) preceding line.

### 6. Degen Trust Leaderboard
Top 15 users by score; ability to toggle between absolute score and 24h delta (requires small rolling aggregation in dashboard server – map userId -> last 24h delta).

### 7. Risk Alerts Panel (Optional Phase 2)
Criteria:
- Domain totalDelta <= -40 in current hour window.
- Casino totalDelta <= -25.
- Severity 5 event for a previously safe domain.
Displays actionable alert cards with first-seen timestamp and current score.

## Architecture Overview
```
Browser (SPA) <—(SSE/WebSocket)— Dashboard Server (Node/Express)
                                |-- Periodic file reads (every 30s) of snapshot JSONs
                                |-- Subscribes to eventRouter in-process (same monorepo run)
                                |-- Maintains in-memory buffers: events[], severityCounts, userDeltas
                                |-- Provides /api/rollups, /api/domain-scores, /api/degen-scores
```

## Implementation Plan (Incremental)
1. Server Skeleton (`services/dashboard/`): Express + SSE endpoint `/events` + JSON REST endpoints.
2. Event Bridge: import `eventRouter` and subscribe to trust events, push to SSE clients.
3. File Poller: read JSON snapshots every 30s (debounce, avoid blocking); parse to in-memory state.
4. Throttle Tracking: listen for `trust.state.snapshot` + maintain lastSnapshotTs; intercept snapshot requests triggered by UI and measure time difference if throttled message logged.
5. Frontend (Static HTML + Minimal JS): tables + simple aggregated counters; leverage CSS only initially.
6. Charts (Phase 2): add Chart.js (CDN) for severity distribution and sparkline of top domain score trajectory (pull from aggregated deltas).
7. Risk Alerts (Phase 2): evaluate domain/casino thresholds each poll and update alert list.

## API Endpoints (Initial)
- `GET /api/rollups/latest` → latest batch from `trust-rollups.json`.
- `GET /api/domains` → array of `{ domain, score }` from domain snapshot.
- `GET /api/degens` → array of `{ userId, score }` (if file exists).
- `GET /api/health` → `{ lastSnapshotTs, throttledCount, eventBufferSize }`.
- `GET /api/severity` → current severity buckets counts (derived from buffer).

## Data Structures
```ts
interface DashboardState {
  events: Array<{
    ts: number;
    type: string;
    entity: string;
    delta?: number;
    severity?: number;
    reason?: string;
  }>;
  severityBuckets: Record<number, number>; // 1..5
  lastSnapshotTs?: number;
  throttledCount: number;
  userDeltas24h: Map<string, number>; // recompute hourly prune
}
```

## Polling & Retention Policies
- Event Buffer: keep last 500 trust events; prune FIFO.
- User 24h Delta: compute on insertion; maintain map of arrays of deltas with timestamps; prune entries older than 24h hourly.
- File Poll Interval: 30s (adjustable env var `DASHBOARD_POLL_MS`).

## Severity Bucketing
Map raw `severity` (1–5) directly; unknown / missing severity counts under bucket 1 (lowest) to avoid distortions.

## Snapshot Request UX
Button "Refresh Snapshot" triggers POST `/api/request-snapshot` which internally publishes `trust.state.requested` event; disables button if snapshot age < throttle window (5s) showing countdown.

## Security & Safety
- No PII beyond user IDs (Discord IDs acceptable for internal tooling but can be hashed if needed).
- Rate-limit `/api/request-snapshot` per IP (e.g. max 12/minute) to prevent circumvention of trust-rollup throttle.
- Serve strictly over localhost or restricted VPN for internal operations.

## Minimal Dependencies
- Server: `express`, optional `cors`.
- Frontend: vanilla JS + optional `chart.js` CDN.
- No database; rely on existing JSON snapshot files and in-memory maps.

## Future Enhancements
1. Persistence of event buffer to disk (rotate daily) for historical analytics.
2. Anomaly detection (simple z-score on domain delta vs historical mean).
3. Webhook export for severity 5 domain events to external alerting (Discord channel / Slack).
4. Integrate tilt-related events (e.g. `tilt.detected`) as overlay metrics.

## Acceptance Criteria (MVP)
- Page loads and displays domain movers, casino movers using latest rollup file.
- Live events append to ticker within <1s of publication.
- Severity distribution chart updates in real-time.
- Snapshot health indicator reflects age and throttle state accurately.
- Request snapshot button respects throttle and updates last snapshot timestamp on success.

---
Status: Draft ready for implementation. Next step: scaffold `services/dashboard/` with server + SSE.
