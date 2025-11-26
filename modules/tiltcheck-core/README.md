# @tiltcheck/tiltcheck-core

**TiltCheck Core - Tilt Detection & Cooldown Management**

The namesake module of the TiltCheck ecosystem. Monitors user behavior and prevents tilt-driven decisions through pattern recognition and friendly nudges.

## Features

- 🧠 **Tilt Detection** - Analyzes message patterns, loss streaks, and behavioral signals
- ⏰ **Cooldown Management** - Automatic and manual cooldown periods
- 💬 **Soft Nudges** - Friendly, humorous messages that encourage healthy behavior
- 📊 **Signal Analysis** - Multiple detection methods with confidence scoring
- 🔗 **Event Integration** - Publishes events to the Event Router for ecosystem integration

## Installation

```bash
pnpm add @tiltcheck/tiltcheck-core
```

## Quick Start

```typescript
import {
  trackMessage,
  trackLoss,
  getUserTiltStatus,
  triggerCooldown,
  getNudgeMessage,
  formatNudge,
} from '@tiltcheck/tiltcheck-core';

// Track user messages (for Discord message events)
trackMessage('user-123', 'This is rigged!', 'channel-456');
trackMessage('user-123', 'What a scam!', 'channel-456');

// Check tilt status
const status = getUserTiltStatus('user-123');
console.log(status.lossStreak); // 0
console.log(status.onCooldown); // false
console.log(status.recentSignals); // Array of detected signals

// Track losses (from games, failed tips, etc.)
trackLoss('user-123', 100);
trackLoss('user-123', 200);
trackLoss('user-123', 300); // This triggers tilt.detected event

// Get appropriate nudge message
const nudge = getNudgeMessage(status.recentSignals);
console.log(formatNudge(nudge)); // "🧘 Breathing room recommended. Seriously."

// Manually trigger cooldown
triggerCooldown('user-123', 'Rage spinning detected', 15); // 15 minute cooldown
```

## API Reference

### Tilt Detection

#### `trackMessage(userId: string, content: string, channelId: string): void`
Track a user's message for tilt pattern analysis.

#### `trackLoss(userId: string, amount: number, context?: Record<string, any>): void`
Track a loss event (from poker, tips, etc.). Triggers tilt detection on loss streaks.

#### `resetLossStreak(userId: string): void`
Reset the loss streak counter (call on wins).

#### `shouldWarnUser(userId: string): boolean`
Check if the user should receive a warning (loss streak >= 2 or recent tilt signals).

#### `getUserTiltStatus(userId: string): TiltStatus`
Get the current tilt status for a user including loss streak, cooldown info, and recent signals.

#### `getUserActivity(userId: string): UserActivity | undefined`
Get the full activity record for debugging/admin purposes.

### Cooldown Management

#### `startCooldown(userId: string, reason: string, durationMs?: number): CooldownStatus`
Start a cooldown period for a user. Default duration is 15 minutes.

#### `endCooldown(userId: string): void`
Manually end a user's cooldown.

#### `isOnCooldown(userId: string): boolean`
Check if a user is currently on cooldown.

#### `getCooldownStatus(userId: string): CooldownStatus | null`
Get detailed cooldown status including remaining time and violations.

#### `triggerCooldown(userId: string, reason?: string, durationMinutes?: number): void`
Convenience function to trigger a cooldown (for Discord commands).

#### `getViolationHistory(userId: string): number`
Get the number of cooldown violations in the last 24 hours.

### Nudge Messages

#### `getNudgeMessage(signals: TiltSignal[]): NudgeMessage`
Get an appropriate nudge message based on detected signals.

#### `formatNudge(nudge: NudgeMessage): string`
Format a nudge message with its emoji prefix.

#### `getEscalatedNudges(signals: TiltSignal[]): NudgeMessage[]`
Get multiple nudge messages for severe tilt situations.

#### `getCooldownMessage(remainingMinutes: number): string`
Get a cooldown-specific message.

#### `getViolationMessage(violationCount: number): string`
Get a violation warning message.

### Message Analysis

#### `analyzeMessages(messages: MessageActivity[], userId: string): TiltSignal[]`
Analyze a list of messages for tilt signals.

#### `calculateTiltScore(signals: TiltSignal[]): number`
Calculate an aggregate tilt score from multiple signals.

## Tilt Signal Types

| Signal Type | Trigger | Severity |
|-------------|---------|----------|
| `rapid-messages` | 5+ messages in 30 seconds | 1-5 |
| `caps-spam` | 3+ all-caps messages | 3 |
| `rage-quit` | Rage keywords detected | 1-5 |
| `loan-request` | Asking for loans/money | 4 |
| `loss-streak` | 3+ consecutive losses | 3-5 |
| `bad-beat` | Bad beat indicator | 2-3 |

## Events Published

| Event | Description | Data |
|-------|-------------|------|
| `tilt.detected` | Tilt signals detected | `{ userId, reason, severity, tiltScore, signals }` |
| `cooldown.violated` | User violated cooldown | `{ userId, violationCount, cooldownReason }` |

## Events Subscribed

| Event | Description |
|-------|-------------|
| `tip.failed` | Track failed tips as losses |
| `game.completed` | Track game outcomes |

## Nudge Message Categories

- **pacing** - For rapid message/activity
- **tone** - For caps/aggressive messages
- **cooldown** - For tilt cooldown recommendations
- **safety** - For loan requests and desperate behavior
- **strategy** - For loss streaks and chasing
- **support** - For bad beats and tough moments
- **general** - Generic check-ins

## Configuration

The module uses sensible defaults but can be customized:

```typescript
// Default cooldown duration: 15 minutes
// Tilt threshold: score >= 3.0 triggers tilt.detected event
// Auto-cooldown threshold: score >= 4.0 starts automatic cooldown
// Message history: keeps last 20 messages per user
// Loss streak threshold: 3+ losses triggers tilt detection
```

## Integration with Discord Bot

```typescript
// In Discord bot message handler
client.on('messageCreate', (message) => {
  if (message.author.bot) return;
  
  trackMessage(
    message.author.id,
    message.content,
    message.channel.id
  );
  
  // Check if we should warn
  if (shouldWarnUser(message.author.id)) {
    const status = getUserTiltStatus(message.author.id);
    const nudge = getNudgeMessage(status.recentSignals);
    
    message.reply(formatNudge(nudge));
  }
});

// Discord command: /cooldown
async execute(interaction) {
  triggerCooldown(
    interaction.user.id,
    'User requested',
    15 // 15 minutes
  );
  
  await interaction.reply('🧘 Cooldown started. Take a break!');
}
```

## Testing

```bash
# Run tests
pnpm test

# Run tests with coverage
pnpm test -- --coverage
```

## License

© 2024–2025 TiltCheck Ecosystem (Created by jmenichole). All Rights Reserved.
