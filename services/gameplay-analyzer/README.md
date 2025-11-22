# Gameplay Analyzer

Ingests casino gameplay data (CSV), computes real-time fairness metrics via grading engine, persists history to SQLite, exposes HTTP API, and detects fairness anomalies.

## Features

### Core Capabilities
- **Multi-format CSV ingestion** with pluggable adapter system
- **Real-time RTP drift detection** with percentile-based calibration
- **SQLite persistence** for historical analysis (WAL mode)
- **HTTP API** for querying spins, seeds, and statistics
- **WebSocket broadcasting** for live dashboard updates
- **Fairness anomaly detection** (pump, volatility compression, win clustering)
- **Alert throttling & escalation** to prevent notification fatigue

### Detection Engine (Phase 3)
See [DETECTION.md](./DETECTION.md) for detailed algorithm documentation.

**Implemented Detectors:**
1. **Pump Detection**: Rapid RTP elevation above baseline
2. **Volatility Compression**: Abnormal variance reduction before spikes
3. **Win Clustering**: Suspicious concentration of wins in short sequences

**Alert Management:**
- Per-casino, per-type throttling (5-minute cooldown)
- Deduplication windows (1 minute)
- Automatic escalation for composite anomalies (≥3 alerts in 10-minute window)
- Publishes `fairness.pump.detected`, `fairness.compression.detected`, `fairness.cluster.detected`, `fairness.rtp.anomaly`, `fairness.volatility.shift` events

### Multi-Casino Adapter System (Phase 1)

**Supported Platforms:**
- **Stake** (US & Global formats)
- **Rollbit** (with currency symbol stripping)

**Auto-Detection:**
- Delimiter detection (`,`, `;`, `\t`, `|`)
- Header-based format matching
- Column mapping validation

**Data Quality:**
- Negative bet rejection
- Max multiplier sanity check (10,000x)
- Duplicate spin detection via `spin_id` tracking

### Persistence Layer
**SQLite Schema:**
```sql
CREATE TABLE spins (
  id TEXT PRIMARY KEY,
  casino_id TEXT NOT NULL,
  ts INTEGER NOT NULL,
  bet REAL NOT NULL,
  win REAL NOT NULL,
  net_win REAL NOT NULL,
  outcome TEXT
);

CREATE TABLE seeds (
  id TEXT PRIMARY KEY,
  casino_id TEXT NOT NULL,
  seed TEXT NOT NULL,
  submitted_by TEXT NOT NULL,
  ts INTEGER NOT NULL
);

CREATE TABLE metric_snapshots (
  id TEXT PRIMARY KEY,
  casino_id TEXT NOT NULL,
  ts INTEGER NOT NULL,
  metric_name TEXT NOT NULL,
  value REAL NOT NULL,
  metadata TEXT
);
```

### HTTP API Endpoints
```
GET /api/spins?limit=100              # Recent spins
GET /api/seeds?limit=50               # Seed rotation history
GET /api/spins/range?start=<ts>&end=<ts>  # Time range query
GET /api/stats                        # Aggregate statistics
```

**CORS:** Enabled for local development (port 5174)

## Architecture

```
CSV File → Adapter Detection → Validation → Normalization → SQLite + Memory Store
                                                           ↓
                                        Grading Engine (every 500 spins)
                                                           ↓
                                        Detection Engine (every 200 spins)
                                                           ↓
                                        Alert Manager (throttle + escalate)
                                                           ↓
                                        Event Router (publish fairness events)
```

### Event Flow
1. **Ingest**: CSV → normalized spins → DB + in-memory
2. **Grade**: Periodic grading (RTP drift, seed CV, etc.) → `trust.casino.alert`
3. **Detect**: Multi-signal anomaly detection → `fairness.*.detected`
4. **Alert**: Throttled alerts → escalation logic → `fairness.rtp.anomaly`
5. **Broadcast**: WebSocket → live dashboard updates

## Usage

### CSV Ingest
```bash
node dist/index.js sample-stake.csv
node dist/index.js sample-rollbit.csv
```

**Adapter Selection:**
- Auto-detects format via header matching
- Falls back to Stake adapter if ambiguous
- Logs adapter choice: `[GameplayAnalyzer] Auto-detected casino: stake-us`

**Ingest Stats:**
```
[GameplayAnalyzer] CSV ingest complete: imported=450 skipped=0 duplicates=50
```

### WebSocket Subscriptions
Subscribe on `ws://localhost:7071` for real-time broadcasts:

```typescript
{
  type: 'rtp-drift',
  deviationRatio: 0.52,
  observedMean: -0.035,
  expectedMean: -0.02,
  sampleSize: 400
}

{
  type: 'seed-rotation',
  seedCount: 12,
  avgIntervalMs: 3600000,
  lastTs: 1703980800000
}

{
  type: 'pump-detected',
  severity: 'critical',
  confidence: 0.87,
  metadata: { observedRTP: 1.12, baselineRTP: 0.96 }
}
```

### Configuration
**Environment Variables:**
```bash
PORT=7071                     # WebSocket port
API_PORT=7072                 # HTTP API port
GRADE_INTERVAL=500            # Spins per grading snapshot
RTP_WINDOW_SIZE=400           # Rolling window for RTP drift
CASINO_ID=stake-us            # Casino identifier
EXPECTED_RTP=-0.02            # Theoretical mean net win per spin
RTP_DRIFT_THRESHOLD=0.5       # Deviation ratio for alerts
DETECTION_WINDOW=100          # Spins per detection run
DETECTION_INTERVAL=200        # Spins between detection runs
```

## Adding New Adapters

See existing adapters in `src/adapters/`:

```typescript
// src/adapters/mycasino.ts
import { CasinoAdapter, SpinRecordNormalized } from './types.js';

export const myCasinoAdapter: CasinoAdapter = {
  name: 'mycasino',
  casinoId: 'mycasino-global',
  
  canHandle(headers: string[], delimiter: string): boolean {
    return headers.includes('game_id') && headers.includes('payout');
  },
  
  normalize(row: Record<string, string>): SpinRecordNormalized {
    return {
      id: row.game_id,
      ts: new Date(row.timestamp).getTime(),
      bet: parseFloat(row.wager),
      win: parseFloat(row.payout.replace('$', '')),
      outcome: row.result
    };
  },
  
  validate(spin: SpinRecordNormalized): { valid: boolean; reason?: string } {
    if (spin.bet <= 0) return { valid: false, reason: 'negative bet' };
    if (spin.win / spin.bet > 50000) return { valid: false, reason: 'max multiplier exceeded' };
    return { valid: true };
  }
};

// Register in src/index.ts
adapterRegistry.register(myCasinoAdapter);
```

## Testing

**Sample Data:**
- `sample-stake.csv`: 10 spins (Stake US format)
- `sample-rollbit.csv`: 10 spins (Rollbit format with currency symbols)

**Validation Tests:**
```bash
# Negative bet rejection
echo "spin_id,ts,bet,win" > test.csv
echo "1,2024-01-01T00:00:00Z,-10,5" >> test.csv
node dist/index.js test.csv
# Expected: skipped=1 (negative bet)

# Duplicate detection
echo "spin_id,ts,bet,win" > test.csv
echo "abc123,2024-01-01T00:00:00Z,10,15" >> test.csv
echo "abc123,2024-01-01T00:01:00Z,10,15" >> test.csv
node dist/index.js test.csv
# Expected: imported=1 duplicates=1
```

## Roadmap

### Completed
- ✅ SQLite persistence layer
- ✅ Historical API endpoints
- ✅ Multi-casino adapter system
- ✅ Auto-detection & validation
- ✅ Duplicate tracking
- ✅ Fairness event taxonomy
- ✅ Pump detection
- ✅ Volatility compression detection
- ✅ Win clustering detection
- ✅ Alert throttling
- ✅ Alert escalation

### Planned
- [ ] Bayesian anomaly scoring
- [ ] Multi-game correlation analysis
- [ ] Player behavior profiling
- [ ] Seed-event correlation engine
- [ ] Historical baseline auto-calibration
- [ ] PostgreSQL adapter (for production scale)
- [ ] Redis caching layer
- [ ] GraphQL query interface
- [ ] Adapter marketplace (community-contributed formats)

## License

TiltCheck Ecosystem © 2024–2025 jmenichole
