# Gameplay Analyzer Service

Detects gameplay anomalies for the TiltCheck ecosystem, including RTP manipulation, win clustering, and fairness issues.

## Features

### Anomaly Detection

1. **RTP Pump Detection**: Detects when a casino shows artificially inflated returns to hook players
2. **Win Clustering Detection**: Identifies suspicious win patterns that deviate from random distribution
3. **RTP Drift Detection**: Monitors for gradual deviation from expected returns

### Mobile Optimization

The service includes mobile-specific features designed for:
- **Battery Efficiency**: Adaptive polling intervals based on battery level
- **Bandwidth Optimization**: Compressed payload formats for mobile networks
- **Batch Processing**: Aggregate multiple spins before analysis to reduce API calls

## Usage

### Basic Usage

```typescript
import { gameplayAnalyzer } from '@tiltcheck/gameplay-analyzer';

// Record individual spins
gameplayAnalyzer.recordSpin({
  spinId: 'spin-123',
  userId: 'user-456',
  casinoId: 'stake-us',
  gameId: 'sweet-bonanza',
  wager: 10,
  payout: 25,
  timestamp: Date.now(),
});

// Analyze session
const report = await gameplayAnalyzer.analyzeSession('user-456:stake-us');
console.log(report.pumpAnalysis);
console.log(report.recommendations);
```

### Mobile Usage

```typescript
import { GameplayAnalyzerService } from '@tiltcheck/gameplay-analyzer';

// Create mobile-optimized instance
const mobileAnalyzer = new GameplayAnalyzerService({
  mobileOptimized: true,
  mobileBatchSize: 25,
});

// Parse compressed spin data from mobile app
const spins = mobileAnalyzer.parseCompressedSpins(
  '10|15|1000;10|0|2000;10|25|3000',
  'user-123',
  'casino-456',
  'slot-789'
);

// Record batch
mobileAnalyzer.recordSpinBatch(spins);

// Get minimal payload for transmission
const payload = mobileAnalyzer.getMinimalPayload('user-123:casino-456');

// Get recommended poll interval based on battery
const interval = mobileAnalyzer.getMobilePollInterval(35, false); // 60000ms
```

## API Reference

### SpinResult

```typescript
interface SpinResult {
  spinId: string;     // Unique spin identifier
  userId: string;     // User/player identifier
  casinoId: string;   // Casino identifier
  gameId: string;     // Game identifier
  wager: number;      // Wager amount
  payout: number;     // Payout amount
  timestamp: number;  // Timestamp of the spin
  isBonus?: boolean;  // Whether this was a bonus/free spin
  sessionId?: string; // Session identifier for grouping
}
```

### Configuration

```typescript
interface GameplayAnalyzerConfig {
  baselineRTP: number;      // Expected RTP (default: 0.96)
  windowSize: number;       // Analysis window size (default: 100)
  pumpThreshold: number;    // RTP deviation for pump (default: 0.10)
  driftThreshold: number;   // RTP deviation for drift (default: 0.05)
  clusterThreshold: number; // Cluster score threshold (default: 0.75)
  minSpinsRequired: number; // Minimum spins for analysis (default: 20)
  autoPublish: boolean;     // Auto-publish events (default: true)
  mobileOptimized: boolean; // Enable mobile mode (default: false)
  mobileBatchSize: number;  // Mobile batch size (default: 25)
}
```

### MobileAnomalySummary

Compressed format for mobile transmission:

```typescript
interface MobileAnomalySummary {
  sid: string;  // Session ID
  ts: number;   // Timestamp
  af: number;   // Anomaly flags (bit: 1=pump, 2=cluster, 4=drift)
  cf: number;   // Confidence (0-100)
  rtp: number;  // Current RTP (e.g., 96.5)
  sc: number;   // Spin count
  sv: number;   // Severity (0=none, 1=warning, 2=critical)
}
```

## Mobile Device Considerations

### iOS Integration

```swift
// Example Swift integration
class GameplayTracker {
    private var spinBuffer: [(wager: Int, payout: Int, ts: Int)] = []
    private let batchSize = 25
    
    func recordSpin(wager: Int, payout: Int) {
        spinBuffer.append((wager, payout, Int(Date().timeIntervalSince1970 * 1000)))
        
        if spinBuffer.count >= batchSize {
            sendBatch()
        }
    }
    
    private func sendBatch() {
        let compressed = spinBuffer.map { "\($0.wager)|\($0.payout)|\($0.ts)" }.joined(separator: ";")
        // POST compressed to /api/gameplay/batch
        spinBuffer.removeAll()
    }
}
```

### Android Integration

```kotlin
// Example Kotlin integration
class GameplayTracker {
    private val spinBuffer = mutableListOf<Triple<Int, Int, Long>>()
    private val batchSize = 25
    
    fun recordSpin(wager: Int, payout: Int) {
        spinBuffer.add(Triple(wager, payout, System.currentTimeMillis()))
        
        if (spinBuffer.size >= batchSize) {
            sendBatch()
        }
    }
    
    private fun sendBatch() {
        val compressed = spinBuffer.joinToString(";") { "${it.first}|${it.second}|${it.third}" }
        // POST compressed to /api/gameplay/batch
        spinBuffer.clear()
    }
}
```

### React Native / PWA

```typescript
// Example React Native / PWA integration
class GameplayTracker {
  private spinBuffer: Array<{wager: number; payout: number; ts: number}> = [];
  private readonly batchSize = 25;
  
  recordSpin(wager: number, payout: number): void {
    this.spinBuffer.push({ wager, payout, ts: Date.now() });
    
    if (this.spinBuffer.length >= this.batchSize) {
      this.sendBatch();
    }
  }
  
  private async sendBatch(): Promise<void> {
    const compressed = this.spinBuffer
      .map(s => `${s.wager}|${s.payout}|${s.ts}`)
      .join(';');
    
    // Use navigator.sendBeacon for background sending
    if ('sendBeacon' in navigator) {
      navigator.sendBeacon('/api/gameplay/batch', compressed);
    } else {
      await fetch('/api/gameplay/batch', {
        method: 'POST',
        body: compressed,
        keepalive: true,
      });
    }
    
    this.spinBuffer = [];
  }
}
```

### Battery Optimization

The service provides adaptive polling based on device state:

| Battery Level | Charging | Poll Interval |
|--------------|----------|---------------|
| > 50%        | Any      | 30 seconds    |
| 20-50%       | No       | 60 seconds    |
| < 20%        | No       | 120 seconds   |
| Any          | Yes      | 30 seconds    |

### Offline Support

For PWA/offline scenarios:

1. Store spins locally using IndexedDB
2. Batch upload when connection restored
3. Use Service Worker for background sync

```typescript
// Service Worker background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'gameplay-sync') {
    event.waitUntil(uploadStoredSpins());
  }
});
```

## Events Published

The service publishes events to the TiltCheck event router:

- `fairness.pump.detected` - When RTP pump is detected
- `fairness.cluster.detected` - When suspicious win clustering is detected

Events flow to the Trust Engine which updates casino trust scores (not player scores).

## Architecture

```
Mobile App / Web Client
        │
        ▼
┌───────────────────┐
│ Gameplay Analyzer │◄── Records spins, detects anomalies
└─────────┬─────────┘
          │
          ▼ Publishes events
┌───────────────────┐
│   Event Router    │
└─────────┬─────────┘
          │
          ▼ Subscribes
┌───────────────────┐
│   Trust Engines   │◄── Updates casino trust scores
└───────────────────┘
```

## Testing

```bash
pnpm test
```

## License

UNLICENSED - TiltCheck proprietary
