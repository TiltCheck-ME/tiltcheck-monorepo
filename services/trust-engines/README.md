# TrustEngines Service

Event-driven trust scoring for casinos and degens in the TiltCheck ecosystem. Consumes behavioral & risk events and emits unified trust updates.

## Goals
- Non-custodial heuristics (0–100 range)
- Explainable deltas (`previousScore`, `newScore`, `delta`, `reason`)
- Configurable severity penalties & starting scores
- Optional structured logging with rotation

## Features
- Casino score adjustments on `link.flagged` and `bonus.nerf.detected`
- Degen score reinforcement on `tip.completed`
- Severity → penalty mapping via `severityScale`
- Unified `trust.casino.updated` event payload
- Logger & size-based rotation (JSON lines)
- `getCasinoScore(casinoName)` API

## Event Payloads
### `trust.casino.updated`
```jsonc
{
  "casinoName": "example.com",
  "previousScore": 75,
  "newScore": 69,
  "delta": -6,
  "severity": 3,
  "reason": "Bonus nerf impact (-30.0%)",
  "source": "trust-engine-casino"
}
```
### `trust.degen.updated`
```jsonc
{ "userId": "alice", "score": 74 }
```

## Configuration
```ts
new TrustEnginesService({
  startingCasinoScore: 80,
  startingUserScore: 72,
  severityScale: [1,2,4,7,12],
  logDir: '/var/log/tiltcheck/trust',
  maxLogSizeBytes: 128 * 1024,
  maxLogFiles: 5,
  autoSubscribe: true,
});
```
| Option | Default | Description |
|--------|---------|-------------|
| `startingCasinoScore` | 75 | Initial unseen casino score |
| `startingUserScore` | 70 | Initial unseen degen score |
| `autoSubscribe` | true | Auto-wire event subscriptions |
| `severityScale` | [2,4,6,8,12] | Penalties for severity 1–5 |
| `logDir` | env | Directory for logs (JSONL) |
| `maxLogSizeBytes` | 262144 | Rotate threshold |
| `maxLogFiles` | 3 | Retained rotated logs |

Enable `TRUST_ENGINES_LOG_ERRORS=1` to default to console logger. Provide `TRUST_ENGINES_LOG_DIR` to set `logDir` implicitly.

## Casino Nerf Integration
On `bonus.nerf.detected`: severity = `ceil(percentDrop * 10)` capped at 5; penalty = `-severityScale[severity-1]`.

## Usage Example
```ts
import { eventRouter } from '@tiltcheck/event-router';
import { TrustEnginesService } from '@tiltcheck/trust-engines';

const trustEngines = new TrustEnginesService({ severityScale: [2,3,5,9,14] });

await eventRouter.publish('link.flagged', 'suslink', {
  url: 'https://example.com/bad-offer',
  riskLevel: 'critical',
  reason: 'Phishing pattern'
}, 'user123');

const current = trustEngines.getCasinoScore('example.com');
```

## Logging & Rotation
Each line appended as JSON: `{ ts, level, msg, meta }`. When base log exceeds `maxLogSizeBytes`, files rotate: `trust-engines.log.1`, `trust-engines.log.2`, etc.

## Extension Points
- Subscribe to new events (e.g. `promo.approved`) and call `adjustCasinoScore`.
- Implement decay for inactivity.
- Persist scores externally by listening to emitted `trust.casino.updated` events.

## Testing
Vitest suite covers link penalties, tip reinforcements, nerf integration and delta assertions.
Run: `pnpm test services/trust-engines`

## Safety Notes
No custodial operations; all trust outputs are heuristics for UX and moderation, not financial advice.

---
TiltCheck Ecosystem © 2024–2025. See `/docs/tiltcheck/` for broader architecture.
