# Non-Custodial Architecture for TiltCheck

## Overview

TiltCheck must be **100% non-custodial** - the bot/service NEVER holds user funds or private keys. Users always maintain complete control of their assets.

---

## Bot-Owned Agent Flow (Non-Custodial Pattern)

### What is a Bot-Owned Agent?

The bot has its own wallet (via x402 or similar) but **only for operational purposes**, NOT for holding user funds.

### Bot Agent Use Cases (All Non-Custodial)

#### 1. Gas Fee Sponsorship
Bot pays gas fees so users don't need SOL for transactions.

```typescript
// User wants to withdraw USDC but has no SOL for gas
async function gaslessWith draw(userWallet: string, amountUSDC: number) {
  // Bot uses its wallet to pay gas, NOT to hold funds
  const tx = await createTransaction({
    from: userWallet,           // User's wallet
    to: destinationAddress,
    amount: amountUSDC,
    token: 'USDC',
    feePayer: botWallet.publicKey  // Bot pays gas
  });
  
  // User signs with their key
  const signedTx = await userWallet.signTransaction(tx);
  
  // Bot submits (pays gas) but doesn't control funds
  await connection.sendTransaction(signedTx);
}
```

**Key Point**: Bot pays fees, user controls funds.

#### 2. Transaction Batching
Bot coordinates multiple user transactions for efficiency.

```typescript
// Multiple tips happening simultaneously
async function batchTips(tips: Tip[]) {
  // Create batch transaction
  const batchTx = new Transaction();
  
  for (const tip of tips) {
    // Each user signs their own instruction
    const instruction = await createTipInstruction({
      from: tip.senderWallet,
      to: tip.recipientWallet,
      amount: tip.amount
    });
    batchTx.add(instruction);
  }
  
  // Bot pays single gas fee for entire batch
  batchTx.feePayer = botWallet.publicKey;
  
  // Each user signs their part
  for (const tip of tips) {
    await tip.senderWallet.partialSign(batchTx);
  }
  
  // Bot submits
  await connection.sendTransaction(batchTx);
}
```

**Key Point**: Bot batches and pays gas, users sign their own transfers.

#### 3. Liquidity for Instant Tips (CRITICAL: Must be Non-Custodial)

**WRONG APPROACH (Custodial - DON'T DO THIS)**:
```typescript
// ❌ BAD: Bot holds user funds
async function wrongInstantTip(from: User, to: User, amount: number) {
  // User sends to bot's wallet
  await from.wallet.transfer(botWallet, amount);
  
  // Bot holds funds
  // Bot sends to recipient
  await botWallet.transfer(to.wallet, amount);
  
  // ❌ Problem: Bot had custody of user's money
}
```

**RIGHT APPROACH (Non-Custodial)**:
```typescript
// ✅ GOOD: Escrow smart contract or direct transfer
async function correctInstantTip(from: User, to: User, amount: number) {
  // Option A: Direct transfer (user → recipient)
  const tx = await createTransferTransaction({
    from: from.wallet.publicKey,
    to: to.wallet.publicKey,
    amount,
    feePayer: botWallet.publicKey // Bot pays gas
  });
  
  await from.wallet.signTransaction(tx);
  await botWallet.signTransaction(tx); // Signs as fee payer only
  await connection.sendTransaction(tx);
  
  // Option B: Escrow contract (user → contract → recipient)
  const escrowTx = await escrowProgram.createTip({
    sender: from.wallet.publicKey,
    recipient: to.wallet.publicKey,
    amount,
    timeout: 60 // Auto-refund after 60 seconds if not claimed
  });
  
  await from.wallet.signTransaction(escrowTx);
  await connection.sendTransaction(escrowTx);
  
  // Recipient claims directly from contract
  // ✅ No bot custody at any point
}
```

---

## Non-Custodial JustTheTip Architecture

### Core Principle
**Users hold their own wallets. Bot facilitates transactions but NEVER touches user funds.**

### User Wallet Options (All Non-Custodial)

#### Option 1: x402 Trustless Wallets (Recommended)
User gets auto-created wallet via x402, keys managed by x402 (not TiltCheck).

```typescript
// User registration
async function registerUser(discordId: string) {
  // x402 creates wallet (non-custodial service)
  const wallet = await x402.createWallet({
    userId: discordId,
    metadata: { platform: 'tiltcheck' }
  });
  
  // TiltCheck stores mapping (NOT keys)
  await db.storeWalletMapping({
    discordId,
    walletAddress: wallet.publicKey,
    provider: 'x402',
    // NO private key stored
  });
  
  return wallet.publicKey;
}

// When user wants to withdraw
async function withdraw(discordId: string, amount: number, destination: string) {
  const mapping = await db.getWalletMapping(discordId);
  
  if (mapping.provider === 'x402') {
    // x402 handles signing (user authenticates via Discord OAuth)
    const tx = await x402.createTransaction({
      userId: discordId,
      from: mapping.walletAddress,
      to: destination,
      amount
    });
    
    // User approves in x402 UI (not TiltCheck)
    const signed = await x402.requestUserSignature(discordId, tx);
    
    // Bot submits (pays gas)
    batchTx.feePayer = botWallet.publicKey;
    await connection.sendTransaction(signed);
  }
  
  // ✅ TiltCheck never had access to private keys
}
```

#### Option 2: User-Supplied Wallets
User connects Phantom, Solflare, etc.

```typescript
async function connectExternalWallet(discordId: string, walletAddress: string) {
  // User proves ownership by signing message
  const message = `Connect wallet to TiltCheck\nDiscord: ${discordId}\nNonce: ${randomNonce()}`;
  const signature = await userWallet.signMessage(message);
  
  if (await verifySignature(walletAddress, message, signature)) {
    await db.storeWalletMapping({
      discordId,
      walletAddress,
      provider: 'user-supplied'
      // NO keys stored, user keeps wallet
    });
  }
}

// Tips go directly to user's wallet
async function tipWithExternalWallet(from: string, to: string, amount: number) {
  // Both users use their own wallets
  // Bot just coordinates and pays gas
  const tx = await createTransferTransaction({
    from: fromWallet,
    to: toWallet,
    amount,
    feePayer: botWallet.publicKey
  });
  
  // Sender signs with their wallet (Phantom, etc.)
  // TiltCheck never sees private key
  const signed = await fromWallet.signTransaction(tx);
  await connection.sendTransaction(signed);
}
```

---

## Complete Non-Custodial Flow Examples

### Example 1: Survey Payout
User completes survey, earns $10, withdraws to their wallet.

```typescript
// 1. User completes survey
async function recordSurveyCompletion(userId: string, surveyId: string, payoutUSD: number) {
  // Track earnings (just a number, not holding funds)
  await qualifyFirst.recordSurveyResult({
    userId,
    surveyId,
    status: 'completed',
    payout: payoutUSD
  });
  
  // Earnings are IOUs until withdrawn
  // ✅ No actual funds held by TiltCheck
}

// 2. User requests withdrawal
async function withdrawSurveyEarnings(userId: string, destinationWallet: string) {
  const earnings = await qualifyFirst.getEarnings(userId);
  
  if (earnings < 5) {
    throw new Error('Minimum $5');
  }
  
  // Convert USD to SOL/USDC using pricing oracle
  const amountUSDC = earnings;
  
  // Get user's wallet (non-custodial)
  const userWallet = await getUserWallet(userId);
  
  // Bot sends from TREASURY (not user funds), user receives
  // This is OK because earnings are rewards/payments FROM TiltCheck
  const tx = await createTransferTransaction({
    from: treasuryWallet.publicKey,  // TiltCheck's treasury
    to: destinationWallet,
    amount: amountUSDC,
    token: 'USDC',
    feePayer: botWallet.publicKey
  });
  
  // Treasury signs (this is TiltCheck's money)
  await treasuryWallet.signTransaction(tx);
  await connection.sendTransaction(tx);
  
  // Zero out earnings
  await qualifyFirst.deductEarnings(userId, earnings);
  
  // ✅ User received payment directly to their wallet
  // ✅ TiltCheck never held user deposits
}
```

### Example 2: User-to-User Tip (Peer-to-Peer)
@Alice tips @Bob $5.

```typescript
async function tipUser(fromDiscordId: string, toDiscordId: string, amountUSD: number) {
  // Get both wallets
  const senderWallet = await getUserWallet(fromDiscordId);
  const recipientWallet = await getUserWallet(toDiscordId);
  
  // Convert USD to USDC
  const amountUSDC = amountUSD;
  
  // Create transfer (sender → recipient directly)
  const tx = await createTransferTransaction({
    from: senderWallet.publicKey,
    to: recipientWallet.publicKey,
    amount: amountUSDC,
    token: 'USDC',
    feePayer: botWallet.publicKey  // Bot pays gas
  });
  
  if (senderWallet.provider === 'x402') {
    // User signs via x402 (non-custodial)
    const signed = await x402.requestUserSignature(fromDiscordId, tx);
    await connection.sendTransaction(signed);
  } else if (senderWallet.provider === 'user-supplied') {
    // User signs with their Phantom/Solflare
    // Send transaction link to user in Discord DM
    const approvalLink = await createApprovalRequest(tx, fromDiscordId);
    await sendDM(fromDiscordId, `Sign this tip: ${approvalLink}`);
    
    // Wait for signature
    const signed = await waitForUserSignature(tx.id);
    await connection.sendTransaction(signed);
  }
  
  // ✅ Funds went directly from sender to recipient
  // ✅ Bot never held custody
}
```

---

## Treasury vs User Funds

### Treasury Wallet (Bot/Service Owned)
**Purpose**: Pay rewards, airdrops, and incentives TO users

```typescript
const treasuryWallet = {
  purpose: 'Pay users for services rendered',
  holds: 'TiltCheck funds (not user deposits)',
  usedFor: [
    'Survey completion payouts',
    'Referral bonuses',
    'Contest prizes',
    'Gas fee reimbursements'
  ],
  notUsedFor: [
    'Holding user deposits',
    'Holding tip balances',
    'Escrow for withdrawals'
  ]
};
```

### User Wallets (User Owned)
**Purpose**: User's personal wallet for receiving and sending

```typescript
const userWallet = {
  ownedBy: 'User (via x402 or self-custody)',
  holds: 'User's personal funds',
  tiltCheckAccess: 'None (only public key)',
  usedFor: [
    'Receiving tips',
    'Receiving survey payouts',
    'Sending tips',
    'Withdrawing to external wallets'
  ]
};
```

---

## Security Guarantees

### ✅ What TiltCheck CAN Do
1. **Coordinate** transactions between users
2. **Pay gas fees** for user transactions
3. **Pay rewards** from treasury to users
4. **Batch** multiple user transactions
5. **Track** earnings as IOUs until payout

### ❌ What TiltCheck CANNOT Do
1. **Access** user private keys
2. **Hold** user deposits
3. **Control** user funds
4. **Move** user funds without signature
5. **Freeze** user wallets

---

## Implementation Checklist

- [ ] Remove any code that holds user funds in bot wallet
- [ ] Integrate x402 for auto-wallet creation
- [ ] Add wallet connection for Phantom/Solflare
- [ ] Implement transaction signing flow (user approves)
- [ ] Treasury wallet for payouts only
- [ ] Gas fee sponsorship from bot wallet
- [ ] Earnings tracked as IOUs, not actual balances
- [ ] Direct transfers (user → user or treasury → user)
- [ ] Never intermediate through bot wallet
- [ ] Document non-custodial architecture

---

## Summary

**Bot-Owned Agent** = Bot has wallet for GAS FEES and TREASURY PAYOUTS only

**Non-Custodial** = Users always control their funds, TiltCheck only coordinates

**Key Principle**: If TiltCheck shuts down tomorrow, users still have 100% access to their funds because they hold their own keys.
