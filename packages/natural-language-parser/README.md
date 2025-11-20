# Natural Language Parser

Parses human-friendly inputs for amounts, durations, and user targeting.

## Features

### Amount Parsing
Understands natural language for cryptocurrency amounts:
- **Explicit currency**: "5 sol", "$10", "0.5 SOL"
- **Casual language**: "5 bucks", "10 dollars"
- **Special values**: "all", "everything", "max"
- **Ambiguity detection**: Prompts for confirmation when unclear

### Duration Parsing
Parses time durations flexibly:
- **Short forms**: "15s", "30m", "1h"
- **Long forms**: "30 seconds", "5 minutes", "1 hour"
- **Special cases**: "all day"
- **Smart defaults**: Numbers <= 90 assumed seconds, > 90 assumed minutes

### Target Parsing
Interprets user selection criteria:
- **Direct mentions**: Discord @mentions
- **Random selection**: "3 random users"
- **Activity-based**: "5 active users last day"
- **Balance-based**: "3 poor people" (lowest balance)

## Usage

```typescript
import { parseAmount, parseDuration, parseTarget } from '@tiltcheck/natural-language-parser';

// Parse amount
const amountResult = parseAmount("5 sol");
if (amountResult.success) {
  console.log(amountResult.data.value); // 5
  console.log(amountResult.data.currency); // "SOL"
}

// Parse duration
const durationResult = parseDuration("30s");
if (durationResult.success) {
  console.log(durationResult.data.milliseconds); // 30000
}

// Parse target
const targetResult = parseTarget("3 poor people");
if (targetResult.success) {
  console.log(targetResult.data.type); // "poor"
  console.log(targetResult.data.count); // 3
}

// Handle confirmations
if (amountResult.needsConfirmation) {
  console.log(amountResult.confirmationPrompt);
  // "Did you mean **5 SOL** or **$5 USD**?"
}
```

## Examples

### Amount Parsing
- `"5 sol"` → 5 SOL (high confidence)
- `"$10"` → $10 USD (high confidence)
- `"5"` → 5 SOL (needs confirmation if >= 5)
- `"all"` → entire balance

### Duration Parsing
- `"15s"` → 15 seconds
- `"30 seconds"` → 30 seconds
- `"5m"` → 5 minutes
- `"all day"` → 24 hours

### Target Parsing
- `"@user1 @user2"` → specific users
- `"3 random users"` → 3 random selection
- `"5 active last day"` → 5 most active (24h)
- `"3 poor people"` → 3 lowest balance

## Confidence Scores

All parsers return confidence scores (0-1):
- **1.0**: Explicit, unambiguous input
- **0.9-0.95**: Clear intent with minor assumptions
- **0.7-0.85**: Requires heuristics or defaults
- **< 0.7**: Ambiguous, needs confirmation

## Error Handling

```typescript
const result = parseAmount("invalid");
if (!result.success) {
  console.log(result.error); // "Could not find a numeric amount"
  console.log(result.suggestions); // ["Examples: \"5 sol\", \"$10\", ...]
}
```
