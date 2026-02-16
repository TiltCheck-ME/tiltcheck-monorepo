# User Code Claimer Service

Background worker that processes claim jobs for users. Uses per-user API keys to automatically claim eligible promo codes from the database.

## Features

- Job queue-based processing (BullMQ)
- Per-user rate limiting
- Eligibility checking before claiming
- Claim history tracking (claimed, skipped, failed)
- Retry logic with exponential backoff
- User API key isolation (server-side only)

## Configuration

Set the following environment variables:

```bash
# Redis connection for BullMQ
REDIS_URL=redis://localhost:6379

# Database connection
DATABASE_URL=postgresql://user:password@localhost:5432/tiltcheck

# Rate limiting
CLAIMS_PER_MINUTE_PER_USER=5
CLAIMS_MAX_RETRY_ATTEMPTS=3

# Job processing
CLAIM_WORKER_CONCURRENCY=10
CLAIM_JOB_TIMEOUT=30000

# Mock mode for testing
STAKE_MOCK_API=true
```

## Usage

```bash
# Development
pnpm dev

# Production
pnpm build
pnpm start
```

## Database Schema

The service requires these tables:

```sql
-- User API keys (encrypted at rest)
CREATE TABLE user_api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  api_key_encrypted TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP
);

-- Claim history
CREATE TABLE claim_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  code TEXT NOT NULL,
  status TEXT NOT NULL, -- 'claimed', 'skipped', 'failed'
  reason TEXT,
  reward_type TEXT,
  reward_amount DECIMAL,
  reward_currency TEXT,
  attempted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user_api_keys(user_id)
);

-- Rate limiting
CREATE TABLE rate_limits (
  user_id TEXT PRIMARY KEY,
  window_start TIMESTAMP NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_claim_history_user_id ON claim_history(user_id, attempted_at DESC);
CREATE INDEX idx_claim_history_status ON claim_history(status);
```

## How It Works

1. **Job Creation**: API endpoint creates claim jobs for users
2. **Queue Processing**: BullMQ processes jobs with concurrency control
3. **Rate Limiting**: Checks per-user rate limits before processing
4. **Eligibility Check**: Verifies code eligibility using Stake API
5. **Claim Attempt**: Attempts to claim code if eligible
6. **History Storage**: Records result (claimed/skipped/failed)
7. **Retry Logic**: Retries failed claims with backoff

## Job Types

### ClaimJob

Process a single code claim for a user:

```typescript
{
  userId: string;
  code: string;
  priority?: number;
}
```

### BulkClaimJob

Process multiple codes for a user:

```typescript
{
  userId: string;
  codes: string[];
}
```

## API Integration

Works with the backend API endpoints:

- `POST /api/claim/submit` - Submit API key and trigger claims
- `GET /api/claim/status/:userId` - Get claim status
- `GET /api/claim/history/:userId` - Get claim history

## Rate Limiting

Per-user rate limiting prevents abuse:
- Default: 5 claims per minute per user
- Configurable via environment variables
- Uses sliding window algorithm
- Respects Stake API rate limits

## Error Handling

The service handles various error scenarios:
- Invalid API keys → marked as failed
- Ineligible codes → marked as skipped
- Network errors → retried with backoff
- Rate limit exceeded → delayed retry
