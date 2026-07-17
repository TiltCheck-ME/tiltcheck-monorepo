# Casino Trust Score Page Specification

Status: Draft (2025-11-20)
Owner: jmenichole / TiltCheck Agent
Purpose: Provide a fast, transparent, anti-tilt single page that surfaces per-casino trust health, recent bonus adjustments, volatility, and actionable context for degens.

---
## 1. Objectives
- Real-time view of casino-level trust scores (0–100) sourced from `trust.casino.updated` events.
- Highlight bonus changes (events: `bonus.updated`, `bonus.nerf.detected`) & correlate with trust deltas.
- Detect and visualize volatility / risk (sudden nerfs, high negative deltas, frequency of adjustments).
- Provide a short narrative explanation per casino (reason field / aggregated cause rollup).
- Enable early intervention before degenerative behavior (tie-ins with LockVault suggestions if volatility spikes).

## 2. Event Inputs
| Event | Fields Used | Purpose |
|-------|-------------|---------|
| `trust.casino.updated` | `casinoName`, `previousScore`, `newScore`, `delta`, `severity`, `reason`, `source` | Core trust timeline & deltas |
| `bonus.updated` | `casinoName`, `newAmount`, `oldAmount` | Detect positive or neutral changes, feed value trend |
| `bonus.nerf.detected` | `casinoName`, `previousAmount`, `newAmount`, `percentDrop` | Negative impact, increase risk score |
| `bonus.logged` (optional) | `amount` | Volume / activity context |

### Optional Future Events
- `promo.approved` / `promo.denied` for promotional integrity signals.
- `tilt.detected` cross-reference to flag casinos where user-specific tilt clusters overlap.

## 3. Data Model (Page-level Aggregation)
```ts
interface CasinoTrustSnapshot {
  casinoName: string;
  currentScore: number;         // last trust.casino.updated newScore
  previousScore?: number;       // before last update
  scoreDelta?: number;          // currentScore - previousScore
  lastUpdated: number;          // timestamp
  severity?: number;            // last event severity (1-5)
  volatility24h: number;        // computed metric (0-1) scaled
  events24h: number;            // count trust updates in last 24h
  nerfs24h: number;             // count bonus.nerf.detected in last 24h
  avgBonusChange24h?: number;   // mean of (new - old) from bonus.updated
  percentNerfMax24h?: number;   // worst nerf percent in window
  activityScore?: number;       // composite (events24h weighted)
  riskLevel: 'low' | 'watch' | 'elevated' | 'high' | 'critical';
  lastReasons: string[];        // up to last N reason strings
  sources: Set<string>;         // modules contributing (collectclock, trust-engine-casino,...)
}
```

### Volatility Computation
- Collect score deltas and bonus percentage changes over rolling 24h window.
- `volatility24h = normalize(stdDev(deltas + bonusPercentChanges))` (0-1).
- Weight nerf events heavier: each nerf delta multiplied by 1.5 before stdDev.

### Risk Level Mapping
| Condition | Risk Level |
|-----------|-----------|
| volatility24h < 0.15 and nerfs24h = 0 | low |
| volatility24h < 0.3 and nerfs24h <= 1 | watch |
| volatility24h < 0.5 and nerfs24h <= 2 | elevated |
| volatility24h < 0.7 or nerfs24h <= 3 | high |
| volatility24h >= 0.7 or nerfs24h > 3 | critical |

## 4. Aggregation Service
Location: `services/dashboard` (or dedicated `services/trust-rollup`) extension.
Responsibilities:
1. Subscribe to relevant events via `eventRouter.subscribe`.
2. Maintain in-memory window (deque) per casino of last 24h events.
3. Recompute snapshot on each incoming event; publish synthetic `trust.casino.rollup` event with snapshot payload for any listeners (UI SSE/WebSocket).
4. Persist periodic JSON (every 5 min) for reload resilience.

## 5. Delivery to Front-End
Transport Options:
- Server-Sent Events (SSE) for lightweight streaming (preferred, minimal complexity).
- WebSocket multiplex if dashboard already uses it.
- Fallback: Poll REST endpoint `/api/trust/casinos` every 30s if real-time not required.

### API Sketch
`GET /api/trust/casinos` -> array of `CasinoTrustSnapshot` sorted by risk then score.
`GET /api/trust/casinos/:name/history?limit=50` -> chronological trust + bonus events merged.
`GET /api/trust/casinos/metrics` -> aggregated stats (mean volatility, global nerf count, top movers).

## 6. UI Components
1. Scoreboard Grid
   - Columns: Casino, Score (progress bar), Δ, Risk Badge, Volatility Sparkline, Last Reason Tooltip, Actions.
2. Volatility Sparkline
   - Mini line or area chart of last N score values.
3. Nerf Indicator
   - Icon (⚠) with count in last 24h; colored by severity.
4. Reason Tooltip
   - Hover shows lastReasons joined; highlight sources.
5. Action Suggestions
   - If riskLevel ≥ high: show "Consider Vault Lock" CTA linking to `/vault` command guidance (LockVault synergy).
6. Filter Bar
   - Risk filter, min score, show only high volatility.
7. Event Feed Panel
   - Live scrolling list: timestamp, eventType, short reason, delta.
8. Accessibility Considerations
   - All color-coded risk statuses must have shape + text label.
   - High contrast palette (no green/red only; include icons).

## 7. Styling & A11y
- Use existing design tokens (contrast-checked) from dashboard standards.
- Risk colors: low (blue), watch (purple), elevated (amber), high (orange), critical (red) ensuring WCAG AA contrast.
- Provide ARIA live region for event feed updates (announce only risk escalations, throttle).

## 8. Performance & Limits
- Max casinos tracked initially: 50.
- Window size per casino: events in last 24h capped at 500.
- Snapshot recompute < 5ms typical; aggregate once per event.
- Memory footprint target < 10MB.

## 9. Persistence Strategy
- JSON file `data/casino-trust-snapshots.json` persisted every 5 minutes and on graceful shutdown.
- On load, rebuild rolling windows where possible (only trust score timeline; volatility recalculated ignoring missing intermediate bonus events older than window).

## 10. Anti-Tilt Integration Hooks
- When riskLevel transitions to `critical`, publish `tilt.cooldown.requested` for internal consideration.
- Provide secondary action: "Lock temptation for Xh" prefilled with suggested duration based on volatility (e.g., 12h if volatility24h ≥ 0.7).

## 11. Security / Abuse Considerations
- Validate incoming event data (no negative scores outside delta logic; clamp 0–100).
- Guard against event spam (rate-limit updates per casino > 30/min triggers anomaly flag).
- Do not allow user-submitted text directly into reason rendering without sanitization.

## 12. Future Extensions
- Add correlation matrix: trust score vs bonus amount slope.
- Predict next score movement using simple linear regression of last N deltas.
- Multi-user personalization overlay (user-specific trust signals).

## 13. Implementation Checklist
- [ ] Subscribe to events in aggregator service.
- [ ] Build rolling window + snapshot computation.
- [ ] Publish `trust.casino.rollup` synthetic events.
- [ ] Add REST endpoints (3 listed).
- [ ] Add SSE endpoint `/api/trust/stream`.
- [ ] Implement UI components (grid, volatility sparkline, feed).
- [ ] Add LockVault CTA logic.
- [ ] Add persistence & reload.
- [ ] Accessibility audit (contrast & keyboard nav).

---
Update this spec as modules evolve (pricing oracle integration for USD normalization, promo integrity, cross-module trust fusion).
