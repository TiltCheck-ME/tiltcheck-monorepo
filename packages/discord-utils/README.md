# @tiltcheck/discord-utils

Shared Discord utilities for the TiltCheck ecosystem.

## Features

- **Embed Builders** - Consistent, branded embeds for all bot responses
- **Text Formatters** - Discord markdown helpers and formatting utilities
- **Input Validators** - Validate user input for commands

## Installation

```bash
npx pnpm add @tiltcheck/discord-utils
```

## Usage

### Embeds

```typescript
import { successEmbed, linkScanEmbed, Colors } from '@tiltcheck/discord-utils';

// Basic success embed
const embed = successEmbed('Operation Successful', 'Your request was processed.');

// Link scan result embed
const scanEmbed = linkScanEmbed({
  url: 'https://example.com',
  riskLevel: 'safe',
  reason: 'No suspicious patterns detected',
  scannedAt: new Date(),
});

// Custom embed
const custom = createEmbed('Title', 'Description', Colors.PRIMARY);
```

### Formatters

```typescript
import {
  formatTimestamp,
  formatCurrency,
  createProgressBar,
  bold,
  inlineCode,
} from '@tiltcheck/discord-utils';

// Discord timestamp (shows as relative time)
const time = formatTimestamp(new Date(), 'R'); // "2 hours ago"

// Currency
const price = formatCurrency(99.99, 'USD'); // "$99.99"

// Progress bar
const bar = createProgressBar(75, 100); // "███████░░░"

// Markdown
const text = `${bold('Important:')} ${inlineCode('npm install')}`;
```

### Validators

```typescript
import { isValidUrl, isValidAmount, validateArgs } from '@tiltcheck/discord-utils';

// URL validation
if (isValidUrl(userInput)) {
  // Process URL
}

// Amount validation
const result = isValidAmount('99.99', 1, 1000);
if (result.valid) {
  console.log('Amount:', result.value);
} else {
  console.error(result.error);
}

// Command args validation
const argsCheck = validateArgs(args, 2, 4); // Min 2, max 4 args
if (!argsCheck.valid) {
  return reply(argsCheck.error);
}
```

## Available Embeds

- `createEmbed()` - Basic embed with branding
- `successEmbed()` - Green checkmark embed
- `errorEmbed()` - Red error embed
- `warningEmbed()` - Yellow warning embed
- `infoEmbed()` - Blue info embed
- `linkScanEmbed()` - Link scan result
- `trustScoreEmbed()` - Casino/user trust score
- `tipEmbed()` - Tip confirmation
- `bonusEmbed()` - Bonus tracker

## Colors

```typescript
import { Colors } from '@tiltcheck/discord-utils';

Colors.PRIMARY; // Discord blurple
Colors.SUCCESS; // Green
Colors.WARNING; // Yellow
Colors.DANGER; // Red
Colors.SAFE; // Safe links
Colors.SUSPICIOUS; // Suspicious links
Colors.HIGH_RISK; // High-risk links
Colors.CRITICAL; // Critical risk
```

## Development

```bash
# Build
npx pnpm --filter @tiltcheck/discord-utils build

# Dev mode (watch)
npx pnpm --filter @tiltcheck/discord-utils dev
```
