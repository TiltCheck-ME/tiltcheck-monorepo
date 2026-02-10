# Stake API Module

Reusable client for interacting with the Stake.com API. Provides methods to check promo code eligibility and submit claims.

## Features

- Check code eligibility (wager requirements, user eligibility)
- Submit promo code claims
- Handle rate limiting and retries
- Type-safe API responses
- Comprehensive error handling

## Installation

This is a workspace package. Install dependencies at the monorepo root:

```bash
pnpm install
```

## Usage

```typescript
import { StakeClient } from '@tiltcheck/stake';

// Initialize client with user's API key
const client = new StakeClient({
  apiKey: 'user_api_key_here',
  baseUrl: 'https://api.stake.com', // optional, uses default
});

// Check if user is eligible for a code
const eligibility = await client.checkEligibility('FREECODE123');
console.log('Eligible:', eligibility.eligible);
console.log('Reason:', eligibility.reason);

// Claim a code
const result = await client.claimCode('FREECODE123');
console.log('Claimed:', result.success);
console.log('Reward:', result.reward);

// Check wager requirements
const wager = await client.getWagerRequirement('FREECODE123');
console.log('Wager required:', wager.amount);
```

## API Reference

### StakeClient

#### Constructor

```typescript
new StakeClient(config: StakeClientConfig)
```

**Config:**
- `apiKey: string` - User's Stake API key (required)
- `baseUrl?: string` - API base URL (default: 'https://api.stake.com')
- `timeout?: number` - Request timeout in ms (default: 10000)

#### Methods

##### checkEligibility(code: string): Promise<EligibilityResult>

Checks if the user is eligible to claim a code.

**Returns:**
```typescript
{
  eligible: boolean;
  reason?: string;
  wagersRequired?: number;
  expiresAt?: Date;
}
```

##### claimCode(code: string): Promise<ClaimResult>

Attempts to claim a promo code.

**Returns:**
```typescript
{
  success: boolean;
  reward?: {
    type: 'bonus' | 'freespins' | 'rakeback';
    amount: number;
    currency?: string;
  };
  error?: string;
}
```

##### getWagerRequirement(code: string): Promise<WagerRequirement>

Gets the wager requirement for a code.

**Returns:**
```typescript
{
  amount: number;
  currency: string;
  met: boolean;
  remaining: number;
}
```

## Error Handling

The client throws typed errors:

```typescript
try {
  await client.claimCode('INVALID');
} catch (error) {
  if (error instanceof StakeApiError) {
    console.log('API Error:', error.message);
    console.log('Status:', error.statusCode);
  } else if (error instanceof RateLimitError) {
    console.log('Rate limited, retry after:', error.retryAfter);
  }
}
```

## Rate Limiting

The client automatically handles rate limiting:
- Respects `Retry-After` headers
- Implements exponential backoff
- Configurable retry attempts

## Environment Variables

No environment variables required (API keys provided per-instance).

## Testing

```bash
pnpm test
```

## Notes

- **Security**: Never expose API keys in client-side code
- **Rate Limits**: Stake enforces per-user rate limits
- **Mock Mode**: Set `STAKE_MOCK_API=true` for testing without real API calls
