# TiltGuard Extension - Live Backend Testing Guide

## ✅ Backend Server is Running!

The TiltGuard API server is now live at **http://localhost:3333**

## Quick Test Commands

```bash
# Health check
curl http://localhost:3333/api/health

# Premium plans
curl http://localhost:3333/api/premium/plans

# Create guest user
curl -X POST http://localhost:3333/api/auth/guest \
  -H "Content-Type: application/json" \
  -d '{"username":"TestUser"}'

# Check vault (replace USER_ID with actual ID from auth response)
curl http://localhost:3333/api/vault/guest_1234567890

# Deposit to vault
curl -X POST http://localhost:3333/api/vault/guest_1234567890/deposit \
  -H "Content-Type: application/json" \
  -d '{"amount": 100.50}'
```

## Extension Testing Checklist

### 1. Load Extension
- [ ] Open Chrome: `chrome://extensions/`
- [ ] Enable "Developer mode"
- [ ] Click "Load unpacked"
- [ ] Select `browser-extension/dist` folder
- [ ] Extension icon appears in Chrome toolbar

### 2. Open a Casino Site
- [ ] Visit any casino website (e.g., stake.com, bovada.lv)
- [ ] TiltGuard sidebar appears on the right side
- [ ] See "TiltGuard" logo and header

### 3. Test Authentication

#### Guest Mode:
- [ ] Click "Continue as Guest"
- [ ] Server creates guest account (check terminal logs)
- [ ] Sidebar shows main content
- [ ] Username shows "Guest"
- [ ] Tier shows "Free Tier"

#### Discord Mode (Demo):
- [ ] Click "Continue with Discord"
- [ ] Enter a username when prompted
- [ ] Server creates Discord account
- [ ] Sidebar shows main content
- [ ] Username shows your entered name

### 4. Test Dashboard Button
- [ ] Click "📊 Dashboard" button
- [ ] New window opens with JSON data
- [ ] Data shows:
  - User info
  - Stats (sessions, bets, wagered, wins)
  - Vault balance
  - Tilt score
  - Recent sessions

### 5. Test Vault Button
- [ ] Click "🔒 Vault" button
- [ ] New window opens with vault data
- [ ] Shows vault balance (initially $0.00)
- [ ] Shows locked status
- [ ] Shows transaction history

### 6. Test Wallet Button
- [ ] Click "💰 Wallet" button
- [ ] New window opens with wallet data
- [ ] Shows demo wallet address
- [ ] Shows balance
- [ ] Shows provider (phantom)

### 7. Test Vault Deposit

#### Current Balance:
- [ ] Enter a test balance in the sidebar (manually edit sessionStats or wait for gameplay)
- [ ] Click "Vault Current Balance"
- [ ] Confirm the deposit
- [ ] Alert shows success message
- [ ] Vault balance updates in sidebar
- [ ] Current balance resets to $0.00

#### Custom Amount:
- [ ] Click "Vault Custom Amount"
- [ ] Enter amount (e.g., 50.00)
- [ ] Alert shows success
- [ ] Vault balance increases
- [ ] Check vault button to see updated balance

### 8. Test Premium Upgrade
- [ ] Click "Upgrade to Premium" button
- [ ] See list of available plans
- [ ] Confirm upgrade
- [ ] Alert shows success
- [ ] User tier updates to "✨ Premium"

### 9. Test Session Export
- [ ] Click "📥 Export Session Data"
- [ ] JSON file downloads
- [ ] File named like: `tiltguard-session-1234567890.json`
- [ ] Open file and verify session data

### 10. Test License Verification
- [ ] Should automatically verify casino domain
- [ ] Shows license status (Licensed/Unlicensed)
- [ ] Shows license authority if legitimate

## Server Logs

Watch the server logs for real-time API calls:

```bash
tail -f /Users/fullsail/Desktop/tiltcheck-monorepo/tiltcheck-monorepo/browser-extension/server.log
```

You should see:
- `POST /api/auth/guest` when authenticating
- `GET /api/vault/:userId` when opening vault
- `POST /api/vault/:userId/deposit` when depositing
- `GET /api/dashboard/:userId` when opening dashboard
- etc.

## Troubleshooting

### "Cannot connect to server"
```bash
# Check if server is running
curl http://localhost:3333/api/health

# If not running, start it:
cd /Users/fullsail/Desktop/tiltcheck-monorepo/tiltcheck-monorepo/browser-extension
nohup node server/api.js > server.log 2>&1 &
```

### "Buttons do nothing"
- Rebuild extension: `pnpm build`
- Reload extension in Chrome
- Check browser console for errors (F12)

### "Extension not loading updated code"
- Remove extension from Chrome
- Delete `dist` folder
- Rebuild: `pnpm build`
- Re-add extension

### Server Port Already in Use
```bash
# Kill process on port 3333
lsof -ti:3333 | xargs kill -9

# Restart server
nohup node server/api.js > server.log 2>&1 &
```

## API Endpoints Reference

### Authentication
- `POST /api/auth/guest` - Create guest session
- `POST /api/auth/discord` - Discord OAuth (demo)
- `GET /api/auth/me` - Get current user

### Vault
- `GET /api/vault/:userId` - Get vault info
- `POST /api/vault/:userId/deposit` - Deposit funds
- `POST /api/vault/:userId/withdraw` - Withdraw funds
- `POST /api/vault/:userId/lock` - Lock vault

### Dashboard
- `GET /api/dashboard/:userId` - Get dashboard data

### Wallet
- `GET /api/wallet/:userId` - Get wallet info

### Premium
- `GET /api/premium/plans` - List plans
- `POST /api/premium/upgrade` - Upgrade tier

### Session
- `POST /api/session` - Create session
- `PATCH /api/session/:sessionId` - Update session
- `GET /api/session/:sessionId` - Get session

### License
- `GET /api/license/verify?domain=example.com` - Verify license

### Health
- `GET /api/health` - Server status

## Next Steps

Once basic testing is complete:

1. **Integration with TiltCheck Services**
   - Connect to trust-rollup for tilt scores
   - Connect to dashboard for analytics
   - Connect to collectclock for fee collection

2. **Database Persistence**
   - Add Supabase or PostgreSQL
   - Store users, vaults, sessions permanently

3. **Real Discord OAuth**
   - Set up Discord application
   - Add OAuth flow with redirect URL
   - Store Discord tokens securely

4. **Advanced Features**
   - WebSocket for real-time updates
   - Auto-save sessions to backend
   - Tilt score calculation from gameplay
   - AI insights integration

5. **Production Deployment**
   - Deploy API to Render/Fly.io
   - Update extension to use production URL
   - Add rate limiting and security
   - Set up monitoring and logging
