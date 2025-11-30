# CollectClock Module

Daily bonus tracker with countdown timers, nerf detection, and bonus cycle prediction for the TiltCheck ecosystem. It is event-driven, modular, and ready for migration and expansion.

## Features

### ✅ Core Functionality
- **Casino Bonus Tracking** - Register casinos and track bonus amounts over time
- **Cooldown Enforcement** - Enforce claim cooldowns per user per casino
- **Nerf Detection** - Automatically detect when casinos reduce bonus amounts
- **Bonus Predictions** - Predict future bonus amounts with volatility scoring
- **Trust Engine Integration** - Publishes events to affect casino trust scores

### ✅ User Timer Management
- **Countdown Timers** - Track when bonuses become available for each user
- **Ready Timers** - Get list of all bonuses ready to claim
- **Per-Casino Timers** - Check specific casino bonus availability

### ✅ Custom Bonus Categories
- **User-Defined Categories** - Create custom bonus types (e.g., "Daily SC", "Streak Bonus", "Weekly Spin")
- **Category Cooldowns** - Each category has its own cooldown timer
- **Category Management** - Create, claim, and delete custom categories

### ✅ Notification Subscriptions
- **Subscribe to Alerts** - Get notified when bonuses are ready or nerfed
- **Discord DM Support** - Configure notifications via Discord DMs
- **Per-Casino Subscriptions** - Subscribe to specific casinos

### ✅ User Bonus History
- **Claim History** - Track all bonus claims per user
- **Statistics** - Get total claims, amounts, and per-casino breakdowns
- **History Filtering** - Filter by casino and limit results

### ✅ Nerf Tracking
- **Nerf History** - Get history of all detected nerfs for a casino
- **All Nerfed Casinos** - List all casinos that have been nerfed

## API

### `CollectClockService`

#### Core Methods
- `registerCasino(casinoName, initialAmount, cooldownMs?)` - Register a new casino
- `updateBonus(casinoName, newAmount)` - Update bonus amount (triggers nerf detection)
- `claimBonus(casinoName, userId, trustScore?, trustBand?)` - Claim bonus with cooldown check
- `predictNext(casinoName)` - Get prediction with volatility metrics
- `getCasinoState(casinoName)` - Get current casino state
- `getPersistedHistory(casinoName)` - Get file-persisted history

#### Timer Methods
- `getUserTimers(userId)` - Get all bonus timers for a user
- `getUserTimer(userId, casinoName)` - Get specific casino timer
- `getReadyTimers(userId)` - Get all ready-to-claim bonuses

#### Custom Category Methods
- `createCustomCategory(userId, casinoName, categoryName, cooldownMs, notes?)` - Create custom bonus category
- `claimCustomCategory(userId, casinoName, categoryName)` - Claim custom category
- `getUserCustomCategories(userId)` - Get all user's custom categories
- `deleteCustomCategory(userId, casinoName, categoryName)` - Delete custom category

#### Notification Methods
- `subscribeNotifications(userId, casinoName, options?)` - Subscribe to bonus alerts
- `unsubscribeNotifications(userId, casinoName)` - Unsubscribe from alerts
- `getUserNotifications(userId)` - Get user's notification subscriptions
- `getCasinoSubscribers(casinoName)` - Get casino's subscribers
- `checkPendingNotifications()` - Check for pending notifications (for scheduler)

#### History Methods
- `getUserBonusHistory(userId, options?)` - Get user's claim history
- `getUserBonusStats(userId)` - Get user's claim statistics

#### Nerf Tracking Methods
- `getNerfHistory(casinoName)` - Get nerf history for a casino
- `getAllNerfedCasinos()` - Get all casinos with detected nerfs

## Event Flow

The module publishes the following events via EventRouter:

- `bonus.updated` - When a bonus amount is registered or updated
- `bonus.claimed` - When a user claims a bonus
- `bonus.nerf.detected` - When a significant bonus reduction is detected
- `bonus.prediction.generated` - When a prediction is generated
- `trust.casino.updated` - When a nerf affects casino trust score

## Usage

```ts
import { collectclock, CollectClockService } from '@tiltcheck/collectclock';

// Use the singleton instance
collectclock.registerCasino('Stake', 1.0, 86400000); // 24-hour cooldown
collectclock.updateBonus('Stake', 0.8); // Will trigger nerf detection if threshold met

// Or create a custom instance
const service = new CollectClockService({
  defaultCooldownMs: 86400000, // 24 hours
  nerfThresholdPercent: 0.15, // 15% drop = nerf
  predictionWindow: 5,
  persistenceDir: './data/bonuses',
  maxHistoryEntries: 100,
});

// Register casinos
service.registerCasino('Casino1', 1.0);
service.registerCasino('Casino2', 2.0);

// Track user timers
const timers = service.getUserTimers('user123');
const readyBonuses = service.getReadyTimers('user123');

// Claim a bonus
const claim = service.claimBonus('Casino1', 'user123');
console.log(`Claimed ${claim.amount}, next eligible at ${new Date(claim.nextEligibleAt)}`);

// Create custom category
service.createCustomCategory('user123', 'Casino1', 'Daily SC', 86400000, 'Daily sweeps coins');
service.claimCustomCategory('user123', 'Casino1', 'Daily SC');

// Subscribe to notifications
service.subscribeNotifications('user123', 'Casino1', {
  notifyOnReady: true,
  notifyOnNerf: true,
  discordDM: true,
});

// Get user history & stats
const history = service.getUserBonusHistory('user123', { limit: 10 });
const stats = service.getUserBonusStats('user123');

// Get predictions
const prediction = service.predictNext('Casino1');
console.log(`Predicted: ${prediction.predictedAmount}, Confidence: ${prediction.confidence}`);

// Get nerf tracking
const nerfs = service.getNerfHistory('Casino1');
const allNerfed = service.getAllNerfedCasinos();
```

## Discord Command Support

This module provides the backend for these Discord commands:

```
/bonus set <casino> <amount>    - Update bonus amount for a casino
/bonus history <casino>         - View bonus history for a casino
/bonus predict <casino>         - Get prediction for next bonus
/bonus nerfs                    - View all nerfed casinos
/bonus timers                   - View all your countdown timers
/bonus ready                    - View bonuses ready to claim
/bonus subscribe <casino>       - Subscribe to bonus notifications
/bonus unsubscribe <casino>     - Unsubscribe from notifications
```

## Configuration Options

```ts
interface CollectClockConfig {
  defaultCooldownMs: number;      // Default: 24 hours
  nerfThresholdPercent: number;   // Default: 0.15 (15%)
  predictionWindow: number;       // Default: 5 samples
  persistenceDir?: string;        // File persistence directory
  maxHistoryEntries?: number;     // Max entries to persist
  severityScale?: number[];       // Trust penalty scale
  atomicPersistence?: boolean;    // Use atomic file writes
  logger?: CollectClockLogger;    // Custom logger
  trustGating?: TrustGatingConfig; // Trust-based claim gating
}
```

## Test Coverage

- 36 tests covering all functionality:
  - Core bonus tracking and claims
  - Nerf detection and trust events
  - Predictions with volatility
  - User timer management
  - Custom bonus categories
  - Notification subscriptions
  - User history and statistics
  - Nerf tracking

## Migration Notes
- All logic is production-ready with comprehensive test coverage
- Non-custodial flow enforced—no funds are held by the module
- Integrates with Trust Engines via event publishing
- Supports file-based persistence for bonus history

---
TiltCheck Ecosystem © 2024–2025. For architecture and migration details, see `/docs/tiltcheck/`.
