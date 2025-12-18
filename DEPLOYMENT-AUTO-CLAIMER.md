# TiltCheck Auto-Claimer Deployment

This document describes how to deploy the TiltCheck Auto-Claimer system.

## Architecture

The Auto-Claimer consists of four components:

1. **Telegram Code Ingest Service** - Monitors Telegram channels for promo codes
2. **User Code Claimer Worker** - Background worker that processes claim jobs
3. **Backend API** - HTTP endpoints for frontend integration
4. **Web Frontend** - React app for user interaction

## Deployment Options

### Option 1: GitHub Pages (Frontend Only)

The web frontend is automatically deployed to GitHub Pages via `.github/workflows/pages.yml`:

- URL: `https://yourdomain.github.io/auto-claimer/`
- Trigger: Push to `main` branch
- Build: Vite build process
- Static hosting: No server required

**Backend API must be deployed separately** (see Option 2 or 3).

### Option 2: Railway (Full Stack)

Deploy all components together using Railway:

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login and link project
railway login
railway link

# 3. Set environment variables
railway variables set TELEGRAM_API_ID="your_api_id"
railway variables set TELEGRAM_API_HASH="your_api_hash"
railway variables set REDIS_URL="redis://default:password@host:port"
railway variables set DATABASE_URL="postgresql://user:pass@host:port/db"

# 4. Deploy
railway up
```

Railway will:
- Build the backend API (includes claim routes)
- Serve the web frontend as static files
- Run worker services as separate processes

### Option 3: Split Deployment

Deploy components separately for scalability:

#### Backend API
Deploy to Railway or any Node.js hosting:
```bash
cd backend
npm run build
npm start
```

#### Telegram Ingest Service
Deploy as a background service:
```bash
cd services/telegram-code-ingest
npm run build
npm start
```

#### User Code Claimer Worker
Deploy as a background service (requires Redis):
```bash
cd services/user-code-claimer
npm run build
npm start
```

#### Web Frontend
Deploy to GitHub Pages (automatic) or any static hosting:
```bash
cd apps/web
npm run build
# Upload dist/ to hosting
```

## Environment Variables

### Required

```bash
# Telegram API
TELEGRAM_API_ID=your_api_id
TELEGRAM_API_HASH=your_api_hash
TELEGRAM_SESSION_STRING=your_session_string

# Redis for job queue
REDIS_URL=redis://localhost:6379

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/tiltcheck

# API key encryption
API_KEY_ENCRYPTION_KEY=32_byte_hex_string
```

### Optional

```bash
# Telegram channels to monitor (comma-separated)
TELEGRAM_CHANNELS=@StakeUSDailyDrops,@StakecomDailyDrops

# Polling interval in seconds
TELEGRAM_POLL_INTERVAL=60

# Rate limiting
CLAIMS_PER_MINUTE_PER_USER=5
CLAIMS_MAX_RETRY_ATTEMPTS=3

# Worker configuration
CLAIM_WORKER_CONCURRENCY=10
CLAIM_JOB_TIMEOUT=30000

# Mock mode for testing
STAKE_MOCK_API=true
```

## Database Setup

Run the SQL schema files to create required tables:

```sql
-- Promo codes table
CREATE TABLE promo_codes (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  source_channel TEXT NOT NULL,
  detected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  metadata JSONB,
  status TEXT DEFAULT 'active'
);

-- User API keys (encrypted)
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
  attempted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Rate limiting
CREATE TABLE rate_limits (
  user_id TEXT PRIMARY KEY,
  window_start TIMESTAMP NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0
);

-- Indexes
CREATE INDEX idx_promo_codes_status ON promo_codes(status);
CREATE INDEX idx_promo_codes_detected_at ON promo_codes(detected_at DESC);
CREATE INDEX idx_claim_history_user_id ON claim_history(user_id, attempted_at DESC);
CREATE INDEX idx_claim_history_status ON claim_history(status);
```

## Redis Setup

The system uses BullMQ for job queue management. Any Redis instance works:

- **Railway**: Add Redis addon
- **Upstash**: Free Redis service
- **ElastiCache**: AWS managed Redis
- **Local**: `docker run -p 6379:6379 redis`

## Monitoring

### Health Checks

Backend API provides health endpoint:
```
GET /api/health
```

### Logs

Check service logs:
```bash
# Railway
railway logs

# Docker
docker logs container_name

# PM2
pm2 logs
```

### Metrics to Monitor

- Codes detected per hour
- Claim success rate
- Failed claims (with reasons)
- API response times
- Worker job queue length
- Database connection pool

## Security Considerations

1. **API Keys**: User Stake API keys are encrypted at rest using AES-256
2. **HTTPS**: Required in production for secure API key transmission
3. **Rate Limiting**: Per-user limits prevent abuse
4. **CORS**: Configure allowed origins in production
5. **Environment Variables**: Never commit secrets to git

## Troubleshooting

### Telegram Connection Issues
- Verify API credentials
- Check session string is valid
- Ensure channels are public or bot has access

### Claim Failures
- Enable `STAKE_MOCK_API=true` for testing
- Check Stake API rate limits
- Verify user API keys are valid

### Worker Not Processing Jobs
- Verify Redis connection
- Check worker logs for errors
- Ensure concurrency settings are appropriate

### Frontend Can't Connect to Backend
- Check VITE_API_URL environment variable
- Verify CORS configuration
- Check backend health endpoint

## Rollback

To rollback a deployment:

```bash
# Railway
railway rollback

# GitHub Pages
# Revert the commit and push
git revert <commit>
git push origin main
```

## Support

For deployment issues:
1. Check service logs
2. Review environment variables
3. Test with mock mode enabled
4. Open an issue in the repository
