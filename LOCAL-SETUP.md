# Local Development Setup Complete ✅

## Environment Variables

Your `.env.local` file now contains:
- ✓ DISCORD_TOKEN
- ✓ DISCORD_CLIENT_ID  
- ✓ DISCORD_GUILD_ID
- ✓ NODE_ENV=production

These are synced from your Railway "DegensAgainstDecency" production environment.

## Running Services Locally

### Discord Bot (with hot reload)
```bash
pnpm --filter @tiltcheck/discord-bot dev
```

### All Services (if running locally)
```bash
pnpm dev
```

### JustTheTip Tests
```bash
pnpm --filter @tiltcheck/justthetip test
```

## Wallet Registration Testing

The wallet persistence issue from earlier has been fixed:
- **Path**: `data/justthetip-wallets.json` (at monorepo root)
- **Built**: Fresh build in `modules/justthetip/dist/`
- **Tests**: Run `pnpm test` in the justthetip module

### To test registration locally:
```bash
# Start Discord bot
pnpm --filter @tiltcheck/discord-bot dev

# In Discord, run:
/tip wallet register-external address:<solana-address>

# Check persistence:
cat data/justthetip-wallets.json | jq '.wallets'
```

## Deployment

### To Fly.io (TiltCheck main app)
```bash
git add -A
git commit -m "your changes"
git push origin main
# Fly auto-deploys on push
```

### To Railway (if needed)
```bash
railway up
# Or Railway auto-deploys on push if webhooks are configured
```

## Notes

- `.env.local` is git-ignored (safe to commit secrets here for local dev)
- Railway environment already has all vars set
- Wallet data persists to disk (not ephemeral)
- Bot logs available via `railway logs` (production)

## Troubleshooting

**Missing DISCORD_TOKEN?**
```bash
railway variables  # View current vars
source .env.local  # Load into shell
env | grep DISCORD # Verify loaded
```

**Wallet not saving?**
- Check `data/` directory exists
- Verify write permissions: `ls -la data/`
- Check logs for `[JustTheTip]` messages

**Bot won't start?**
```bash
SKIP_DISCORD_LOGIN=true pnpm --filter @tiltcheck/discord-bot dev
# Or check config:
echo $DISCORD_TOKEN | head -c 20
```
