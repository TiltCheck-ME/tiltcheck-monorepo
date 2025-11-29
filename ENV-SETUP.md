# Environment Variables Quick Reference

## Critical (Must Set)

These MUST be configured for the system to function:

```bash
# Discord Bot
DISCORD_TOKEN=<your_bot_token>
DISCORD_CLIENT_ID=<your_client_id>

# Solana
SOLANA_RPC_URL=https://api.devnet.solana.com
JUSTTHETIP_FEE_WALLET=<wallet_address>

# Database
SUPABASE_URL=<your_project_url>
SUPABASE_ANON_KEY=<your_anon_key>

# Security
JWT_SECRET=<min_32_chars>
SESSION_SECRET=<min_32_chars>
ADMIN_PASSWORD=<secure_password>
```

## Optional (Recommended)

These enable additional features:

```bash
# Discord OAuth (for web login)
DISCORD_CLIENT_SECRET=<secret>
DISCORD_CALLBACK_URL=http://localhost:3001/auth/discord/callback

# External APIs
OPENAI_API_KEY=<for_ai_features>
# Note: Pricing oracle uses Jupiter Price API (https://price.jup.ag) - no API key required

# Notifications
DISCORD_WEBHOOK_URL=<webhook_url>
```

## Defaults (Can Override)

These have sensible defaults but can be customized:

```bash
# Ports
PORT=3000
CONTROL_ROOM_PORT=3001
CASINO_API_PORT=6002

# Data Retention
DASHBOARD_EVENTS_KEEP_DAYS=7
EVIDENCE_RETENTION_DAYS=30

# Features
NODE_ENV=development
ENABLE_CASINO_VERIFICATION=true
```

## Setup Instructions

1. **Quick Start:**
   ```bash
   cp .env.template .env
   # Edit .env and fill in CRITICAL variables
   pnpm install
   pnpm build
   pnpm test
   ```

2. **Get Discord Credentials:**
   - Go to https://discord.com/developers/applications
   - Create new application
   - Copy Bot Token → `DISCORD_TOKEN`
   - Copy Application ID → `DISCORD_CLIENT_ID`
   - OAuth2 tab → Copy Client Secret → `DISCORD_CLIENT_SECRET`

3. **Get Supabase Credentials:**
   - Go to https://supabase.com
   - Create new project
   - Settings → API → Copy URL and anon key

4. **Generate Secrets:**
   ```bash
   # Generate secure random strings
   openssl rand -base64 32  # For JWT_SECRET
   openssl rand -base64 32  # For SESSION_SECRET
   ```

## Verification

Test your configuration:

```bash
# Run health checks
pnpm run test

# Check service status
curl http://localhost:8081/health  # Discord bot
curl http://localhost:8082/health  # DAD bot
curl http://localhost:8083/health  # Event router
```

## See Also

- **Full Documentation:** `AUDIT-REPORT.md`
- **Template File:** `.env.template`
- **Example Values:** `.env.example`
