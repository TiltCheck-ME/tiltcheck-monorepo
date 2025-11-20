# JustTheTip Module

**Solana P2P tipping system for Discord communities.**

Migrated from [github.com/jmenichole/Justthetip](https://github.com/jmenichole/Justthetip)

## Features

- **Non-custodial P2P transfers** via Solana Pay (x402 Trustless Agent)
- **Multi-wallet support**: x402, Magic Link, Phantom, Solflare, WalletConnect
- **USD to SOL conversion** via pricing oracle abstraction (`@tiltcheck/pricing-oracle`)
- **Pending tips** for unregistered users (auto-process when they register)
- **Transaction tracking** with Solana signatures
- **Amount validation**: $0.10 - $100.00 USD per tip
- **Event-driven architecture** for loose coupling

## API

### Tipping

```typescript
import { justthetip } from '@tiltcheck/justthetip';

// Initiate a tip (USD converted at current SOL oracle price)
const tip = await justthetip.initiateTip('alice', 'bob', 10.00, 'USD');
// Returns: { id, senderId, recipientId, usdAmount, solAmount, status, reference... }

// Complete tip with transaction signature
await justthetip.completeTip(tip.id, 'signature123abc');

// Get user's tips (sent + received)
const tips = justthetip.getTipsForUser('alice');

// Get pending tips (waiting for wallet registration)
const pending = justthetip.getPendingTipsForUser('bob');
```

### Wallet Registration

```typescript
// Register wallet (x402 Trustless Agent)
await justthetip.registerWallet('user123', 'walletAddress', 'x402');

// Register with Magic Link
await justthetip.registerWallet('user456', 'magicAddress', 'magic');

// Register with Phantom
await justthetip.registerWallet('user789', 'phantomAddress', 'phantom');
```

### Wallet Management

```typescript
// Register a wallet (prevents duplicate registration)
const wallet = await justthetip.registerWallet(
  'userId123',
  'walletAddress',
  'phantom' // or 'x402' | 'magic' | 'solflare' | 'other'
);

// Disconnect wallet (warns if user has pending tips)
const result = await justthetip.disconnectWallet('userId123');
if (!result.success) {
  console.log(result.message); // Error message
} else if (result.pendingTipsCount > 0) {
  console.log(`⚠️ ${result.pendingTipsCount} pending tips will remain until re-registration`);
}

// Check if user has wallet
if (justthetip.hasWallet('userId123')) {
  const wallet = justthetip.getWallet('userId123');
  console.log(`Wallet: ${wallet.address} (${wallet.type})`);
}
```

### Solana Pay URLs

```typescript
// Generate Solana Pay URL for direct P2P transfer
const url = justthetip.generateSolanaPayURL(
  'recipientAddress',
  0.05, // SOL amount
  'reference-uuid',
  'Tip via JustTheTip'
);
// Returns: solana:recipientAddress?amount=0.05&reference=...
```

### Pricing Oracle & Jupiter Swap (Stub Integration)

Cross-token tipping uses a simulated Jupiter quote & swap flow. Pricing comes from the in-memory oracle (`@tiltcheck/pricing-oracle`). Real integration will replace both with external services.

```typescript
// Initiate token-based tip (auto-swaps USDC -> SOL internally)
const { tip, quote } = await justthetip.initiateTokenTip(
  'alice',        // sender
  'bob',          // recipient
  10,             // 10 USDC
  'USDC'
);

console.log(quote); // swap.quote event also published
// {
//   id: 'quote-uuid',
//   inputMint: 'USDC',
//   outputMint: 'SOL',
//   inputAmount: 10,
//   estimatedOutputAmount: 0.05,
//   rate: 0.005,
//   slippageBps: 50
// }

// Execute the swap (stub completes instantly)
const execution = await justthetip.executeSwap('alice', quote.id);
console.log(execution.status); // 'completed' (swap.completed event)
```

Stub Supported Tokens: `SOL`, `USDC`, `BONK`, `WBTC`
Validation: USD equivalent must remain within $0.10–$100.00

Roadmap:
1. Replace in-memory oracle with external oracle (Pyth / Switchboard)
2. Use real Jupiter route planning + slippage control
3. Transaction construction & signing (Phantom / Backpack)
4. SPL token decimals & precise rounding
5. Multi-hop route transparency & fees breakdown

## Events

### Published Events

- `tip.initiated` - User initiates a tip
- `tip.completed` - Tip completed with signature
- `tip.pending.resolved` - Pending tip resolved after wallet registration
- `wallet.registered` - User registers a wallet
- `wallet.disconnected` - User disconnects their wallet
- `swap.quote` - Token swap quote generated (stub)
- `swap.completed` - Token swap executed (stub)

### Event Data Structures

```typescript
// tip.initiated
{
  id: string;
  senderId: string;
  recipientId: string;
  senderWallet: string;
  recipientWallet?: string;
  usdAmount: number;
  solAmount: number;
  solPrice: number;
  reference: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: number;
}

// wallet.registered
// wallet.disconnected
{
  userId: string;
  wallet: WalletInfo; // The disconnected wallet info
}
{
  userId: string;
  address: string;
  type: 'x402' | 'magic' | 'phantom' | 'solflare' | 'other';
  registeredAt: number;
}
```

## Testing

```bash
pnpm test modules/justthetip
```

All tests cover:
- ✅ Tipping flow with validation
- ✅ Wallet registration (multiple types)
- ✅ Pending tips resolution
- ✅ Tip completion with signatures
- ✅ User tip queries
- ✅ Solana Pay URL generation

## Next Steps

- [ ] Integrate real-time SOL price service
- [ ] Add Jupiter swap integration for cross-token tipping
- [ ] Implement airdrop functionality
- [ ] Add leaderboards (top tippers/recipients)
- [ ] Create Discord bot commands (/tip, /register-magic, /balance, /history)
- [ ] Add transaction monitoring for Solana Pay URLs
- [ ] Implement wallet balance checking
- [ ] Add support for SPL tokens (USDC, BONK, etc.)

## Migration Notes
- All logic is placeholder; replace with real validation and completion flows as code is migrated.
- Flat-fee rule (0.07 SOL) applies unless changed in future updates.
- Non-custodial flow enforced—no funds are held by the module.

## Test Coverage
- Minimal smoke test ensures event subscription and method presence.
- Ready for expansion as real tip logic is added.

---
TiltCheck Ecosystem © 2024–2025. For architecture and migration details, see `/docs/tiltcheck/`.
