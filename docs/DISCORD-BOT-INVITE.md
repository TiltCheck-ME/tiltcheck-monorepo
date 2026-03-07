# TiltCheck Discord Community & Bot Setup

## Discord Server Information

**TiltCheck Main Server:**
- **Server ID:** `1446973117472964620`
- **Invite Link:** [https://discord.gg/PdjhpmRNdj](https://discord.gg/PdjhpmRNdj)
- **Purpose:** Main community hub for TiltCheck ecosystem discussion, support, and announcements

---

## JustTheTip Discord Bot

The **JustTheTip Bot** is the primary Discord bot for the TiltCheck ecosystem, providing:
- Non-custodial Solana tipping (`/tip send`)
- Wallet registration and management (`/tip wallet`)
- Link scanning and trust assessment (`/suslink scan`)
- Support ticketing (`/support`)
- Trust dashboard (`/trust`)
- Vault management for self-control (`/tip lock`)
- And much more!

### Bot Information

- **Bot Name:** JustTheTip
- **Client ID:** `1445916179163250860`
- **Bot Invite Link:** [https://discord.com/oauth2/authorize?client_id=1445916179163250860](https://discord.com/oauth2/authorize?client_id=1445916179163250860)

### Adding the Bot to Your Server

1. Click the invite link above
2. Select your server from the dropdown
3. Grant required permissions:
   - `Send Messages`
   - `Embed Links`
   - `Attach Files`
   - `Read Message History`
   - `Use Application Commands` (for slash commands)
4. Complete the authorization

### Permissions Required

The bot operates with minimal permissions:
- **Send Messages** - Post responses and alerts
- **Embed Links** - Format rich embeds with trust data
- **Read Message History** - Context for message reactions
- **Use Application Commands** - Slash command support (`/tip`, `/trust`, etc.)

---

## Alert Channels Configuration

The bot can be configured to post trust alerts and support tickets to specific channels.

### Environment Variables

Set these in your `.env.local` or deployment environment:

```bash
# Discord Alert Channels
TRUST_ALERTS_CHANNEL_ID=1447524353263665252
SUPPORT_CHANNEL_ID=1447524748069306489
```

### Alert Types

**Trust Alerts Channel** posts:
- Casino trust score changes (nerfs, updates)
- Domain/link trust assessments (malicious URLs)
- Degen trust events (user generosity/behavior)
- Bonus nerf detections

**Support Channel** posts:
- User support requests (`/support topic message`)
- Support tickets with topic and description

---

## Quick Setup for Developers

### Environment Configuration

1. **Copy the environment template:**
   ```bash
   cp .env.template .env.local
   ```

2. **Update with your values:**
   ```bash
   # Required
   TIP_DISCORD_TOKEN=your_token_from_discord_developers
   TIP_DISCORD_CLIENT_ID=1445916179163250860
   DISCORD_GUILD_ID=1446973117472964620
   
   # Optional but recommended for alerts
   TRUST_ALERTS_CHANNEL_ID=1447524353263665252
   SUPPORT_CHANNEL_ID=1447524748069306489
   ```

3. **Start the bot:**
   ```bash
   pnpm dev
   ```

---

## Bot Commands

### Tipping (`/tip`)
- `/tip send @user amount` - Send a non-custodial tip
- `/tip wallet` - Register or manage your wallet
- `/tip balance` - Check wallet balance
- `/tip lock amount duration` - Lock funds for self-control
- `/tip airdrop amount slots` - Create a giveaway

### Link Scanning (`/suslink`)
- `/suslink scan <url>` - Scan a URL for risk
- `/suslink submit <url>` - Submit a promo link

### Trust & Monitoring
- `/trust` - Open your personalized trust dashboard
- `/tiltcheck` - Tilt monitoring status
- `/cooldown status` - Check cooldown status

### Support & Help
- `/support topic message` - Request help with detailed info
- `/help` - Show all available commands

---

## Discord Bot Roadmap

### ✅ Currently Implemented
- Non-custodial Solana tipping with wallet support
- Link scanning and risk assessment
- Vault/time-lock functionality
- Support ticketing with AlertService
- Trust alerts posted to configured channels
- DM-based AI assistant for natural language help

### 🚀 Planned Features
- Multi-currency support (LTC, Ethereum)
- Enhanced trust analytics
- Custom role-based access
- Guild-specific settings
- Advanced audit logs

---

## Troubleshooting

### Bot Not Responding
1. Check bot is added to server with proper permissions
2. Verify `DISCORD_TOKEN` is valid in environment
3. Check Discord server status
4. Review bot health endpoint: `http://localhost:8081/health`

### Commands Not Showing
1. Ensure bot has `Use Application Commands` permission
2. Run `/reload` in Discord (if available)
3. Wait up to 1 hour for global command sync

### Alerts Not Posting
1. Verify channel IDs are correct
2. Ensure bot has `Send Messages` permission in alert channels
3. Check channels exist and bot can access them
4. Review bot logs for error messages

---

## Support

- **Discord:** [TiltCheck Community](https://discord.gg/PdjhpmRNdj)
- **Documentation:** See `/docs/tiltcheck/` for detailed guides
- **Issues:** Report on GitHub or in Discord #support
