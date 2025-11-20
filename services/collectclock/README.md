# CollectClock Service

Lightweight bonus tracking, nerf detection, and prediction engine for casino bonus cycles within the TiltCheck ecosystem.

## Features
- Casino registration with initial bonus amount
- Bonus updates with history tracking (optional JSON persistence, atomic writes + pruning)
- Nerf detection (`bonus.nerf.detected`) based on configurable percent drop + trust impact event (`trust.casino.updated`)
- Unified trust payload includes `casinoName`, `severity`, `reason`, `source` (score updates add `previousScore`, `newScore`)
- User bonus claims with cooldown enforcement (`bonus.claimed`)
- Volatility-aware prediction (`bonus.prediction.generated`) includes `volatility` & `volatilityScore`
- Event emissions for integration with Discord bots and trust engines

## Events
| Event | Payload Interface | Description |
|-------|-------------------|-------------|
| `bonus.updated` | `BonusUpdateEvent` | Emitted whenever a bonus value is registered or changed |
| `bonus.claimed` | `BonusClaimEvent` | User claims the current bonus; includes next eligible timestamp |
| `bonus.nerf.detected` | `BonusNerfDetectedEvent` | Significant decrease detected (>= `nerfThresholdPercent`) |
| `bonus.prediction.generated` | `BonusPredictionGeneratedEvent` | Forecast produced with moving average + volatility |
| `trust.casino.updated` | `TrustCasinoUpdateEvent` | Nerf impact or score update. Includes `delta` (score change), `severity`, `source`. |

## Configuration
```ts
{
  defaultCooldownMs: 24h,          // user claim cooldown
  nerfThresholdPercent: 0.15,      // percent drop required to classify nerf
  predictionWindow: 5,             // moving average window size
  persistenceDir: undefined,       // directory path for per-casino JSON history
  maxHistoryEntries: undefined,    // prune oldest beyond this count (in persisted file only)
  severityScale: [2,4,6,8,12],     // severity(1..5) -> score penalty used by trust engine
  atomicPersistence: true          // write via temp file then rename
}
```
Partial overrides: `new CollectClockService({ nerfThresholdPercent: 0.10, maxHistoryEntries: 100 })`.

### Severity Calculation
`severity = ceil(percentDrop * 10)` capped to 5. Example: 15% → 2, 42% → 5. Penalties applied by TrustEngines: `[-2,-4,-6,-8,-12]` (mapped by severity). Adjust with `severityScale` if needed.

### Volatility
`volatility` = standard deviation of amounts in prediction window. `volatilityScore = min(1, volatility / average)` giving normalized 0-1 signal.

### Persistence & Pruning
Writes use atomic temp-file strategy (if `atomicPersistence` true). When `maxHistoryEntries` is set, oldest records are dropped before write. Access persisted data via `getPersistedHistory(casinoName)`.
 
### Logging & Rotation
Enable basic structured logging of persistence errors by setting env `COLLECTCLOCK_LOG_ERRORS=1`. Provide a directory via `persistenceLogDir` (or `COLLECTCLOCK_LOG_DIR`) to append JSON lines (`collectclock-persistence.log`). When size exceeds `maxPersistenceLogSizeBytes` the log rotates (`collectclock-persistence.log.1`, etc.) up to `maxPersistenceLogFiles`.
Each log entry: `{ ts, level, msg, meta }`.

## Usage
```ts
import { CollectClockService } from '@tiltcheck/collectclock';
const cc = new CollectClockService({ nerfThresholdPercent: 0.10 });

cc.registerCasino('CasinoA', 1.0); // 1.0 units initial bonus
cc.updateBonus('CasinoA', 1.2); // emits bonus.updated
cc.updateBonus('CasinoA', 0.9); // if drop >= threshold emits bonus.nerf.detected

// Claim bonus
const claim = cc.claimBonus('CasinoA', 'user123');
console.log(claim.nextEligibleAt);

// Prediction with volatility
const pred = cc.predictNext('CasinoA');
console.log({
  predicted: pred.predictedAmount,
  confidence: pred.confidence,
  volatility: pred.volatility,
  volatilityScore: pred.volatilityScore,
});
```

## Future Enhancements
- Phase classification (rising, peak, decline)
- Adaptive prediction models (EMA, Holt-Winters)
- Cross-casino correlation matrix
- Predictive trust modulation (positive spikes vs nerfs)
- History compression & archival (delta encoding, time-bucket aggregation)
- Multi-factor volatility (separate upward vs downward variance)

## Testing
See `tests/collectclock.test.ts` for coverage: registration, update, nerf detection (trust events), cooldown, prediction volatility, short-window confidence, persistence pruning, external persistence.
