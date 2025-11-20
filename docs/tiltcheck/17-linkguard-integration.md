# LinkGuard (SusLink) Integration Design

Purpose: Migrate LinkGuard ("SusLink") link verification outcomes into the unified `trust.casino.updated` (and future `trust.domain.updated`) event fabric so downstream adapters (Discord bots, monitoring, volatility engines) can react uniformly with severity scoring.

## Event Strategy

While casino trust focuses on gambling domains, LinkGuard broadens to all Discord‑shared links. We introduce a sibling event: `trust.domain.updated` for non‑casino domains; casino domains still emit `trust.casino.updated` for consistency.

| Source            | Event Name             | Entity Field    | Use Case                               |
|-------------------|------------------------|-----------------|----------------------------------------|
| LinkGuard scan    | trust.domain.updated   | `domain`        | General domain reputation & risk feed  |
| LinkGuard scan    | trust.casino.updated   | `casinoName`    | Casino ecosystem trust adjustments     |
| Manual admin add  | trust.domain.updated   | `domain`        | Override (safe/unsafe) propagation     |
| User report flow  | trust.domain.updated   | `domain`        | Increments risk on validated report    |

## Severity Mapping

Leverage `@tiltcheck/config` `computeSeverity(score, scale)` using a normalized risk score (0–100). LinkGuard will internally classify links into categories mapped to base scores:

| Category        | Base Score | Delta Sign | Notes |
|-----------------|------------|------------|-------|
| safe            | 5          | +          | Minor reinforcement (cap growth) |
| unknown         | 25         | ±          | Neutral; emits only if prior state differs |
| suspicious      | 55         | -          | Medium risk; triggers adapter highlight |
| unsafe          | 75         | -          | High risk; escalate severity badge |
| malicious       | 90         | -          | Critical; immediate alert channel |

Delta calculation pseudo:
```
newScore = clamp(previousScore + signedBaseDelta, 0, 100)
delta = newScore - previousScore
severity = computeSeverity(Math.abs(delta), DEFAULT_SEVERITY_SCALE)
```
For admin overrides, set `reason = 'override:{safe|unsafe}'` and include `metadata:{actor, previousScore}`.

## Emission Function (Example)
```ts
import { computeSeverity, DEFAULT_SEVERITY_SCALE } from '@tiltcheck/config';
import { EventRouter, TrustDomainUpdateEvent } from '@tiltcheck/types';

// Proposed new type extension
// interface TrustDomainUpdateEvent {
//   type: 'trust.domain.updated';
//   domain: string;
//   delta: number;
//   score: number; // post-update 0-100
//   severity: number; // mapped bucket
//   category: string; // safe|unknown|suspicious|unsafe|malicious
//   reason: string; // human readable summary
//   source: 'linkguard';
//   metadata?: Record<string, any>;
//   ts: number;
// }

export function emitDomainTrust({ router, domain, previousScore, category, actor, context }) {
  const baseScores = { safe: 5, unknown: 0, suspicious: -20, unsafe: -35, malicious: -50 };
  const rawDelta = baseScores[category] ?? 0; // signed delta
  const newScore = Math.max(0, Math.min(100, previousScore + rawDelta));
  const delta = newScore - previousScore;
  if (delta === 0) return; // no-op
  const severity = computeSeverity(Math.abs(delta), DEFAULT_SEVERITY_SCALE);
  const evt = {
    type: 'trust.domain.updated',
    domain,
    delta,
    score: newScore,
    severity,
    category,
    reason: `risk:${category}`,
    source: 'linkguard',
    metadata: { actor, context },
    ts: Date.now()
  } satisfies TrustDomainUpdateEvent;
  router.publish(evt.type, evt);
}
```

## State & Persistence

Maintain a lightweight in-memory cache (domain → score) with optional periodic snapshot (JSON file or SQLite) to ensure continuity after restarts. For casino domains, map `domain` → canonical `casinoName` via a normalization table and emit both events if relevant.

## Downstream Adapter Expectations

Consumers (FreeSpinsChannelBot, monitoring dashboards) will:
1. Subscribe to both `trust.domain.updated` & `trust.casino.updated`.
2. Display severity badges (🟢 low / 🟡 medium / 🟠 high / 🔴 critical).
3. Provide delta formatting: `(+5)` or `(-20)` with colorization.
4. Aggregate hourly rollups (planned `trust.domain.rollup`).

## Rollup Design (Preview)
Collect events over a sliding hour window:
```
rollup = {
  hourStartTs,
  domains: {
    example.com: { totalDelta: -55, events: 3, lastSeverity: 3 },
    casinoX: { totalDelta: +10, events: 2, lastSeverity: 1 }
  }
}
```
Emit `trust.domain.rollup` hourly for monitoring and potential alerting when `totalDelta <= -40` within one window.

## Open Questions
1. Confirm canonical list of casino domains for dual emission.
2. Decide persistence layer (file vs SQLite) matching scrappy/cheap infra rule.
3. Finalize severity scale thresholds for domain trust separate from casino trust (may reuse existing scale initially).
4. Whether user reports immediately reduce score or require moderation queue.

## Implementation Steps (Suggested)
1. Add new type `TrustDomainUpdateEvent` to `@tiltcheck/types`.
2. Implement domain score cache + normalization.
3. Integrate emission in LinkGuard command handlers (`!verifylink`, `!reportlink`, admin overrides).
4. Create rollup scheduler (hourly) publishing summary events.
5. Update FreeSpinsChannelBot adapter to format trust changes.
6. Add monitoring script (optional alerts when malicious events occur).

## Safety & Anti-Tilt Considerations
Avoid penalizing domains repeatedly in rapid succession (cooldown: minimum 60s between identical category hits). Prevent negative score cascades by flooring at 0 and limiting single-event delta magnitude (e.g. max -50). Ensure manual overrides log actor identity to metadata for audit.

---
This document provides the blueprint; awaiting LinkGuard source code integration points to proceed with concrete patches.
