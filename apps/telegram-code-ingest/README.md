# Telegram Code Ingest Service

Polls public Telegram channels (`@StakeUSDailyDrops`, `@StakecomDailyDrops`) and stores detected Stake promo codes in the database for later claiming.

## Features

- Monitors multiple Telegram channels concurrently
- Detects and extracts Stake promo codes from messages
- Stores codes with metadata (source channel, timestamp, expiration)
- Deduplicates codes to avoid storing duplicates
- Emits events when new codes are detected

## Configuration

Set the following environment variables:

```bash
# Telegram API credentials (get from https://my.telegram.org)
TELEGRAM_API_ID=your_api_id
TELEGRAM_API_HASH=your_api_hash
TELEGRAM_SESSION_STRING=your_session_string

# Channels to monitor (comma-separated)
TELEGRAM_CHANNELS=@StakeUSDailyDrops,@StakecomDailyDrops

# Polling interval in seconds (default: 60)
TELEGRAM_POLL_INTERVAL=60

# Database connection
DATABASE_URL=postgresql://user:password@localhost:5432/tiltcheck
# Or use SQLite for development:
# DATABASE_URL=sqlite://./data/codes.db
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

The service requires a `promo_codes` table:

```sql
CREATE TABLE promo_codes (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  source_channel TEXT NOT NULL,
  detected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  metadata JSONB,
  status TEXT DEFAULT 'active' -- active, expired, invalid
);

CREATE INDEX idx_promo_codes_status ON promo_codes(status);
CREATE INDEX idx_promo_codes_detected_at ON promo_codes(detected_at DESC);
```

## How It Works

1. **Channel Monitoring**: Connects to Telegram and monitors specified channels
2. **Code Detection**: Uses regex patterns to extract promo codes from messages
3. **Validation**: Checks if code matches Stake promo code format
4. **Storage**: Saves new codes to database with metadata
5. **Events**: Emits `code.detected` events for downstream processing
