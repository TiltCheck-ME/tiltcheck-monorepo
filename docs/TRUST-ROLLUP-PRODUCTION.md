# Trust Rollup Real Data Configuration Guide

**Last Updated:** December 6, 2025  
**Status:** Production Ready ✅

## Overview

The Trust Rollup service aggregates trust signals from multiple sources to provide real-time casino reputation scores. It supports both curated mock data (for development) and real API integration (for production).

## Trust Score Components

Trust Rollup evaluates casinos across 4 key dimensions:

### 1. Domain Trust (0-100)
- DNS age and stability
- SSL/TLS certificate validity
- WHOIS transparency
- Historical uptime
- Cloudflare protection

### 2. Casino Operations (0-100)
- License verification
- RTP (Return to Player) verification
- Game provider authenticity
- Payout speed
- Withdrawal limits

### 3. Player Sentiment (0-100)
- Review aggregation
- Complaint resolution rate
- Social media sentiment
- Community feedback
- Moderator ratings

### 4. Financial Health (0-100)
- Payment processor reliability
- Cryptocurrency support
- Liquidity indicators
- Transaction volume
- Default risk

## Data Sources

### Domain Trust Sources

**Built-in (Always Available):**
- DNS lookups
- SSL certificate validation
- WHOIS data
- Cloudflare detection

**External APIs (Optional):**
- SecurityTrails (domain history)
- VirusTotal (security reputation)

### Casino Operations Sources

**Mock Data (Default):**
- Curated RTP data
- Known license info
- Game provider databases

**Real APIs (Production):**
- **CasinoGuru API** - RTP verification, license data
- **AskGamblers API** - Casino reviews, complaint data
- **License Verification APIs** - Curacao, Malta, UK licenses

### Player Sentiment Sources

**Mock Data (Default):**
- Curated reviews
- Simulated ratings

**Real APIs (Production):**
- **AskGamblers** - Player reviews and ratings
- **Trustpilot** - General reviews
- **Reddit API** - Community sentiment
- **Twitter API** - Social mentions

### Financial Health Sources

**Mock Data (Default):**
- Estimated metrics

**Real APIs (Production):**
- Blockchain explorers (crypto volume)
- Payment processor APIs
- Public financial data

## Configuration Modes

### Development Mode (Default)

Uses curated mock data - no API keys needed:

```env
# .env.local or leave empty
# USE_MOCK_TRUST_DATA not set (defaults to true)
```

**Behavior:**
- ✅ Comprehensive mock data
- ✅ All casinos covered
- ✅ Zero API costs
- ✅ Fast responses
- ✅ Deterministic testing
- ✅ Source marked as "mock"

**Coverage:**
- Stake.com
- Duelbits.com
- Rollbit.com
- Shuffle.com
- Roobet.com
- BC.Game

### Production Mode

Real API integration with graceful fallback:

```env
# .env or Railway variables
USE_MOCK_TRUST_DATA=false
CASINO_GURU_API_KEY=your_casino_guru_key
ASKGAMBLERS_API_KEY=your_askgamblers_key
```

**Behavior:**
- ✅ Real-time data
- ✅ Accurate trust scores
- ✅ Live updates
- ✅ Graceful fallback to mock if API fails
- ✅ Source marked as "api" or "mock"
- ⚠️ API costs apply
- ⚠️ Rate limits apply

## Getting Started

### Step 1: Obtain API Keys

#### CasinoGuru API

1. Visit https://www.casinoguru.com/
2. Contact their business development team
3. Request API access for casino data
4. Typical features:
   - RTP database access
   - License verification
   - Game provider data
   - Casino metadata

**Cost:** Contact for pricing (typically ~$99-299/month)

#### AskGamblers API

1. Visit https://www.askgamblers.com/
2. Navigate to "Webmasters" or "API" section
3. Apply for API access
4. Typical features:
   - Player reviews
   - Casino ratings
   - Complaint database
   - Resolution tracking

**Cost:** Contact for pricing (typically ~$149-399/month)

### Step 2: Configure Environment

#### For Local Development

Create `.env.local`:
```env
USE_MOCK_TRUST_DATA=false
CASINO_GURU_API_KEY=your_casino_guru_api_key
ASKGAMBLERS_API_KEY=your_askgamblers_api_key
```

#### For Railway Deployment

```bash
railway variables set USE_MOCK_TRUST_DATA="false"
railway variables set CASINO_GURU_API_KEY="your_casino_guru_key"
railway variables set ASKGAMBLERS_API_KEY="your_askgamblers_key"
```

#### For Docker Deployment

Add to `docker-compose.yml`:
```yaml
trust-rollup:
  environment:
    - USE_MOCK_TRUST_DATA=false
    - CASINO_GURU_API_KEY=${CASINO_GURU_API_KEY}
    - ASKGAMBLERS_API_KEY=${ASKGAMBLERS_API_KEY}
```

### Step 3: Verify Configuration

```bash
# Test Trust Rollup
curl http://localhost:8082/health

# Check trust score
curl http://localhost:8082/trust/stake.com

# Verify data source
curl http://localhost:8082/trust/stake.com | jq '.source'
# Expected: "api" (production) or "mock" (development)
```

## Trust Score API

### Get Trust Score

```bash
GET /trust/{domain}
```

**Example:**
```bash
curl http://localhost:8082/trust/stake.com
```

**Response:**
```json
{
  "domain": "stake.com",
  "casino": "Stake",
  "overall": 87,
  "breakdown": {
    "domain": 92,
    "operations": 88,
    "sentiment": 85,
    "financial": 83
  },
  "signals": {
    "positive": [
      "Valid Curacao license",
      "High RTP games (96%+)",
      "Fast crypto withdrawals",
      "Strong community reputation"
    ],
    "negative": [
      "Limited fiat support",
      "Some jurisdictions restricted"
    ],
    "neutral": [
      "Crypto-only platform",
      "High wagering requirements"
    ]
  },
  "lastUpdated": "2025-12-06T20:00:00.000Z",
  "source": "api",
  "confidence": 0.95
}
```

### Batch Trust Scores

```bash
POST /trust/batch
Content-Type: application/json

{
  "domains": ["stake.com", "duelbits.com", "rollbit.com"]
}
```

**Response:**
```json
{
  "results": [
    { "domain": "stake.com", "overall": 87, "source": "api" },
    { "domain": "duelbits.com", "overall": 82, "source": "api" },
    { "domain": "rollbit.com", "overall": 85, "source": "api" }
  ],
  "timestamp": "2025-12-06T20:00:00.000Z"
}
```

### Flush Rollup Snapshot

Forces immediate recalculation of all trust scores:

```bash
POST /trust/flush
```

**Response:**
```json
{
  "status": "success",
  "casinos": 6,
  "timestamp": "2025-12-06T20:00:00.000Z"
}
```

## Data Freshness

### Update Frequency

**Mock Mode:**
- Data: Static, updated with releases
- Refresh: Not applicable

**Production Mode:**
- Domain trust: Updated every 6 hours
- Casino operations: Updated every 24 hours
- Player sentiment: Updated every 12 hours
- Financial health: Updated every 6 hours

### Manual Refresh

```bash
# Force refresh all data
docker exec tiltcheck-rollup node -e "import('./dist/index.js').then(m=>m.flushTrustRollups())"

# Or via API
curl -X POST http://localhost:8082/trust/flush
```

## Cost Optimization

### 1. Cache Responses

Trust Rollup automatically caches scores:

```typescript
// Cached for configured TTL (default 6 hours)
const score1 = await getTrustScore('stake.com');
const score2 = await getTrustScore('stake.com');
// score2 served from cache - no API call
```

**Savings:** 90%+ reduction in API calls

### 2. Batch Requests

Use batch endpoint for multiple casinos:

```typescript
// ❌ Multiple API calls
for (const casino of casinos) {
  await getTrustScore(casino);
}

// ✅ Single batch request
await getBatchTrustScores(casinos);
```

**Savings:** ~80% fewer API calls

### 3. Optimize Update Frequency

```env
# Adjust update intervals based on needs
DOMAIN_TRUST_UPDATE_HOURS=6
OPERATIONS_UPDATE_HOURS=24
SENTIMENT_UPDATE_HOURS=12
FINANCIAL_UPDATE_HOURS=6
```

### 4. Focus on Popular Casinos

```typescript
// Only fetch real data for top casinos
const topCasinos = ['stake.com', 'duelbits.com', 'rollbit.com'];
const useMock = !topCasinos.includes(domain);
```

## Production Deployment Checklist

### Pre-Deployment

- [ ] Obtain CasinoGuru API key
- [ ] Obtain AskGamblers API key
- [ ] Test API keys in staging
- [ ] Configure rate limits
- [ ] Set up monitoring

### Configuration

```bash
# Essential
railway variables set USE_MOCK_TRUST_DATA="false"
railway variables set CASINO_GURU_API_KEY="your_key"
railway variables set ASKGAMBLERS_API_KEY="your_key"

# Optional optimization
railway variables set TRUST_CACHE_TTL_HOURS="6"
railway variables set TRUST_BATCH_SIZE="10"
```

### Post-Deployment

- [ ] Verify API connectivity
- [ ] Test trust score endpoints
- [ ] Validate data sources
- [ ] Monitor API usage
- [ ] Review response times
- [ ] Check error rates

## Monitoring and Maintenance

### Health Endpoint

```bash
curl http://localhost:8082/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "ready": true,
  "service": "trust-rollup",
  "version": "0.1.0",
  "dataSource": "api",
  "casinos": 6,
  "lastUpdate": "2025-12-06T20:00:00.000Z"
}
```

### Metrics to Monitor

| Metric | Healthy Range | Action if Outside |
|--------|---------------|-------------------|
| API success rate | >95% | Check API status, keys |
| Cache hit rate | >80% | Adjust TTL |
| Response time | <500ms | Optimize queries |
| Data freshness | <24 hours | Check update jobs |
| Error rate | <2% | Review logs |

### Logging

```bash
# Railway
railway logs --service=trust-rollup | grep "Trust"

# Docker
docker logs tiltcheck-rollup | grep "Trust"
```

**Key Log Messages:**
- `[TrustRollup] Using API data source` - Production mode active
- `[TrustRollup] Using mock data source` - Development mode
- `[TrustRollup] API request failed, using fallback` - Graceful degradation
- `[TrustRollup] Trust scores updated` - Successful refresh

## Troubleshooting

### API Key Not Working

**Symptoms:**
- "Invalid API key" errors
- All scores showing as "mock" source

**Solutions:**
1. Verify keys are correct
2. Check key permissions
3. Test keys with curl:
```bash
# CasinoGuru
curl -H "Authorization: Bearer $CASINO_GURU_API_KEY" \
  https://api.casinoguru.com/v1/casinos/stake

# AskGamblers
curl -H "X-API-Key: $ASKGAMBLERS_API_KEY" \
  https://api.askgamblers.com/v1/casinos/stake
```
4. Verify API is not blocked by firewall

### Data Not Updating

**Symptoms:**
- Old timestamps
- Stale data
- Same scores for days

**Solutions:**
1. Check update job logs
2. Manually trigger refresh:
```bash
curl -X POST http://localhost:8082/trust/flush
```
3. Verify API rate limits not exceeded
4. Check system time/timezone

### High API Costs

**Symptoms:**
- Unexpected API charges
- Budget alerts

**Solutions:**
1. Review API usage logs
2. Increase cache TTL
3. Reduce update frequency
4. Use batch requests
5. Consider hybrid approach (mix of real + mock)

### Inconsistent Scores

**Symptoms:**
- Scores vary significantly
- Unexpected changes

**Solutions:**
1. Review data sources
2. Check for API outages
3. Validate calculation logic
4. Compare with mock data baseline
5. Review recent complaints/reviews

## Data Quality

### Validation

Trust Rollup validates all external data:

```typescript
// Automatic validation
const score = await getTrustScore('stake.com');

if (score.confidence < 0.7) {
  console.warn('Low confidence score - data quality issue');
}

if (score.source === 'mock') {
  console.warn('Using fallback data - API issue');
}
```

### Confidence Scores

Each trust score includes a confidence level:

- `0.9-1.0`: High confidence - comprehensive data
- `0.7-0.9`: Medium confidence - some data missing
- `0.5-0.7`: Low confidence - limited data
- `<0.5`: Very low confidence - mostly estimated

### Fallback Strategy

```
1. Try real API data (CasinoGuru, AskGamblers)
   ↓ if fails
2. Try cached data (if fresh enough)
   ↓ if fails
3. Use curated mock data
   ↓ always succeeds
4. Return with source marker
```

## Advanced Features

### Custom Trust Weights

Override default trust component weights:

```typescript
import { TrustRollup } from '@tiltcheck/trust-rollup';

const rollup = new TrustRollup({
  weights: {
    domain: 0.20,      // 20% (default: 25%)
    operations: 0.35,  // 35% (default: 25%)
    sentiment: 0.30,   // 30% (default: 25%)
    financial: 0.15    // 15% (default: 25%)
  }
});
```

### Casino Comparison

```typescript
const comparison = await rollup.compareCasinos([
  'stake.com',
  'duelbits.com',
  'rollbit.com'
]);

// Returns ranked list with detailed breakdown
```

### Historical Tracking

```typescript
// Get trust score trend
const history = await rollup.getTrustHistory('stake.com', {
  days: 30
});

// Returns daily scores for trending
```

## Migration from Mock to Production

### Phase 1: Hybrid Mode (Week 1)

Use real data for top casinos only:

```typescript
const topCasinos = ['stake.com', 'duelbits.com'];
const useReal = topCasinos.includes(domain);

if (useReal) {
  return await fetchRealData(domain);
} else {
  return getMockData(domain);
}
```

### Phase 2: Full Production (Week 2+)

```bash
railway variables set USE_MOCK_TRUST_DATA="false"
```

Monitor for 48 hours before proceeding.

### Rollback Plan

If issues arise:

```bash
# Immediate rollback to mock data
railway variables set USE_MOCK_TRUST_DATA="true"

# Service restarts automatically
```

## Supported Casinos

### Current Coverage (Production Ready)

1. **Stake.com** - Full API integration
2. **Duelbits.com** - Full API integration
3. **Rollbit.com** - Full API integration
4. **Shuffle.com** - Full API integration
5. **Roobet.com** - Full API integration
6. **BC.Game** - Full API integration

### Adding New Casinos

```typescript
// Add to configuration
const newCasino = {
  domain: 'newcasino.com',
  name: 'New Casino',
  sources: {
    casinoGuru: 'newcasino',
    askGamblers: 'new-casino'
  }
};

await rollup.addCasino(newCasino);
```

## API Rate Limits

### Recommended Limits

**CasinoGuru:**
- Requests: 1000/day
- Burst: 10/minute
- Recommended: Cache 24 hours

**AskGamblers:**
- Requests: 5000/day
- Burst: 30/minute
- Recommended: Cache 12 hours

### Rate Limit Handling

```typescript
// Automatic retry with exponential backoff
try {
  return await fetchFromAPI(domain);
} catch (error) {
  if (error.status === 429) {
    // Wait and retry
    await sleep(retryDelay);
    return await fetchFromAPI(domain);
  } else {
    // Use fallback
    return getMockData(domain);
  }
}
```

## Security Best Practices

### API Key Security

- ✅ Never commit API keys to git
- ✅ Use environment variables
- ✅ Rotate keys quarterly
- ✅ Monitor for unauthorized usage
- ✅ Use separate keys for dev/prod

### Data Validation

```typescript
// Validate all external data
const validated = validateTrustData(apiResponse);

if (!validated.isValid) {
  console.warn('Data validation failed:', validated.errors);
  return getMockData(domain);
}
```

### Error Handling

```typescript
// Never expose internal errors to users
try {
  return await getTrustScore(domain);
} catch (error) {
  logger.error('Trust score fetch failed', { domain, error });
  return getMockData(domain); // Graceful fallback
}
```

## Support and Resources

### Documentation
- [CasinoGuru API Docs](https://www.casinoguru.com/api)
- [AskGamblers API Docs](https://www.askgamblers.com/api)
- Trust Rollup Source: `services/trust-rollup/src/`

### TiltCheck Resources
- Trust Engines: `modules/trust-engines/`
- Mock Data: `services/trust-rollup/src/mock-data/`
- Tests: `services/trust-rollup/tests/`

### Getting Help

1. Check troubleshooting section above
2. Review API provider status pages
3. Check TiltCheck logs
4. Open GitHub issue with sanitized logs

---

**Trust Rollup Ready for Production!** 🎯📊
