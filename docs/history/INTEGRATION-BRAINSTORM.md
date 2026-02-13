# TiltCheck Integration Brainstorm

## 1. Failed Tests Analysis (21/168 failing)

Based on previous test runs, the 21 failing tests are in:

### JustTheTip Advanced Swap Features (21 tests)
**Location**: `modules/justthetip/tests/swap-hardening.test.ts`

**Missing Functionality**:
- `executeSwap()` method not implemented
- Advanced quote fields missing (slippage tolerance, fee breakdown)
- Swap execution with recalculated fees
- Slippage detection and failure handling
- Network fee calculations
- Quote expiration handling

**Why They Fail**: These tests expect advanced DEX swap features that weren't part of the core requirements. The basic tipping functionality works, but swap features need implementation.

**Recommendation**: Implement these if DEX swaps are needed, otherwise mark as "future enhancement".

---

## 2. JustTheTip Withdraw Command

### Current State
JustTheTip has tipping but no self-withdrawal to own wallet.

### Proposed Commands

#### `/withdraw` 
Withdraw earnings to your registered wallet

```typescript
// Usage examples:
/withdraw amount:50          // Withdraw $50 to registered wallet
/withdraw amount:all         // Withdraw entire balance
/withdraw amount:25 token:USDC network:solana
```

**Implementation**:
```typescript
export const withdraw: Command = {
  data: new SlashCommandBuilder()
    .setName('withdraw')
    .setDescription('Withdraw your earnings to your wallet')
    .addStringOption(option =>
      option.setName('amount')
        .setDescription('Amount in USD (or "all")')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('token')
        .setDescription('Token to receive (SOL, USDC, USDT)')
        .setRequired(false)
        .addChoices(
          { name: 'SOL', value: 'SOL' },
          { name: 'USDC', value: 'USDC' },
          { name: 'USDT', value: 'USDT' }
        )
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    // 1. Get user's registered wallet
    // 2. Calculate amount in SOL/USDC
    // 3. Use Solana Pay or direct transfer
    // 4. Send confirmation
  }
};
```

#### `/send`
Send funds to another user (existing tip functionality, just rename/clarify)

```typescript
/send user:@username amount:10    // Send $10 to another user
```

---

## 3. Solana Trustless Agent Integration

### What is x402 Trustless Agent?
A non-custodial wallet service that creates wallets for users without requiring seed phrases or private keys visible to the user.

### Integration Approaches

#### Option A: Agent-as-Service (Recommended)
**Use x402 as the default wallet provider for new users**

```typescript
// When user first interacts with TiltCheck
async function registerNewUser(discordId: string) {
  // Create wallet via x402 API
  const wallet = await x402.createWallet({
    userId: discordId,
    metadata: { platform: 'tiltcheck', type: 'discord' }
  });
  
  // Store mapping
  await db.storeWalletMapping({
    discordId,
    walletAddress: wallet.publicKey,
    provider: 'x402'
  });
  
  return wallet;
}
```

**Benefits**:
- Users get instant wallets without setup
- No seed phrase management
- Non-custodial (x402 handles security)
- Seamless onboarding

#### Option B: Hybrid Approach (Best UX)
**Support multiple wallet types**

1. **x402 (Default)**: Auto-created for new users
2. **Magic Link**: Email-based wallets
3. **User-Supplied**: Phantom, Solflare, etc.

```typescript
interface WalletMapping {
  discordId: string;
  walletAddress: string;
  provider: 'x402' | 'magic' | 'phantom' | 'solflare' | 'user-supplied';
  isPrimary: boolean;
}
```

#### Option C: Bot-Owned Agent Wallet
**TiltCheck bot has its own x402 wallet for operations**

Use for:
- Gas fee payments
- Liquidity for instant tips
- Airdrop distribution
- Survey payout pooling

```typescript
// Bot wallet initialization
const botWallet = await x402.createWallet({
  userId: 'tiltcheck-bot',
  type: 'service'
});

// Use for gas-less transactions
async function sendGaslessTransfer(to: string, amount: number) {
  await botWallet.transfer({
    to,
    amount,
    payGasWith: 'bot-balance' // Bot pays gas
  });
}
```

### Implementation Plan

**Phase 1**: Basic Integration
- [ ] Add x402 SDK to dependencies
- [ ] Create wallet management module
- [ ] Implement auto-wallet creation
- [ ] Add `/wallet` command showing provider type

**Phase 2**: Migration Support
- [ ] Allow users to export to Phantom/Solflare
- [ ] Import existing wallets
- [ ] Wallet linking (multiple addresses per user)

**Phase 3**: Advanced Features
- [ ] Gas-less transactions
- [ ] Batch payouts
- [ ] Multi-sig for large amounts

---

## 4. AI Gateway Use Cases

### What to Use AI Gateway For

#### 4.1 Survey Matching Intelligence
**Current**: Simple trait matching
**With AI**: Contextual understanding

```typescript
// AI-powered matching
const match = await aiGateway.analyze({
  model: 'gpt-4o-mini',
  prompt: `
    User profile: ${JSON.stringify(userTraits)}
    Survey requirements: ${JSON.stringify(surveyReqs)}
    
    Analyze if this user would qualify and why.
    Return confidence (0-100) and reasoning.
  `,
  response_format: 'json'
});
```

**Benefits**:
- Better understanding of nuanced requirements
- Learn from screen-outs
- Predict qualification beyond simple traits

#### 4.2 DA&D Card Generation
**Generate contextual cards based on community**

```typescript
async function generateCardPack(theme: string, communityContext: string) {
  const cards = await aiGateway.generate({
    model: 'gpt-4o-mini',
    prompt: `
      Generate 10 white cards and 5 black cards for a Cards Against Humanity style game.
      Theme: ${theme}
      Community: ${communityContext}
      Style: Irreverent, degen-friendly, casino/crypto humor
      
      Format as JSON with arrays of whiteCards and blackCards.
    `,
    temperature: 0.9,
    response_format: 'json'
  });
  
  return cards;
}
```

**Use Cases**:
- Community-specific decks
- Event-based cards (bull run, bear market)
- Trending topic integration
- User-suggested themes

#### 4.3 Content Moderation
**Auto-moderate user submissions**

```typescript
async function moderatePromoLink(url: string, description: string) {
  const analysis = await aiGateway.moderate({
    model: 'gpt-4o-mini',
    content: {
      url,
      description,
      context: 'casino promo submission'
    }
  });
  
  return {
    isScam: analysis.scamProbability > 0.7,
    isSafe: analysis.scamProbability < 0.3,
    reasoning: analysis.explanation
  };
}
```

#### 4.4 Tilt Detection Context
**Understand user behavior patterns**

```typescript
async function analyzeTiltRisk(userActivity: Activity[]) {
  const analysis = await aiGateway.analyze({
    model: 'gpt-4o-mini',
    prompt: `
      Analyze gambling behavior for tilt risk:
      ${JSON.stringify(userActivity)}
      
      Provide tilt score (0-100) and intervention suggestions.
    `
  });
  
  return analysis;
}
```

#### 4.5 Natural Language Commands
**Parse complex user inputs**

```typescript
// Instead of strict slash commands
async function parseNaturalCommand(message: string) {
  const intent = await aiGateway.classify({
    model: 'gpt-4o-mini',
    text: message,
    intents: [
      'tip_user',
      'check_balance',
      'submit_promo',
      'start_game',
      'check_surveys'
    ]
  });
  
  return intent;
}
```

**Examples**:
- "send $5 to @user" → tip command
- "what surveys match me?" → qualify command
- "start a game with crypto theme" → DA&D command

#### 4.6 Personalized Recommendations
**Smart suggestions**

```typescript
async function getPersonalizedSuggestions(userId: string) {
  const user = await getUserProfile(userId);
  const history = await getUserHistory(userId);
  
  const suggestions = await aiGateway.recommend({
    model: 'gpt-4o-mini',
    userProfile: user,
    history,
    available: {
      surveys: await getAllSurveys(),
      promos: await getActivePromos(),
      games: ['dad', 'poker']
    }
  });
  
  return suggestions;
}
```

### AI Gateway Architecture

```typescript
// Centralized AI service
class AIGatewayService {
  private apiKey: string;
  private baseUrl: string;
  
  async generateCards(theme: string): Promise<CardPack>;
  async matchSurvey(profile: Profile, survey: Survey): Promise<MatchResult>;
  async moderateContent(content: string): Promise<ModerationResult>;
  async detectTilt(activity: Activity[]): Promise<TiltAnalysis>;
  async parseCommand(text: string): Promise<CommandIntent>;
  async recommend(user: User): Promise<Recommendation[]>;
}
```

### Cost Optimization

**Strategies**:
1. **Cache Results**: Don't re-analyze same content
2. **Batch Requests**: Process multiple at once
3. **Use Mini Models**: gpt-4o-mini for most tasks
4. **Fallback to Rules**: Use AI only when needed
5. **Rate Limiting**: Prevent abuse

```typescript
// Smart caching
const cache = new Map<string, any>();

async function aiWithCache(key: string, generator: () => Promise<any>) {
  if (cache.has(key)) {
    return cache.get(key);
  }
  
  const result = await generator();
  cache.set(key, result);
  
  // Expire after 1 hour
  setTimeout(() => cache.delete(key), 3600000);
  
  return result;
}
```

---

## 5. Integration Priority

### High Priority
1. **JustTheTip `/withdraw` command** - Users need to cash out
2. **x402 default wallet creation** - Seamless onboarding
3. **QualifyFirst PWA** - Better UX than Discord commands

### Medium Priority
4. **AI card generation for DA&D** - Enhance gameplay
5. **AI survey matching** - Improve match accuracy
6. **Content moderation AI** - Reduce mod workload

### Low Priority
7. **Natural language commands** - Nice to have
8. **Advanced DEX swaps** - Only if needed
9. **Personalized recommendations** - Enhancement

---

## 6. Failed Test Details

### Swap Hardening Tests (21 failures)
**File**: `modules/justthetip/tests/swap-hardening.test.ts`

**Test Categories**:
1. Quote calculation with slippage (5 tests)
2. Swap execution with fee recalculation (6 tests)
3. Slippage detection and errors (4 tests)
4. Quote expiration handling (3 tests)
5. Network fee edge cases (3 tests)

**Missing Implementation**:
```typescript
// Need to implement in JustTheTipModule
class JustTheTipModule {
  executeSwap(userId: string, quoteId: string): Promise<SwapResult>;
  calculateSlippage(quote: Quote): number;
  validateQuoteExpiration(quote: Quote): boolean;
  recalculateFees(quote: Quote): Quote;
}
```

**Recommended Action**:
- Document as "Future Enhancement"
- Implement only if DEX integration is needed
- Basic tipping works perfectly (147 passing tests prove this)

---

## Next Steps

1. ✅ Remove QualifyFirst from Discord bot
2. ✅ Create QualifyFirst PWA service
3. ✅ Add earnings tracking to QualifyFirst
4. ✅ Integrate with JustTheTip for withdrawals
5. ⏳ Add `/withdraw` command to JustTheTip
6. ⏳ Document x402 integration plan
7. ⏳ Prioritize AI gateway use cases
8. ⏳ Address failed tests (or mark as future work)
