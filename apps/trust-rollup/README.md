# Trust Rollup Service

Aggregates trust events and fetches external casino data to feed the Trust Engines.

## Overview

Trust Rollup serves two critical functions:
1. **Event Aggregation**: Collects hourly rollups of trust.casino.updated and trust.domain.updated events
2. **External Verification**: Periodically fetches casino data from external sources (RTP, payouts, compliance, bonus terms)

## Features

### Event Aggregation
- Collects trust events over 1-hour windows
- Publishes `trust.casino.rollup` and `trust.domain.rollup` events
- Persists rollup snapshots to `data/trust-rollups.json`
- Keeps last 24 hours of rollup history

### External Casino Verification
- Fetches RTP/fairness data
- Monitors payout speed and complaint volume
- Analyzes bonus terms for predatory patterns
- Verifies licensing and compliance status
- Runs every 6 hours for monitored casinos

## Monitored Casinos

Default list (configurable):
- stake.com
- duelbits.com
- rollbit.com
- roobet.com
- bc.game

## How It Works

### 1. Event Aggregation Flow
```
[SusLink/CollectClock] 
  → trust.casino.updated
  → Trust Rollup aggregates
  → Hourly: publishes trust.casino.rollup
  → Trust Engines apply deltas
```

### 2. External Verification Flow
```
[Trust Rollup Scheduler]
  → Every 6 hours
  → Fetch external data (RTP, payouts, compliance)
  → Calculate trust deltas
  → Publish casino.rollup.completed
  → Trust Engines update scores
```

## External Data Sources

**Current Implementation (MVP):**
- Mock data for demonstration
- Shows structure and delta calculation logic

**Future Implementation:**
- AskGamblers.com API for RTP verification
- Trustpilot/Reddit scraping for payout complaints
- Casino Meister for compliance data
- Direct casino site scraping for bonus terms

## Trust Delta Calculation

External data is converted into trust score adjustments:

### RTP/Fairness
- Verified RTP < Claimed RTP: **-15 to 0** (scaled by difference)
- Low confidence in RTP claims: **-5**
- Better than claimed: **+0 to +5**

### Payout Speed
- ≤ 6 hours: **+10**
- ≤ 24 hours: **+5**
- > 48 hours: **-10**
- >20 complaints: **-15 payout, -10 support**

### Bonus Terms
- Restrictive terms: **-12**
- Wagering > 50x: **-8**

### Compliance
- Not licensed: **-20 compliance, -10 fairness**
- Weak jurisdiction (Curacao): **0**
- Strong jurisdiction (Malta/UK): **+10**
- Poor reputation: **-15 compliance, -10 support**

## Configuration

### Environment Variables
```bash
ENABLE_CASINO_VERIFICATION=true      # Enable external data fetching
TRUST_ROLLUP_HEALTH_PORT=8082        # Health check port
TRUST_ROLLUP_SNAPSHOT_DIR=./data     # Snapshot storage directory
```

## Usage

```typescript
import { 
  flushTrustRollups, 
  getCurrentAggregates,
  startCasinoVerificationScheduler,
  triggerManualVerification 
} from '@tiltcheck/trust-rollup';

// Manual flush (for testing)
flushTrustRollups();

// Get current aggregates
const { domainAgg, casinoAgg, windowStart } = getCurrentAggregates();

// Manually trigger verification
await triggerManualVerification('stake.com');
```

## API Endpoints

### GET /health
Health check endpoint
```json
{
  "service": "trust-rollup",
  "ready": true,
  "windowStart": 1700000000000,
  "domainKeys": 5,
  "casinoKeys": 3
}
```

## Data Persistence

Rollup snapshots stored at `data/trust-rollups.json`:
```json
{
  "batches": [
    {
      "generatedAt": "2025-11-19T12:00:00Z",
      "domain": {
        "windowStart": 1700000000000,
        "windowEnd": 1700003600000,
        "domains": {
          "example.com": {
            "totalDelta": -15,
            "events": 2,
            "lastSeverity": 3
          }
        }
      },
      "casino": {
        "windowStart": 1700000000000,
        "windowEnd": 1700003600000,
        "casinos": {
          "stake.com": {
            "totalDelta": 10,
            "events": 1,
            "externalData": {
              "fairnessDelta": 5,
              "payoutDelta": 10,
              "bonusDelta": 0,
              "complianceDelta": 5,
              "supportDelta": 0
            }
          }
        }
      }
    }
  ]
}
```

## Testing

```bash
pnpm test services/trust-rollup
```

Tests cover:
- Event aggregation
- Rollup publishing
- Snapshot persistence
- External data fetching
- Delta calculation

## Development

```bash
# Build
pnpm --filter @tiltcheck/trust-rollup build

# Run in development
pnpm --filter @tiltcheck/trust-rollup dev

# Watch mode
pnpm --filter @tiltcheck/trust-rollup dev
```

## Integration with Trust Engines

Trust Engines subscribe to:
- `trust.casino.rollup` - Hourly event aggregates
- `casino.rollup.completed` - External verification results

External verification data is applied directly to specific trust categories:
- `externalData.fairnessDelta` → fairnessScore
- `externalData.payoutDelta` → payoutScore
- `externalData.bonusDelta` → bonusScore
- `externalData.complianceDelta` → complianceScore
- `externalData.supportDelta` → supportScore

## Future Enhancements

- [ ] Real API integrations (AskGamblers, Trustpilot)
- [ ] Web scraping for bonus terms
- [ ] Machine learning for complaint classification
- [ ] Dynamic casino discovery (auto-add from user activity)
- [ ] Configurable verification intervals per casino
- [ ] Rate limiting and API quota management
- [ ] Caching layer for external API responses
- [ ] Webhook support for real-time casino updates

## Safety Notes

- External data is treated as supplementary, not definitive
- All deltas are capped to prevent single-source manipulation
- Mock data clearly labeled for MVP phase
- Real implementations will require API keys/authentication
- Rate limiting essential to avoid IP bans from scraping

---

**TiltCheck Ecosystem © 2024–2025**
