# JustTheTip - Feature Status

## ✅ What Works Now

### `/justthetip wallet`
Register and view your Solana wallet:
- **View:** Shows your registered wallet address and type
- **Register External:** Connect Phantom, Solflare, or any Solana wallet
  - Stores Discord ID → Wallet address mapping
  - Non-custodial - you control your keys
  
**Example:**
```
/justthetip wallet register-external address:YourSolanaAddress123...
```

### `/justthetip balance`
Check your SOL balance on-chain in real-time.

### `/justthetip tip`
Send SOL to other Discord users with natural language parsing:

**Natural Language Support:**
- `5 sol` → 5 SOL
- `$10` → Converts USD to SOL
- `all` → Send entire balance (minus fees)
- `0.5` → Defaults to SOL

**How It Works:**
1. Use `/justthetip tip @user 5 sol`
2. Bot generates a **Solana Pay QR code**
3. Open your mobile wallet (Phantom, Solflare, etc)
4. Scan the QR code
5. Approve the transaction in your wallet
6. Tip sent! ⚡

**Features:**
- ✅ Non-custodial (you sign with your wallet)
- ✅ Flat $0.07 fee (0.0007 SOL)
- ✅ Tilt detection blocks (can't tip during cooldown)
- ✅ Natural language parsing ("$5", "all", "0.5 sol")
- ⏳ Pending tips for unregistered users (24h hold)

---

## 🚧 Coming Soon

### Confirmation Prompts
When natural language is ambiguous:
```
User: "tip @user 5"
Bot: "Did you mean 5 SOL or $5 USD?"
```

### TriviaDrops
AI-generated trivia rounds with prize splits:
- Random questions via Vercel AI SDK
- React with 1️⃣, 2️⃣, 3️⃣, 4️⃣ to answer
- First N correct responders split the pot
- Anti-tilt: fun way to win back losses

### Jupiter Swap Integration
Tip in any SPL token:
- "tip @user 100 USDC"
- Bot swaps to SOL automatically
- Single transaction via Jupiter aggregator

---

## 🏗️ Architecture

### Non-Custodial Design
```
Discord User → Registers Wallet → Bot Stores Mapping
     ↓
User Commands Tip → Bot Generates Solana Pay QR
     ↓
User Scans QR → Signs Transaction in Their Wallet
     ↓
Transaction Sent Directly On-Chain (No Bot Keys!)
```

### Fee Structure
- **0.0007 SOL flat fee** (~$0.07 at $100/SOL)
- **No percentage fees** (not a casino!)
- **No custody** (we never hold your SOL)

### Natural Language Parser
- Supports: SOL, USD, "all", decimals
- Confidence scoring (0-1)
- Ambiguity detection
- Helpful error messages

### Modules
```
@tiltcheck/justthetip
├── wallet-manager.ts     → Register/lookup wallets
├── tip-engine.ts         → Create tip requests
├── airdrop-engine.ts     → Multi-send airdrops
├── solana-pay.ts         → QR code generation
└── pricing-oracle.ts     → USD ↔ SOL conversion

@tiltcheck/natural-language-parser
├── amount-parser.ts      → "5 sol", "$10", "all"
├── duration-parser.ts    → "15s", "all day"
├── target-parser.ts      → "3 poor people", "active users"
└── index.ts              → Combined parser
```

---

## 💻 Developer Notes

### Testing
```bash
# Install dependencies
pnpm install

# Build all modules
pnpm -r build

# Run Discord bot (requires .env with DISCORD_TOKEN)
pnpm --filter @tiltcheck/discord-bot dev
```

### Environment Variables
```env
# Required
DISCORD_TOKEN=your_discord_bot_token
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# Optional (for Magic.link wallets)
MAGIC_SECRET_KEY=your_magic_secret_key
```

### Commands Registration
Run once to register slash commands with Discord:
```bash
node apps/discord-bot/scripts/deploy-commands.js
```

---

## 🎰 TiltCheck Integration

JustTheTip respects TiltCheck cooldowns:
- Users on cooldown **cannot send tips**
- Prevents tilted gambling losses from turning into rage tips
- Safety first! 🛡️

---

## 📝 Example Flow

1. **Register Wallet:**
   ```
   /justthetip wallet register-external address:ABC123...
   ```

2. **Check Balance:**
   ```
   /justthetip balance
   → 💰 Balance: 2.500000 SOL
   ```

3. **Send Tip:**
   ```
   /justthetip tip @bob 0.5 sol
   ```
   Bot shows:
   - QR code image
   - Recipient: @bob
   - Amount: 0.5 SOL
   - Fee: 0.0007 SOL
   - Instructions: "Scan with Phantom/Solflare"

4. **Scan & Approve:**
   - Open Phantom on phone
   - Tap "Scan QR Code"
   - Approve transaction
   - ✅ Tip sent!

---

## 🔒 Security

- **Non-custodial:** We never see your private keys
- **Open source:** All code in this monorepo
- **Solana Pay standard:** Industry-standard QR codes
- **Event logging:** All tips logged to Event Router
- **Tilt protection:** Cooldown enforcement

---

## 🚀 Future Ideas

- **Recurring tips:** Weekly payments to favorite streamers
- **Tip leaderboards:** Top tippers of the month
- **Tip reactions:** React to messages to tip
- **Multi-chain:** Support Ethereum, Base, etc
- **NFT tips:** Send compressed NFTs as tips

---

**Built with:**
- TypeScript
- Solana Web3.js
- Solana Pay
- Discord.js
- Natural Language Processing

**Part of the TiltCheck Ecosystem**
Anti-tilt, pro-transparency, non-custodial, scrappy & cheap 💪
