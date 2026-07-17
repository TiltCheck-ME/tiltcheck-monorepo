# Trust Engine & Event Schema Migration Guide

Date: 2025-11-19
Scope: Unify casino trust event payloads across all TiltCheck repos and adopt logging, rotation, severity scaling, and delta fields.

## 1. Overview
Previous trust events varied (e.g. `{ domain, score }`, `{ casino, delta, reason }`). New unified schema:
```
trust.casino.updated: {
  casinoName: string,
  previousScore?: number,
  newScore?: number,
  delta?: number,
  severity?: number,      // 1–5
  reason: string,
  source: string,         // emitter module id
  metadata?: Record<string,any>
}
```
Rationale: Consistency, downstream simplification, explicit score diff (`delta`), and provenance (`source`).

## 2. Schema Diff
| Field | Old Variants | New | Notes |
|-------|--------------|-----|-------|
| `casinoName` | `domain`, `casino` | unified | Use canonical identifier (hostname or configured alias). |
| `previousScore` | absent | added | Score before mutation. |
| `newScore` | sometimes `score` | renamed | Always reflect post-change value. |
| `delta` | sometimes `delta` (ambiguous) | normalized | Must equal `newScore - previousScore`. Negative = penalty. |
| `severity` | sometimes present | standardized | 1–5 scale; optional for pure score updates without severity context. |
| `reason` | present | unchanged | Human-readable explanation. |
| `source` | absent | added | Emitting module for attribution & auditing. |
| `metadata` | absent | optional | Flexible extension surface. |

## 3. Required Repo Changes
### A. JustTheTip
1. Search for `trust.casino.updated` emissions; replace payload to unified shape.
2. If only user trust updates are emitted, no change; still consume unified casino events for UI.
3. Add parser that expects `delta` & severity when computing aggregate risk badges.

### B. CollectClock (external repo)
1. Ensure nerf emissions already send severity; include `source` and optionally set `delta: undefined` (CollectClock does not change score directly). Alternatively omit `newScore`/`previousScore` for non-score impacting events.
2. Confirm compatibility: downstream must treat missing `newScore` gracefully.

### C. LinkGaurd (SusLink)
1. Replace any `{ domain, score }` trust payload with unified schema including `previousScore`, `newScore`, `delta`.
2. Compute severity: map riskLevel → severity (e.g. critical=4, high=3, suspicious=2, safe=1).
3. Apply penalty using severityScale if TrustEngines is centralized; otherwise emit event without score math and let TrustEngines handle the adjustment.

### D. FreeSpinsChannelBot
1. Update message templating: show `Δscore` using `delta` with color (red negative, green positive).
2. Add severity emoji mapping (1=⚠️, 5=🛑) if severity present.

### E. TiltCheck Core
1. Centralize `severityScale` default in a shared config (`packages/config/trust.ts`).
2. Export helper `computeSeverity(percentDrop: number): number`.
3. Provide TypeScript types import path: `@tiltcheck/types` for TrustCasinoUpdateEvent.

### F. AirdropGatekeeper / DegensAgainstDecency / qualifyfirst
1. Audit for any trust emissions; unify payload.
2. Avoid adding severity for actions that are purely identity verification; set `severity: undefined`.

## 4. Environment & Logging
### New Env Flags
| Service | Flag | Purpose |
|---------|------|---------|
| CollectClock | `COLLECTCLOCK_LOG_ERRORS=1` | Enable console logger fallback |
| CollectClock | `COLLECTCLOCK_LOG_DIR=/path` | Persistence + rotation log directory |
| TrustEngines | `TRUST_ENGINES_LOG_ERRORS=1` | Enable console logger fallback |
| TrustEngines | `TRUST_ENGINES_LOG_DIR=/path` | Trust logs directory |

### Rotation Defaults
Size threshold 256KB, retain 3 rotated files. Override via config or env in each service.

## 5. Severity & Penalty Mapping
Default severityScale: `[2,4,6,8,12]` meaning penalties applied as negative deltas.
Customization example: high volatility environments might prefer `[1,3,5,7,11]`.
Computation:
```
severity = clamp(1,5, ceil(percentDrop * 10))
penalty = -severityScale[severity-1]
```

## 6. Testing Plan
| Phase | Tests |
|-------|-------|
| Unit | Event emission payload shape per repo (snapshot + field presence). |
| Integration | CollectClock nerf → TrustEngines score delta & dual event emission. |
| Bot Rendering | FreeSpinsChannelBot message formatting with positive & negative deltas. |
| Regression | Ensure legacy consumers (if any) adapted; search for `data.domain` or `data.score` usages. |

Add temporary compatibility adapter:
```ts
function normalizeOldCasinoEvent(evt: any): TrustCasinoUpdateEvent {
  if (evt.domain && evt.score !== undefined && !evt.casinoName) {
    return {
      casinoName: evt.domain,
      previousScore: evt.previousScore,
      newScore: evt.score,
      delta: evt.delta ?? (evt.previousScore !== undefined ? evt.score - evt.previousScore : undefined),
      severity: evt.severity,
      reason: evt.reason || 'legacy update',
      source: evt.source || 'legacy-adapter'
    };
  }
  return evt;
}
```
Remove adapter after full rollout.

## 7. Rollout Strategy
1. Prepare migration branches concurrently in each repo.
2. Implement compatibility adapter where necessary.
3. Deploy CollectClock & TrustEngines first (emit new schema).
4. Update consumer bots / dashboards.
5. Remove legacy field usage & adapter after 1 release cycle.

## 8. Revert Instructions
If an issue arises:
1. Toggle env `TRUST_ENGINES_LOG_ERRORS` off to reduce noise.
2. Re-run legacy payload emission by switching to fallback helper (keep a git stash with old emitter function).
3. Monitor error logs for parsing exceptions in bots.

## 9. Open Questions
- Should severity be included for positive trust adjustments? (Currently yes only for risk/nerf.)
- Do we derive severity for multi-factor events (e.g., simultaneous link.flagged + nerf)?
- Threshold for volatility-driven dynamic severity scale adaptation.

## 10. Checklist
- [ ] All repos updated to unified schema
- [ ] Bots parse `delta` & severity
- [ ] Logging directories set in production
- [ ] SeverityScale documented in config package
- [ ] Adapter removed post-rollout

---
Migration authored by Trust Engine module updates. For clarifications consult `services/trust-engines/README.md`.