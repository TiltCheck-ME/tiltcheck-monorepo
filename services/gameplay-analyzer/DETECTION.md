# Detection Engine

Phase 3 fairness detection layer for the TiltCheck Gameplay Analyzer.

## Overview

Implements multi-signal anomaly detection across three primary vectors:

### 1. Pump Detection
Flags rapid RTP elevation above baseline expectations.

**Algorithm:**
- Sliding window analysis (default: 100 spins)
- Compares observed RTP vs expected baseline (default: 96%)
- Threshold-based detection (default: 15% deviation)
- Confidence scoring based on deviation magnitude

**Severity Levels:**
- `critical`: >50% deviation from baseline
- `warning`: 25-50% deviation
- `info`: 15-25% deviation

### 2. Volatility Compression
Detects abnormal variance reduction before RTP spikes.

**Algorithm:**
- Compares recent window variance (50 spins) vs historical baseline (200 spins)
- Flags when variance ratio drops below threshold (default: 30%)
- Often precedes pump scenarios (system stabilizes before payout burst)

**Severity Levels:**
- `critical`: variance <15% of baseline
- `warning`: variance 15-25% of baseline
- `info`: variance 25-30% of baseline

### 3. Win Clustering
Identifies abnormal concentration of wins in short sequences.

**Algorithm:**
- Sliding window search for maximum win density
- Win threshold: payout >1.5x bet (configurable)
- Cluster threshold: ≥70% wins in window (default: 20 spins)
- Z-score analysis for statistical significance

**Severity Levels:**
- `critical`: >85% win density
- `warning`: 75-85% win density
- `info`: 70-75% win density

## Composite Scoring

All detectors contribute to a weighted anomaly score:

```typescript
score = (pump × 0.4) + (compression × 0.3) + (clustering × 0.3)
```

**Score Thresholds:**
- `critical`: >0.7
- `warning`: 0.4-0.7
- `info`: <0.4

## Alert Management

### Throttling
- Per-casino, per-alert-type cooldown (default: 5 minutes)
- Deduplication window (default: 1 minute)
- Prevents alert fatigue while maintaining visibility

### Escalation
Automatic escalation when:
1. Current alert is `critical`
2. ≥3 warning/critical alerts in 10-minute window
3. Composite confidence score ≥0.7

Escalated alerts trigger:
- `fairness.rtp.anomaly` event
- Includes recent alert history (5 most recent)
- Logged as ERROR level

## Configuration

Environment variables:

```bash
DETECTION_WINDOW=100        # spins per detection run
DETECTION_INTERVAL=200      # spins between detection runs
CASINO_ID=stake-us          # casino identifier
EXPECTED_RTP=-0.02          # theoretical mean net win per spin
```

## Event Publishing

Detection results publish to Event Router:

```typescript
// Individual detections
'fairness.pump.detected'
'fairness.compression.detected'
'fairness.cluster.detected'

// Composite escalation
'fairness.rtp.anomaly'

// Periodic summary
'fairness.volatility.shift'
```

## Integration

Detectors run automatically during grading cycle:

```typescript
async function maybeGrade() {
  // ... grading engine execution ...
  await detectAndAlert(); // runs detectors + publishes alerts
}
```

No manual invocation required—detection is lifecycle-integrated.

## Testing

Sample detection scenarios:

```typescript
// Pump scenario: inject high-RTP spins
const pumpSpins = Array(100).fill({ ts: Date.now(), bet: 10, win: 15 });
const result = detectPump(pumpSpins, 100, 0.96, 1.15);
console.log(result); // { detected: true, severity: 'critical', ... }

// Compression scenario: low-variance sequence
const stableSpins = Array(50).fill({ ts: Date.now(), bet: 10, win: 10 });
const result2 = detectVolatilityCompression([...baseline, ...stableSpins]);
console.log(result2); // { detected: true, severity: 'warning', ... }

// Clustering scenario: consecutive wins
const winSpins = Array(15).fill({ ts: Date.now(), bet: 10, win: 20 });
const mixSpins = [...winSpins, ...Array(5).fill({ bet: 10, win: 5 })];
const result3 = detectWinClustering(mixSpins, 20, 1.5, 0.7);
console.log(result3); // { detected: true, severity: 'info', ... }
```

## Roadmap

Future enhancements:

- [ ] Bayesian anomaly scoring (probabilistic confidence)
- [ ] Multi-game correlation (cross-game pump detection)
- [ ] Player behavior profiling (distinguish legit streaks vs manipulation)
- [ ] Seed-event correlation (link anomalies to RNG seed rotations)
- [ ] Historical baseline calibration (auto-adjust thresholds per casino)
