# @tiltcheck/grading-engine

Casino fairness grading engine with 5-category scoring framework.

## Overview

The Grading Engine evaluates online casinos across 5 fairness categories using 13 quantitative metrics. Designed for integration with AI Collector and Trust Rollup services.

## Categories & Weights

| Category | Weight | Metrics |
|----------|--------|---------|
| **RNG Integrity** | 15% | Payout drift (chi-square), volatility shift, seed rotation correlation |
| **RTP Transparency** | 25% | RTP drift score, bonus latency penalty |
| **Volatility Consistency** | 20% | Streak cluster z-score, post-bonus slope score |
| **Session Behavior** | 20% | Feature interval variance, rotation regularity |
| **Transparency & Ethics** | 20% | Disclosure completeness, audit presence flag |

## Usage

### CLI
```bash
# Grade with mock data (text output)
pnpm --filter @tiltcheck/grading-engine start

# JSON output
pnpm --filter @tiltcheck/grading-engine start --format json
```

### Programmatic
```typescript
import { gradeEngine } from '@tiltcheck/grading-engine';

const result = gradeEngine({
  casinoId: 'stake-us',
  spins: [...], // SpinOutcome[]
  disclosures: {
    rtpStated: 96.5,
    hasProvablyFair: true,
    hasThirdPartyAudit: true,
    fairnessPageUrl: 'https://stake.us/fairness'
  },
  sentiment: {
    redditScore: 0.65,
    trustpilotScore: 4.2,
    volumeScore: 850
  }
});

console.log(result.composite); // 0-100
console.log(result.categories.rng.score); // Category scores
console.log(result.categories.rtp.rationale); // Explanations
```

## Metrics

### RNG Integrity (15%)
- **Payout Drift**: Chi-square test on observed vs expected payouts (threshold: p<0.05 flags manipulation)
- **Volatility Shift**: Pre/post variance change (>20% shift = penalty)
- **Seed Rotation Correlation**: Timing correlation between seed changes and big wins (high correlation = suspicious)

### RTP Transparency (25%)
- **RTP Drift Score**: Observed RTP vs stated RTP (>3% deviation = major penalty)
- **Bonus Latency**: Time delay between bonus trigger and payout (>30s baseline = penalty)

### Volatility Consistency (20%)
- **Streak Cluster Z-Score**: Statistical clustering of loss streaks (z>2.5 = unnatural)
- **Post-Bonus Slope Score**: RTP immediately after bonus (negative slope = predatory)

### Session Behavior (20%)
- **Feature Interval Variance**: Bonus trigger timing consistency (high variance = rigged)
- **Rotation Regularity**: Seed rotation frequency (irregular = manipulatable)

### Transparency & Ethics (20%)
- **Disclosure Completeness**: RTP stated, provably fair docs, audit reports (0-100 scale)
- **Audit Presence Flag**: Third-party certification (iTech Labs, eCOGRA, etc.)

## Confidence Scaling

All penalties are scaled by confidence (0-1):
- Empty spin data → confidence = 0 → all metrics score 100 (no penalty)
- Small samples (<50 spins) → confidence = 0.3
- Large samples (>1000 spins) → confidence = 1.0

**Current Limitation**: Without on-chain spin data, all volatility/RTP metrics default to perfect scores (100). See [24-onchain-spin-collection.md](../../docs/tiltcheck/24-onchain-spin-collection.md) for roadmap.

## Rationale Generation

Each category includes narrative explanations:
```json
{
  "categories": {
    "rng": {
      "score": 100,
      "rationale": [
        "No payout drift detected (p=1.00)",
        "Volatility stable across sessions",
        "Seed rotation shows no correlation with wins"
      ]
    }
  }
}
```

## Integration

### AI Collector
AI Collector feeds grading engine with:
- Disclosure data (LLM-extracted from casino websites)
- Sentiment scores (Reddit + Trustpilot aggregation)
- Empty spin arrays (until on-chain collector is built)

### Trust Rollup
Consumes graded snapshots via `trust.casino.updated` events:
```typescript
eventRouter.subscribe('trust.casino.updated', (event) => {
  const { casinoName, newScore, categories } = event;
  // Update real-time casino snapshot
});
```

## Development

```bash
# Build
pnpm build

# Run tests
pnpm test

# Type check
pnpm typecheck
```

## Roadmap

- [ ] Add hash verification for provably fair games
- [ ] Integrate on-chain spin data (Solana program logs)
- [ ] Add bonus cycle prediction (time-series ML model)
- [ ] Comparative analysis (rank casinos by category)
- [ ] Confidence intervals on all scores (Bayesian estimation)

## License

See root LICENSE file.
