# Running the TiltCheck Discord Bot

## Quick Start

### 1. Set Up Environment
```bash
cp .env.template .env.local
```

Edit `.env.local` and fill in required values:
```bash
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=1445916179163250860
DISCORD_GUILD_ID=1446973117472964620
```

### 2. Run the Bot

**Option A: Full monorepo (includes Dashboard, Landing, etc.)**
```bash
pnpm dev
```

**Option B: Just the Discord Bot**
```bash
pnpm --filter @tiltcheck/discord-bot dev
```

**Option C: Custom port (if 8081 is in use)**
```bash
DISCORD_BOT_HEALTH_PORT=9081 pnpm --filter @tiltcheck/discord-bot dev
```

### 3. Verify It's Running

```bash
curl http://localhost:8081/health
```

Expected output:
```json
{
  "service": "justthetip-bot",
  "ready": true,
  "commands": 21
}
```

---

## What Happens at Startup

When the bot starts, it:

1. **Loads environment** from `.env.local` (root) with fallbacks to app-level `.env`
2. **Initializes services:**
   - SusLink (link scanning)
   - TiltCheck Core (tilt detection)
   - JustTheTip (wallet & tipping)
   - Trust Engines (casino & degen scoring)
   - Alert System (posts to Discord channels)
3. **Loads 21 commands** (tip, support, trust, suslink, etc.)
4. **Subscribes to EventRouter** for:
   - Trust events → posts to #trust-alerts
   - Support requests → posts to #support
5. **Connects to Discord** (requires valid token)

---

## Debugging

### Enable verbose environment loading:
```bash
DEBUG_ENV_LOADING=1 pnpm --filter @tiltcheck/discord-bot dev
```

Shows:
```
[Config] Attempting to load .env files from:
  __dirname: /Users/fullsail/Desktop/tiltcheck-monorepo-fresh/apps/discord-bot/src
  rootEnvLocal: /Users/fullsail/Desktop/tiltcheck-monorepo-fresh/.env.local
  rootEnv: /Users/fullsail/Desktop/tiltcheck-monorepo-fresh/.env
  appEnvLocal: /Users/fullsail/Desktop/tiltcheck-monorepo-fresh/apps/discord-bot/.env.local
  appEnv: /Users/fullsail/Desktop/tiltcheck-monorepo-fresh/apps/discord-bot/.env
```

### Common Issues

| Issue | Solution |
|-------|----------|
| `Missing required env variable: DISCORD_CLIENT_ID` | Make sure `.env.local` exists at monorepo root with `DISCORD_CLIENT_ID=1445916179163250860` |
| Port 8081 in use | Use `DISCORD_BOT_HEALTH_PORT=9081 pnpm --filter...` to pick a different port |
| Commands not showing in Discord | Discord takes up to 1 hour to sync global commands (or use `DISCORD_GUILD_ID` for faster guild-only sync) |
| `Error: login Unauthorized` | Verify `DISCORD_TOKEN` is valid and not expired |

---

## What the Bot Does

### Commands
- **`/tip`** - Send non-custodial Solana tips, manage wallet, lock funds
- **`/suslink`** - Scan URLs for risk, submit/approve promos
- **`/support`** - Request help with details
- **`/trust`** - View personalized trust dashboard
- **`/help`** - List all commands

### Automated Features
- **Trust Alerts** - Posts to #trust-alerts when:
  - Casino trust score changes
  - Domain/link risk detected
  - User generosity/behavior changes
  - Bonus nerfs detected
- **Support Tickets** - Posts to #support when users run `/support`

### Behind the Scenes
- Subscribes to EventRouter for real-time events
- Validates commands with TypeScript
- Integrates with JustTheTip (wallet), SusLink (scanning), TiltCheck Core (tilt detection)
- Posts alerts to configured Discord channels

---

## Configuration Reference

### Required Environment Variables
```bash
DISCORD_TOKEN           # Bot token from Discord Developer Portal
DISCORD_CLIENT_ID       # 1445916179163250860
DISCORD_GUILD_ID        # 1446973117472964620 (optional, for guild-only deploy)
```

### Optional Alert Channels
```bash
TRUST_ALERTS_CHANNEL_ID=1447524353263665252   # Posts trust events here
SUPPORT_CHANNEL_ID=1447524748069306489         # Posts support tickets here
```

### Optional Settings
```bash
NODE_ENV=development            # or production
DISCORD_BOT_HEALTH_PORT=8081    # Health endpoint port
SKIP_DISCORD_LOGIN=true         # Skip Discord auth (for CI smoke tests)
DEBUG_ENV_LOADING=1             # Show env file loading paths
```

---

## File Structure

```
apps/discord-bot/
├── src/
│   ├── config.ts                   # Loads .env, validates config
│   ├── index.ts                    # Entry point, initializes services
│   ├── commands/                   # Slash commands
│   ├── handlers/
│   │   ├── commands.ts             # Command loading & routing
│   │   ├── events.ts               # Discord event handling
│   │   ├── dm-handler.ts           # DM with NLP support
│   │   └── trust-alerts-handler.ts # Posts trust events to Discord
│   └── services/
│       └── alert-service.ts        # Centralized alert posting
└── dist/                           # Compiled JavaScript (build output)
```

---

## Next Steps

1. **Add the bot to your Discord server:**
   - https://discord.com/oauth2/authorize?client_id=1445916179163250860

2. **Join the TiltCheck community:**
   - https://discord.gg/PdjhpmRNdj

3. **Read the full documentation:**
   - [QUICKSTART.md](QUICKSTART.md) - Full setup guide
   - [DISCORD-BOT-INVITE.md](DISCORD-BOT-INVITE.md) - Bot details
   - [ALERT-AUTOMATION-SETUP.md](ALERT-AUTOMATION-SETUP.md) - Alert system

---

**Status:** ✅ Bot is fully functional and ready to run!
