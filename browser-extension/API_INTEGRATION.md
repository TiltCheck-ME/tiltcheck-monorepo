# TiltGuard Browser Extension - API Integration Guide

## Overview

The TiltGuard extension now includes a **live backend API server** that provides real endpoints for:
- 🔐 Authentication (Discord OAuth demo + Guest mode)
- 🔒 Vault management (deposit, withdraw, lock/unlock)
- 💰 Wallet integration
- 📊 Dashboard analytics
- ✨ Premium upgrades
- 📄 License verification
- 📈 Session tracking

## Quick Start

### 1. Install Dependencies

```bash
cd browser-extension
pnpm install
```

### 2. Start the Backend Server

```bash
pnpm server
```

Or use the all-in-one script:

```bash
./start.sh
```

The API server will start on **http://localhost:3333**

### 3. Build & Load Extension

```bash
pnpm build
```

Then load the `dist/` folder in Chrome as an unpacked extension.

## API Endpoints

### Authentication

- `POST /api/auth/guest` - Create guest session
- `POST /api/auth/discord` - Discord OAuth (demo)
- `GET /api/auth/me` - Get current user

### Vault

- `GET /api/vault/:userId` - Get vault balance
- `POST /api/vault/:userId/deposit` - Deposit to vault
- `POST /api/vault/:userId/withdraw` - Withdraw from vault
- `POST /api/vault/:userId/lock` - Lock vault for duration

### Dashboard

- `GET /api/dashboard/:userId` - Get user stats and dashboard data

### Wallet

- `GET /api/wallet/:userId` - Get wallet info

### Premium

- `GET /api/premium/plans` - List premium plans
- `POST /api/premium/upgrade` - Upgrade to premium

### Session

- `POST /api/session` - Create new session
- `PATCH /api/session/:sessionId` - Update session stats
- `GET /api/session/:sessionId` - Get session data

### License

- `GET /api/license/verify?domain=example.com` - Verify casino license

### Health

- `GET /api/health` - Server health check

## Extension Integration

The extension sidebar now makes real API calls:

1. **Authentication**: Click "Continue as Guest" or "Discord Login" to authenticate
2. **Dashboard Button**: Opens a popup window with live dashboard data from API
3. **Vault Button**: Shows vault balance and transactions from API
4. **Wallet Button**: Displays wallet info from API
5. **Vault Current Balance**: Deposits balance to vault via API
6. **Vault Custom Amount**: Prompts for amount and deposits via API
7. **Premium Upgrade**: Shows plans and upgrades via API

## Data Persistence

Currently uses **in-memory storage** (resets on server restart).

For production, replace `Map` objects with:
- PostgreSQL / Supabase
- MongoDB
- Redis for sessions
- File-based JSON (like other TiltCheck services)

## Testing

1. Start server: `pnpm server`
2. Load extension in Chrome
3. Open a casino site
4. Test authentication (guest or Discord demo)
5. Test vault deposit: Enter balance → Click "Vault Current Balance"
6. Test dashboard: Click Dashboard button → See live data
7. Test wallet: Click Wallet button → See wallet data
8. Test premium: Click "Upgrade to Premium" → Choose plan

## Next Steps

- [ ] Integrate real Discord OAuth with client ID/secret
- [ ] Add database persistence (Supabase recommended)
- [ ] Connect to existing TiltCheck services (trust-rollup, dashboard, etc.)
- [ ] Add WebSocket for real-time updates
- [ ] Implement session auto-save to backend
- [ ] Add tilt score calculation from backend
- [ ] Integrate with CollectClock for fee collection
- [ ] Add JustTheTip integration for tips from extension

## Troubleshooting

**"Cannot GET /api/..."**: Server not running. Start with `pnpm server`

**"Network error"**: Check API_BASE URL in `sidebar.ts` matches your server port

**CORS errors**: CORS is enabled on server, but check browser console for details

**Extension not updating**: Rebuild with `pnpm build` and reload extension in Chrome

## Architecture

```
Browser Extension (content.ts + sidebar.ts)
    ↓
  API Calls (fetch)
    ↓
Backend Server (api.js on port 3000)
    ↓
In-Memory Storage (users, vaults, sessions)
    ↓
[Future: Database / TiltCheck Services]
```
