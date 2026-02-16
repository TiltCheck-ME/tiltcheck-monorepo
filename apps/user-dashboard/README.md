# TiltCheck User Dashboard

User-facing dashboard for account and profile management across the TiltCheck ecosystem.

## Features

### Discord OAuth Login
- One-click Discord authentication
- Auto-link TiltCheck account
- Avatar & username display
- Role-based access

### Unified Profile
- Cross-module profile view
- Discord account info
- Wallet addresses
- Survey profile
- Game stats
- Activity summary

### Wallet Management
- View all registered wallets
- Add new wallet (x402, Phantom, Solflare)
- Set primary wallet
- Wallet verification status
- Balance overview

### QualifyFirst Integration
- Survey profile editor
- Trait management
- Earnings tracker
- Withdrawal requests ($5 minimum)
- Match history
- Screen-out tracking

### Transaction History
- Tips sent & received
- Withdrawals processed
- Survey completions
- Game winnings
- Sortable & filterable
- Export to CSV

### Activity Feed
- Recent actions across all modules
- Tips, surveys, games, promos
- Real-time updates
- Filter by module

### Preferences & Settings
- Notification preferences
- Privacy controls
- Language selection
- Display options

### Security
- Active sessions
- Login history
- Connected wallets
- Security alerts

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Configure environment:
```bash
cp .env.example .env
# Add Discord OAuth credentials
```

3. Start the dashboard:
```bash
pnpm start
```

4. Access at `http://localhost:3002`

## Environment Variables

- `USER_DASHBOARD_PORT` - Port (default: 3002)
- `SESSION_SECRET` - Session encryption key
- `DISCORD_CLIENT_ID` - Discord OAuth client ID
- `DISCORD_CLIENT_SECRET` - Discord OAuth secret
- `DISCORD_CALLBACK_URL` - OAuth callback URL

## Discord OAuth Setup

1. Go to https://discord.com/developers/applications
2. Create new application
3. Add OAuth2 redirect: `http://localhost:3002/auth/discord/callback`
4. Copy Client ID and Secret to `.env`

## Integration

The user dashboard integrates with:
- **JustTheTip** - Wallet service for tips/withdrawals
- **QualifyFirst** - Survey profile and earnings
- **DA&D** - Game stats
- **Event Router** - Real-time updates
- **Discord** - OAuth authentication

## Non-Custodial

This dashboard follows TiltCheck's non-custodial architecture:
- Only stores public wallet addresses
- Never stores private keys
- Users maintain complete control
- Direct wallet-to-wallet transfers
- Treasury payouts for earnings

## User Guide

### First Time Setup
1. Login with Discord
2. Add your wallet (x402 recommended)
3. Set up QualifyFirst profile
4. Configure preferences

### Managing Wallets
1. Go to Wallets tab
2. Click "Add Wallet"
3. Enter address and provider
4. Verify ownership (signature)
5. Set as primary if desired

### Withdrawing Earnings
1. Complete surveys on QualifyFirst PWA
2. Check earnings in dashboard
3. Request withdrawal (min $5.00)
4. Funds sent to primary wallet within 24h

### Viewing Activity
- All cross-module activity in Activity tab
- Filter by module or activity type
- Real-time updates

---

Built for degens, by degens. 👤
