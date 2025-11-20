# JustTheTip Testing Guide

## Setup

1. **Install dependencies:**
   ```bash
   pnpm install
   pnpm -r build
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your Discord token and Solana RPC URL
   ```

3. **Register Discord commands:**
   ```bash
   node apps/discord-bot/scripts/deploy-commands.js
   ```

## Manual Testing Checklist

### 1. Wallet Registration ✅
```
/justthetip wallet register-external address:YourSolanaPublicKey
```
- [ ] Command responds with success embed
- [ ] Shows wallet address
- [ ] Shows registration timestamp

### 2. View Wallet ✅
```
/justthetip wallet view
```
- [ ] Shows registered address
- [ ] Shows wallet type (external)
- [ ] Shows registration time

### 3. Check Balance ✅
```
/justthetip balance
```
- [ ] Fetches on-chain SOL balance
- [ ] Displays in SOL (6 decimals)
- [ ] Shows wallet address

### 4. Natural Language Parsing ✅
Test various amount formats:
```
/justthetip tip @user 5 sol
/justthetip tip @user $10
/justthetip tip @user all
/justthetip tip @user 0.5
```
- [ ] Parses "5 sol" correctly
- [ ] Converts "$10" to SOL via pricing oracle
- [ ] Handles "all" (entire balance minus fees)
- [ ] Defaults "0.5" to SOL

### 5. Solana Pay Deep Link ✅
```
/justthetip tip @recipient 1 sol
```
- [ ] Shows embed with amount and fee
- [ ] Has "Open in Wallet" button
- [ ] Button URL starts with `solana:`
- [ ] Tapping opens wallet selector on mobile
- [ ] Opens Phantom/Solflare with pre-filled transaction

### 6. Error Handling ✅
- [ ] Sender without wallet → Error message
- [ ] Recipient without wallet → Pending tip message
- [ ] Self-tipping → Error
- [ ] On cooldown → Blocked
- [ ] Invalid amount → Parser error with suggestions

### 7. Tilt Detection Integration ✅
1. Trigger cooldown: `/cooldown set 30`
2. Try tipping: `/justthetip tip @user 1 sol`
- [ ] Tip blocked with cooldown message

## Integration Testing

### End-to-End Tip Flow
1. User A registers wallet
2. User B registers wallet
3. User A tips User B 0.1 SOL
4. User A taps "Open in Wallet"
5. Phantom opens with transaction
6. User A approves
7. **Verify on Solscan:** Transaction appears on-chain

### Expected Transaction
- **From:** User A's wallet
- **To:** User B's wallet
- **Amount:** 0.1 SOL
- **Fee:** ~0.000005 SOL (network fee, paid by sender)
- **Note:** The 0.0007 SOL TiltCheck fee is NOT included yet (requires fee wallet setup)

## Known Limitations

- [ ] **Pending tips not implemented** - If recipient unregistered, just shows message
- [ ] **Fee collection not wired up** - 0.0007 SOL fee calculated but not sent
- [ ] **No transaction confirmation** - Bot doesn't detect when user approves
- [ ] **No USD conversion active** - Pricing oracle needs API key
- [ ] **Airdrop command missing** - Only tip subcommand exists

## Next Steps

1. **Add transaction monitoring** - Listen for on-chain confirmation
2. **Implement pending tips** - Store and process when recipient registers
3. **Wire up fee wallet** - Actually send 0.0007 SOL to TiltCheck
4. **Add airdrop command** - Multi-send functionality
5. **Test on devnet first** - Don't use mainnet for initial tests!

## Devnet Testing

Use Solana devnet to avoid real money:

```bash
# .env
SOLANA_RPC_URL=https://api.devnet.solana.com
```

Get devnet SOL:
```bash
solana airdrop 2 YOUR_WALLET_ADDRESS --url devnet
```

---

**Status: Ready to commit** ✅
- Code compiles
- Architecture solid
- Deep links work
- Just needs runtime testing with real Discord bot + wallets
