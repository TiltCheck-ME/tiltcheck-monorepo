# @tiltcheck/gameplay-analyzer

Real-time casino gameplay analysis engine for RTP verification and fairness detection.

## Features

### 🎰 Casino Data Extraction
- Automated DOM scraping for multiple casino sites (Stake, Roobet, BC.Game, Duelbits)
- Generic selectors for unknown casinos
- Real-time spin detection via MutationObserver + polling
- Balance change detection
- Symbol extraction from slot reels
- Bonus round detection

### 📊 Statistical Analysis
- **RTP Calculation**: Compare actual vs expected RTP with statistical significance
- **Confidence Intervals**: 95% confidence bounds for RTP estimates
- **Z-Score Testing**: Identify statistically significant deviations
- **Variance Analysis**: Track payout volatility and distribution

### 🚨 Anomaly Detection

#### 1. RTP Drift Detection
- Identifies when RTP falls significantly below expected
- Statistical significance testing (p < 0.05)
- Minimum 100 spins for reliability

#### 2. Pump-and-Dump Pattern
- Detects "hook and hold" strategy (high early RTP → sustained losses)
- Analyzes early vs late session performance
- Identifies behavioral manipulation tactics

#### 3. Compression Detection
- Finds artificially compressed payout ranges
- Detects missing large wins (>50x bet)
- Identifies capped payouts

#### 4. Win/Loss Clustering
- Runs test for randomness
- Detects non-random patterns in outcomes
- Identifies streaky behavior

#### 5. Bonus Suppression
- Tracks bonus trigger rates
- Compares actual vs expected frequency
- Detects artificially lowered bonus rates

#### 6. Impossible Odds
- Identifies mathematically impossible outcomes
- Detects payout patterns that violate probability

### 🔌 WebSocket Server
- Real-time streaming of analysis results
- Session management with automatic cleanup
- Multiple client support
- Automatic anomaly alerts
- Periodic analysis updates (every 10 spins)

### 🌐 Browser Extension
- Chrome/Firefox extension for live gameplay capture
- One-click start/stop
- Real-time notifications
- Auto-start capability
- Session persistence

## Installation

```bash
pnpm install
pnpm build
```

## Usage

### As a Package

```typescript
import { GameplayAnalyzer } from '@tiltcheck/gameplay-analyzer';

const analyzer = new GameplayAnalyzer();

// Record spins
analyzer.recordSpin({
  gameId: 'sweet-bonanza',
  casinoId: 'stake',
  userId: 'user123',
  sessionId: 'session456',
  bet: 1.00,
  payout: 2.50,
  symbols: ['cherry', 'cherry', 'cherry'],
  bonusRound: false,
  freeSpins: false,
  timestamp: Date.now()
});

// Analyze after multiple spins
const stats = analyzer.calculateSessionStats('session456');
const rtpAnalysis = analyzer.analyzeRTP('session456');
const anomalies = analyzer.detectAnomalies('session456');
const report = analyzer.generateFairnessReport('session456');

console.log(`RTP: ${stats.actualRTP.toFixed(2)}%`);
console.log(`Verdict: ${report.verdict}`);
console.log(`Risk Score: ${report.riskScore}/100`);
```

### WebSocket Server

```bash
# Start server on port 7071
pnpm start:server

# Or with custom port
ANALYZER_PORT=8080 pnpm start:server
```

### Browser Extension

```typescript
import { CasinoDataExtractor, AnalyzerClient } from '@tiltcheck/gameplay-analyzer/extractor';

const extractor = new CasinoDataExtractor();
const client = new AnalyzerClient('ws://localhost:7071');

await client.connect();

// Start observing casino gameplay
const stopObserving = extractor.startObserving((spinData) => {
  if (spinData) {
    client.sendSpin({
      sessionId: 'session123',
      casinoId: 'stake',
      gameId: 'mines',
      userId: 'user456',
      bet: spinData.bet || 0,
      payout: spinData.win || 0,
      symbols: spinData.symbols || undefined,
      bonusRound: spinData.bonusActive,
      freeSpins: (spinData.freeSpins || 0) > 0
    });
  }
});

// Request fairness report
const report = await client.requestReport('session123');
console.log('Fairness verdict:', report.verdict);
```

## WebSocket Protocol

### Client → Server

#### Start Session
```json
{
  "type": "start_session",
  "data": {
    "sessionId": "session_123",
    "userId": "user_456",
    "casinoId": "stake",
    "gameId": "sweet-bonanza"
  }
}
```

#### Record Spin
```json
{
  "type": "spin",
  "data": {
    "sessionId": "session_123",
    "casinoId": "stake",
    "gameId": "sweet-bonanza",
    "userId": "user_456",
    "bet": 1.00,
    "payout": 2.50,
    "symbols": ["cherry", "cherry", "cherry"],
    "bonusRound": false,
    "freeSpins": false
  }
}
```

#### Request Report
```json
{
  "type": "request_report",
  "sessionId": "session_123"
}
```

### Server → Client

#### Analysis Update (every 10 spins)
```json
{
  "type": "analysis_update",
  "sessionId": "session_123",
  "stats": {
    "totalSpins": 100,
    "totalWagered": 100.00,
    "totalWon": 94.50,
    "actualRTP": 94.50
  },
  "rtpAnalysis": {
    "expectedRTP": 96.00,
    "actualRTP": 94.50,
    "drift": -1.50,
    "isSignificant": false
  },
  "anomalies": 0,
  "timestamp": 1234567890
}
```

#### Anomaly Alert
```json
{
  "type": "anomaly_detected",
  "sessionId": "session_123",
  "anomalies": [
    {
      "type": "rtp_drift",
      "severity": "high",
      "confidence": 0.95,
      "description": "RTP significantly below expected",
      "evidence": {
        "expectedRTP": 96.00,
        "actualRTP": 89.20,
        "drift": -6.80,
        "zScore": -3.24
      }
    }
  ],
  "timestamp": 1234567890
}
```

#### Fairness Report
```json
{
  "type": "report",
  "sessionId": "session_123",
  "data": {
    "verdict": "suspicious",
    "riskScore": 72,
    "sessionStats": { /* ... */ },
    "rtpAnalysis": { /* ... */ },
    "anomalies": [ /* ... */ ],
    "recommendations": [
      "RTP is significantly below expected - consider switching games",
      "Detected pump-and-dump pattern - early wins followed by sustained losses"
    ]
  },
  "timestamp": 1234567890
}
```

## Supported Casinos

### Pre-configured
- **Stake.com** - Full selector support
- **Roobet.com** - Full selector support
- **BC.Game** - Full selector support  
- **Duelbits.com** - Full selector support

### Generic Fallback
- Any casino with standard DOM structure
- Automatic detection for common element patterns

## Adding Casino Support

```typescript
import { CASINO_SELECTORS } from '@tiltcheck/gameplay-analyzer/extractor';

CASINO_SELECTORS.push({
  casinoId: 'my-casino',
  domain: 'mycasino.com',
  selectors: {
    betAmount: '.bet-value',
    winAmount: '.win-value',
    balance: '.user-balance',
    symbols: '.reel-symbol',
    bonusIndicator: '.bonus-active'
  },
  extractors: {
    // Optional custom extractors for complex cases
    extractBet: (doc) => {
      const element = doc.querySelector('.custom-bet');
      return parseFloat(element?.dataset.amount || '0');
    }
  }
});
```

## Architecture

```
┌─────────────────────────────────────┐
│     Browser Extension (Client)      │
│  - CasinoDataExtractor              │
│  - DOM observation                  │
│  - Spin detection                   │
└──────────────┬──────────────────────┘
               │ WebSocket
               │
┌──────────────▼──────────────────────┐
│   GameplayAnalyzerServer (WS)       │
│  - Session management               │
│  - Message routing                  │
│  - Real-time streaming              │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      GameplayAnalyzer (Core)        │
│  - Spin recording                   │
│  - RTP calculation                  │
│  - Anomaly detection                │
│  - Report generation                │
└─────────────────────────────────────┘
```

## Testing

```bash
# Run tests
pnpm test

# Watch mode
pnpm test:watch
```

## Environment Variables

- `ANALYZER_PORT` - WebSocket server port (default: 7071)
- `SESSION_TIMEOUT` - Session inactivity timeout in ms (default: 1800000 = 30 min)

## Security Considerations

- All gameplay data stays local (no external servers)
- WebSocket server runs on localhost by default
- Session IDs are randomly generated
- No sensitive data is logged
- Browser extension requires explicit user permission

## Performance

- **Memory**: ~5KB per 100 spins
- **CPU**: Negligible (analysis runs every 10 spins)
- **Network**: ~100 bytes per spin over WebSocket
- **Latency**: <10ms spin processing

## Roadmap

- [ ] Machine learning anomaly detection
- [ ] Historical data comparison
- [ ] Multi-session tracking
- [ ] Export reports (PDF/CSV)
- [ ] Mobile app support
- [ ] Database persistence
- [ ] Dashboard UI integration
- [ ] Provably fair verification

## License

MIT
