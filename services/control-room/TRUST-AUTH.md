# Control Room Trust-Based Authentication

## Overview

The Control Room now uses a **multi-factor trust system** instead of simple passwords:

1. **Discord OAuth** - Verify identity
2. **JustTheTip Wallet** - Registered wallet address
3. **Wallet Signature** - Prove ownership
4. **Trust System Badge NFT** - Verify trust level

## Trust Levels

| Level | Access | Capabilities |
|-------|--------|--------------|
| **viewer** | Read-only | View status, metrics, logs, docs |
| **moderator** | Read + Limited Write | + AI terminal, restart services |
| **admin** | Full Access | + Kill all, process management, settings |

## Authentication Flow

```
User visits Control Room
    ↓
Click "Login with Discord"
    ↓
Discord OAuth (verify identity)
    ↓
Check: Does user have registered wallet?
    ├─ NO → Show wallet registration
    ↓
Check: Is wallet signature verified?
    ├─ NO → Request signature
    ↓
Check: Does wallet own Trust System Badge NFT?
    ├─ NO → Access Denied
    ↓
Check: Does NFT trust level meet requirement?
    ├─ NO → Access Denied
    ↓
✅ ACCESS GRANTED
```

## Setup

### 1. Discord OAuth

Create a Discord app at https://discord.com/developers/applications

```bash
# In .env
DISCORD_CLIENT_ID=your_oauth_app_id
DISCORD_CLIENT_SECRET=your_oauth_secret
DISCORD_CALLBACK_URL=http://localhost:3001/auth/discord/callback
```

### 2. Trust NFT Collection

Create or specify your Trust System Badge NFT collection:

```bash
# In .env
TRUST_NFT_COLLECTION=your_nft_collection_mint_address
REQUIRED_TRUST_LEVEL=admin  # admin, moderator, or viewer
```

### 3. Solana RPC

```bash
# In .env
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
# Or devnet: https://api.devnet.solana.com
```

## NFT Metadata Format

Your Trust System Badge NFTs should have metadata like:

```json
{
  "name": "TiltCheck Trust Badge",
  "symbol": "TRUST",
  "attributes": [
    {
      "trait_type": "role",
      "value": "admin"  // or "moderator" or "viewer"
    },
    {
      "trait_type": "trust_score",
      "value": 100
    }
  ]
}
```

## User Registration Flow

### Step 1: Discord Login

User clicks "Login with Discord" and authorizes the app.

### Step 2: Wallet Registration

If no wallet registered:

```javascript
// Frontend calls:
POST /api/wallet/register
{
  "walletAddress": "ABC...XYZ",
  "signature": "base64_signature",
  "message": "I verify ownership of this wallet for TiltCheck Control Room access"
}
```

### Step 3: Trust Verification

Backend checks:
1. ✅ Signature valid?
2. ✅ Wallet owns NFT in Trust collection?
3. ✅ NFT trust level sufficient?

### Step 4: Access Granted/Denied

- ✅ **Granted**: User sees Control Room dashboard
- ❌ **Denied**: User sees requirements and what's missing

## Development Mode

For testing without real NFTs:

```bash
NODE_ENV=development
```

This will:
- Accept any wallet registration
- Mock NFT ownership with "admin" role
- Allow bypassing real Solana RPC calls

## Production Deployment

1. Set `NODE_ENV=production`
2. Configure real Discord OAuth credentials
3. Specify real Trust NFT collection address
4. Use secure session secret
5. Enable HTTPS
6. Point to mainnet Solana RPC

## Security Features

### What This Prevents:

- ✅ **Unauthorized Access**: Only trusted users with NFT badges can access
- ✅ **Stolen Credentials**: Discord + wallet + NFT required (3 factors)
- ✅ **Impersonation**: Wallet signature proves ownership
- ✅ **Privilege Escalation**: NFT metadata defines access level

### What Users Must Control:

- Discord account security
- Wallet private keys
- NFT badge ownership

### Admin Audit Log

All admin actions are logged:

```
[ADMIN ACTION] jmenichole restarted event-router
[ADMIN ACTION] jmenichole killed all services
[AI TERMINAL] moderator_user: restart failed services
```

## API Endpoints

### Auth Endpoints

```
GET  /auth/discord                  - Start Discord OAuth
GET  /auth/discord/callback         - OAuth callback
GET  /auth/logout                   - Logout
GET  /api/auth/me                   - Get current user
POST /api/wallet/register           - Register & verify wallet
```

### Protected Endpoints

All require authentication + appropriate trust level:

```
GET  /api/system/status             - View only
GET  /api/system/metrics            - View only
GET  /api/process/logs/:service     - View only
GET  /api/docs/list                 - View only
GET  /api/docs/:filename            - View only

POST /api/ai/chat                   - Moderator+
POST /api/process/restart/:service  - Admin only
POST /api/process/kill-all          - Admin only
```

## Comparison to Password Auth

### Old Way (Password):
```
✅ Simple to implement
❌ Password can be shared
❌ Password can be stolen
❌ No accountability
❌ All-or-nothing access
```

### New Way (Trust System):
```
✅ Multi-factor security
✅ Non-transferable (wallet signature)
✅ Theft-resistant (need Discord + wallet + NFT)
✅ Full audit trail
✅ Granular access levels
✅ Aligns with Web3 ethos
✅ Leverages existing trust system
```

## Implementation Status

- [x] Discord OAuth integration
- [x] Wallet registration with signature verification
- [x] NFT ownership checking
- [x] Trust level hierarchy
- [x] Role-based access control
- [x] Admin audit logging
- [x] Development mode for testing
- [ ] Production NFT minting (manual for now)
- [ ] Trust level management UI
- [ ] NFT badge visual display in UI

## Recommended Trust Badge Distribution

### Admin Level (Full Access)
- You (project owner)
- Senior developers
- DevOps team lead

### Moderator Level (Operations)
- Support team
- Community managers
- Junior developers

### Viewer Level (Monitoring)
- Investors
- Advisors
- Trusted community members

## Future Enhancements

1. **Dynamic Trust Scoring**: Update NFT metadata based on actions
2. **Temporary Access**: Time-limited badges for contractors
3. **Multi-sig Actions**: Require 2+ admins for critical operations
4. **Trust Delegation**: Admins can grant temporary moderator access
5. **Activity Dashboard**: Visual analytics of who does what

---

**This is the right approach for a Web3 project. It's not too much - it's professional security that aligns with your ecosystem.**
