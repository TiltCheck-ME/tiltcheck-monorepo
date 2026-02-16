# Trust Engines

Dual-engine trust scoring system for the TiltCheck ecosystem. Provides Casino Trust (weighted reputation scoring) and Degen Trust (user behavior classification) via event-driven architecture.

## Overview

Trust Engines is a singleton service that:
- **Casino Trust Engine**: Tracks casino reputation across 7 weighted categories (0-100 scale)
- **Degen Trust Engine**: Classifies user behavior into 5 trust levels (very-high → high-risk)
- Consumes events from SusLink, CollectClock, JustTheTip, and Trust Rollup modules
- Persists scores to JSON files with automatic recovery
- Provides explanation APIs for transparency

## Casino Trust Engine

### Scoring Categories (Weighted)
- **Fairness** (30%): RTP verification, outcome randomness
- **Payout Speed** (20%): Withdrawal processing time
- **Bonus Terms** (15%): Clarity of bonus conditions
- **User Reports** (15%): Community feedback volume/severity
- **Freespin Value** (10%): Quality of promotional offers
- **Compliance** (5%): Licensing, KYC practices
- **Support Quality** (5%): Response time, helpfulness

### Event Handlers
- `link.flagged` → Reduces fairness/compliance based on severity
- `bonus.nerf.detected` → Reduces bonusTerms proportional to drop percentage
- `casino.rollup.completed` → Updates fairness/payout from trusted sources
- `domain.rollup.completed` → Updates compliance/support from domain data

### API
```ts
import { trustEngines } from '@tiltcheck/trust-engines';

// Get overall score (0-100)
const score = trustEngines.getCasinoScore('stake.com');

// Get weighted breakdown
const breakdown = trustEngines.getCasinoBreakdown('stake.com');
// {
//   fairness: 85,
//   payoutSpeed: 78,
//   bonusTerms: 92,
//   userReports: 88,
//   freespinValue: 75,
//   compliance: 90,
//   supportQuality: 82
// }

// Get human-readable explanation
const explanation = trustEngines.explainCasinoScore('stake.com');
// "Casino Trust Score: 84/100
//  Fairness: 85 (30% weight)
//  Payout Speed: 78 (20% weight)
//  ..."
```

## Degen Trust Engine

### Trust Levels
1. **very-high** (⭐) - Model community member, zero red flags
2. **high** (✅) - Reliable, minor tilt history
3. **neutral** (😐) - Average behavior, some warnings
4. **low** (⚠️) - Multiple tilt indicators, needs monitoring
5. **high-risk** (🚨) - Scam flags, severe violations

### Scoring Factors
- **Tilt Indicators**: Cooldown violations, repeated losses (-5 each, max -25)
- **Scam Flags**: Reported scams, phishing attempts (-20 each, max -40)
- **Accountability Bonus**: Successful recovery actions (+10 each, max +15)
- **Community Reports**: Peer feedback volume/severity

### Event Handlers
- `tip.completed` → Tracks healthy social behavior
- `tilt.detected` → Records tilt episodes (decays 0.5 per hour)
- `cooldown.violated` → Penalizes impulsive behavior
- `scam.reported` → Hard penalty for malicious activity
- `accountability.success` → Rewards recovery/transparency

### API
```ts
// Get trust level classification
const level = trustEngines.getDegenScore('user123');
// 'high' | 'neutral' | 'low' etc.

// Get detailed breakdown
const breakdown = trustEngines.getDegenBreakdown('user123');
// {
//   baseScore: 70,
//   tiltIndicators: -10,
//   scamFlags: 0,
//   accountabilityBonus: 5,
//   communityReports: -2,
//   finalScore: 63,
//   level: 'neutral'
// }

// Get explanation
const explanation = trustEngines.explainDegenScore('user123');
```

## Recovery & Persistence

### Automatic Recovery
- Tilt indicators decay at 0.5 points per hour
- Recovery scheduler runs every hour
- Clears penalties for users showing consistent positive behavior

### Persistence
- Casino scores → `data/casino-trust.json`
- Degen scores → `data/degen-trust.json`
- Auto-saves on score updates
- Loads on service initialization

## Discord Integration

Users can check trust scores via `/trust` commands:

```
/trust casino <name>    - Show casino reputation breakdown
/trust user [@user]     - Show user trust level & history
/trust explain          - Learn how scoring works
```

## Usage Example

```ts
import { eventRouter } from '@tiltcheck/event-router';
import { trustEngines } from '@tiltcheck/trust-engines';

// Service auto-subscribes to events on import
// Scores update automatically as events flow through Event Router

// Manual queries
const casinoScore = trustEngines.getCasinoScore('stake.com');
const userLevel = trustEngines.getDegenScore('user123');
const explanation = trustEngines.explainCasinoScore('stake.com');

// Listen for trust updates (optional)
eventRouter.subscribe('trust.casino.updated', 'my-module', (event) => {
  console.log(`${event.payload.casinoName}: ${event.payload.score}`);
});
```

## Testing

```bash
pnpm test services/trust-engines
```

Comprehensive test suite covers:
- Weighted scoring calculations
- Event processing (9 event types)
- Trust level classification
- Persistence/recovery
- Score explanations
- Integration with CollectClock

## Safety Notes

- **Non-custodial**: Trust scores are heuristics only, not financial advice
- **Privacy**: User scores stored by Discord ID, not real identity
- **Transparency**: All scoring logic is explainable via API
- **Recovery**: System designed to forgive past tilt with consistent positive behavior

---
TiltCheck Ecosystem © 2024–2025. See `/docs/tiltcheck/` for broader architecture.
