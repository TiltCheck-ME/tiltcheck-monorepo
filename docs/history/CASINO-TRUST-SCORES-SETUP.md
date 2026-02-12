# Running Casino Trust Scores - Quick Start

**Status:** Ready to generate  
**Service:** Trust Rollup (`services/trust-rollup/`)  
**Time to First Scores:** ~2 minutes  
**Default Casinos:** stake.com, shuffle.com, stake.us, shuffle.us, luckybird.io, crowncoins.com, chanced.com, lonestar.com, myprize.us, gamba.com  
**Display Page:** `/casinos` (trust score cards)

---

## 🚀 Quick Start (30 seconds)

### Option 1: Local Development
```bash
# Terminal 1: Start Event Router
cd /Users/fullsail/Desktop/tiltcheck-monorepo-fresh
pnpm dev --filter=@tiltcheck/event-router

# Terminal 2: Start Trust Rollup Service
pnpm dev --filter=@tiltcheck/trust-rollup

# Terminal 3: Trigger initial scores
pnpm dev --filter=@tiltcheck/trust-rollup -- --trigger-verification
```

### Option 2: Direct Run
```bash
cd /Users/fullsail/Desktop/tiltcheck-monorepo-fresh/services/trust-rollup
pnpm build
pnpm start

# In another terminal, trigger verification:
curl -X POST http://localhost:5056/trigger-verification
```

### Option 3: Full Stack (Recommended)
```bash
# Start everything with pnpm
pnpm dev

# In another terminal:
cd services/trust-rollup/src
npx tsx cli.ts --verify-all
```

---

## 📊 What Gets Generated

The trust rollup service generates:

### 1. **Initial Casino Trust Scores** (10 monitored casinos)
```json
{
  "stake.com": {
    "fairness": 72,
    "support": 65,
    "payouts": 70,
    "compliance": 68,
    "bonus": 60,
    "overall": 67
  },
  "shuffle.com": { "overall": 71 },
  "stake.us": { "overall": 73 },
  "shuffle.us": { "overall": 70 },
  "luckybird.io": { "overall": 68 },
  "crowncoins.com": { "overall": 66 },
  "chanced.com": { "overall": 65 },
  "lonestar.com": { "overall": 67 },
  "myprize.us": { "overall": 64 },
  "gamba.com": { "overall": 69 }
}
```

### 2. **Real-time Snapshots** (updated every hour)
```
data/trust-rollups.json
```

### 3. **Trust Deltas** (24-hour rolling window)
```
Score changes based on:
- RTP verification (+/- 15 points)
- Payout speed (+10 for fast, -10 for slow)
- Support quality (+/- 10 points)
- Bonus terms (-12 for restrictive)
- Compliance status (+10 for strong jurisdiction)
```

---

## 🔧 Manual Verification Trigger

### Via Node Script
```bash
cd services/trust-rollup
node dist/cli.js --verify-all
# or for specific casino
node dist/cli.js --verify stake.com
```

### Via API Endpoint
```bash
# Start service first
pnpm start

# Then trigger (in another terminal)
curl -X POST http://localhost:5056/api/verify \
  -H "Content-Type: application/json" \
  -d '{"casino": "all"}'

# Or for specific casino
curl -X POST http://localhost:5056/api/verify \
  -H "Content-Type: application/json" \
  -d '{"casino": "stake.com"}'
```

### Via TypeScript (Programmatic)
```typescript
import { triggerManualVerification } from '@tiltcheck/trust-rollup';

// Verify all monitored casinos
await triggerManualVerification();

// Or specific casino
await triggerManualVerification('stake.com');
```

---

## 📈 Expected Output

After running verification:

```
[Trust Rollup] Casino verification started
[Casino Verify] Fetching data for stake.com
[Casino Verify] RTP check: 96.5% (claimed 96.8%) → -8 points
[Casino Verify] Payout speed: 4.2 hours → +10 points
[Casino Verify] Support rating: 4.2/5 → +8 points
[Casino Verify] Bonus terms: Restrictive → -12 points
[Casino Verify] Compliance: Malta Licensed → +10 points

[Casino Verify] Final score for stake.com: 67/100

[Trust Rollup] Published casino.verification.completed
[Trust Rollup] Scores persisted to data/trust-rollups.json
```

---

## 📁 Output Files

After running:

### `data/trust-rollups.json`
Contains hourly snapshots and casino verification data:
```json
{
  "batches": [
    {
      "generatedAt": "2025-12-08T14:30:00Z",
      "casinos": {
        "stake.com": {
          "fairness": 72,
          "support": 65,
          "payouts": 70,
          "compliance": 68,
          "bonus": 60,
          "overall": 67,
          "lastVerified": "2025-12-08T14:30:00Z",
          "dataSource": "mock"
        }
      }
    }
  ]
}
```

### View Current Scores
```bash
# Pretty print the scores
cat data/trust-rollups.json | jq '.batches[-1].casinos'

# Or via API
curl http://localhost:5056/api/snapshot | jq '.casinos'
```

---

## 🎯 Step-by-Step Guide

### Step 1: Build Services
```bash
pnpm build --filter=@tiltcheck/event-router
pnpm build --filter=@tiltcheck/trust-rollup
```

### Step 2: Start Event Router (Background)
```bash
pnpm start --filter=@tiltcheck/event-router &
sleep 2  # Wait for startup
```

### Step 3: Start Trust Rollup Service
```bash
pnpm start --filter=@tiltcheck/trust-rollup &
sleep 2  # Wait for startup
```

### Step 4: Trigger Initial Verification
```bash
curl -X POST http://localhost:5056/api/verify \
  -H "Content-Type: application/json" \
  -d '{"casino": "all"}'

# Wait ~10 seconds for processing
```

### Step 5: View Results
```bash
cat data/trust-rollups.json | jq '.batches[-1].casinos | keys'
# Output:
# [
#   "stake.com",
#   "shuffle.com",
#   "stake.us",
#   "shuffle.us",
#   "luckybird.io",
#   "crowncoins.com",
#   "chanced.com",
#   "lonestar.com",
#   "myprize.us",
#   "gamba.com"
# ]
```

---

## 🔄 Automated Scheduling

The trust rollup service runs verification **every 6 hours** automatically:

```typescript
// In production
startCasinoVerificationScheduler({
  interval: 6 * 60 * 60 * 1000,  // 6 hours
  onError: (err) => console.error('[Verification Error]', err)
});
```

**Timeline:**
- `T+0min` - Service starts, reads last snapshot
- `T+5min` - Triggers initial verification
- `T+10min` - First scores published, saved to disk
- `T+1h` - Event aggregation window closes, publishes hourly rollup
- `T+6h` - Next scheduled verification
- `T+24h` - Repeats daily

---

## 📊 Understanding the Scores

### Score Breakdown (100 = Perfect)

| Category | Weight | Range | Source |
|----------|--------|-------|--------|
| **Fairness** | 20% | 0-100 | RTP verification, license check |
| **Support** | 20% | 0-100 | Response time, rating, complaints |
| **Payouts** | 20% | 0-100 | Speed, completion rate, disputes |
| **Compliance** | 20% | 0-100 | Jurisdiction, licensing, reputation |
| **Bonus** | 20% | 0-100 | Terms fairness, wagering limits |

### Example Calculation
```
Fairness: 72 (RTP slightly lower than claimed)
Support: 65 (Response time >24h sometimes)
Payouts: 70 (Average speed 6-12h)
Compliance: 68 (Strong license, some complaints)
Bonus: 60 (40x wagering requirement)

Overall = (72+65+70+68+60) / 5 = 67/100
```

---

## 🐛 Troubleshooting

### "No scores generated"
```bash
# Check if service is running
lsof -i :5056

# Check logs
tail -f services/trust-rollup/logs/trust-rollup.log

# Manually trigger
curl -X POST http://localhost:5056/api/verify
```

### "Event Router not connected"
```bash
# Restart event router
pnpm start --filter=@tiltcheck/event-router

# Then restart trust rollup
pnpm start --filter=@tiltcheck/trust-rollup
```

### "Mock data instead of real data"
This is normal in dev. Real data sources need:
- `ENABLE_CASINO_VERIFICATION=true`
- AskGamblers API key (future)
- Trustpilot scraping setup (future)

Currently shows the structure and scoring logic.

---

## 🚀 Production Deployment

### On Railway
```bash
railway variables set ENABLE_CASINO_VERIFICATION=true
railway variables set TRUST_ROLLUP_SNAPSHOT_DIR=/data
railway up
```

### With Docker
```bash
docker build -f services/trust-rollup/Dockerfile -t tiltcheck-rollup .
docker run -d \
  -e ENABLE_CASINO_VERIFICATION=true \
  -v tiltcheck-data:/data \
  tiltcheck-rollup
```

---

## 📚 Reference

- **Trust Rollup README:** [services/trust-rollup/README.md](./services/trust-rollup/README.md)
- **Verification Scheduler:** [services/trust-rollup/src/verification-scheduler.ts](./services/trust-rollup/src/verification-scheduler.ts)
- **Event Router:** [services/event-router/README.md](./services/event-router/README.md)
- **CLI Tool:** [services/trust-rollup/src/cli.ts](./services/trust-rollup/src/cli.ts)

---

## ✅ Quick Verification Checklist

- [ ] Event Router running (`pnpm start --filter=@tiltcheck/event-router`)
- [ ] Trust Rollup running (`pnpm start --filter=@tiltcheck/trust-rollup`)
- [ ] Service responds to health check: `curl http://localhost:5056/health`
- [ ] Triggered verification: `curl -X POST http://localhost:5056/api/verify -H "Content-Type: application/json" -d '{"casino":"all"}'`
- [ ] Scores visible: `cat data/trust-rollups.json | jq '.batches[-1].casinos'`
- [ ] All 10 casinos have scores
- [ ] View scores page: https://tiltcheck.me/casinos (prod) or http://localhost:3000/casinos (local)

---

**Time to First Scores:** ~2 minutes  
**Automated Updates:** Every 6 hours  
**Data Persistence:** `data/trust-rollups.json`  
**Cost:** $0 (mock data in dev, real data when APIs configured)
