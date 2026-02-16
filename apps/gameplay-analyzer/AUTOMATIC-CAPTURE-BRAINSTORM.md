# Automatic Gameplay Capture - Brainstorm

## The Challenge

For original casino games (Pump, Keno, Plinko, Mines, etc.), we want to **automatically capture gameplay data** to verify RTP without requiring manual input.

## User Choice: Multiple Approaches Available

**Why not just one approach? Let users choose what works best for them!**

| Approach | Best For | Effort | Accuracy |
|----------|----------|--------|----------|
| 🔌 **Browser Extension** | Desktop players, auto-capture | Install once | ⭐⭐⭐⭐⭐ |
| 📱 **PWA Sidebar** | Mobile, any device | Quick taps | ⭐⭐⭐⭐ |
| 🔐 **Provably Fair Upload** | Historical analysis | Export + upload | ⭐⭐⭐⭐⭐ |
| 📷 **Screen OCR** | Native apps | Grant permission | ⭐⭐⭐ |

Users can mix and match based on their setup:
- **Desktop gamer?** → Use the browser extension for auto-capture
- **Mobile player?** → Use the PWA sidebar with quick-tap buttons
- **Want proof?** → Upload provably fair seeds for cryptographic verification
- **Using native app?** → Screen OCR captures everything visually

---

## Approaches for Automatic Capture

### 1. **Browser Extension with Network Interception** ⭐ Best for Desktop

Intercept WebSocket/API calls between the casino and browser to capture every spin automatically.

```
Casino Server ←→ [Extension intercepts] ←→ Browser UI
                        ↓
                 TiltCheck Analyzer
```

**How it works:**
- Extension uses `chrome.webRequest` API to intercept casino WebSocket messages
- Parse bet requests and result responses
- Extract: wager, multiplier, payout, game type, seed (if provably fair)

**Pros:**
- Zero user input required
- Captures 100% of plays
- Can verify provably fair seeds
- Works in real-time

**Cons:**
- Desktop Chrome/Firefox only
- Needs maintenance when casinos change APIs
- Users must trust extension with network access

**Example WebSocket message (Stake Plinko):**
```json
{
  "type": "plinko:result",
  "data": {
    "betId": "abc123",
    "wager": 1.00,
    "rows": 16,
    "risk": "high",
    "path": [1,0,1,1,0,0,1,0,1,1,0,1,0,0,1,1],
    "multiplier": 110,
    "payout": 110.00,
    "clientSeed": "xyz",
    "serverSeed": "hashed",
    "nonce": 42
  }
}
```

---

### 2. **Provably Fair Seed Verification** 🔐 Cryptographic Approach (IMPLEMENTED)

Instead of capturing every spin, verify the casino's provably fair system.

```
User submits: Server Seed Hash + Client Seed + Nonce Range
TiltCheck: Regenerates all outcomes → Calculates actual RTP
```

**How it works:**
- User exports their bet history from casino (CSV/API)
- TiltCheck recalculates expected outcomes using revealed seeds
- Compare claimed payouts vs mathematically derived payouts

**Supported Input Methods:**
1. **Manual Seed Entry**: Input individual seeds to verify single bets
2. **Archive Upload**: Upload CSV/JSON exports from casinos
3. **Supported Formats**: Stake, BC.Game, Roobet, generic CSV/JSON

**Pros:**
- Cryptographically verifiable
- Works retroactively on historical bets
- Definitive proof of fairness/unfairness
- No real-time capture needed

**Cons:**
- Only works for provably fair games
- Requires user to export/provide seeds
- Post-hoc analysis, not real-time

---

### 3. **Always-On Sidebar Companion** 📊 Best UX (DESIGNED)

TiltCheck runs as a persistent sidebar while user plays in main window.

```
┌─────────────────────────────────────────────────────────┐
│                                    │ 📊 TiltCheck      │
│  Casino Game                       │ ──────────────── │
│  (iframe/main window)              │ Session Stats    │
│                                    │ RTP: 94.2% 🔴    │
│  [Playing Plinko]                  │ P/L: -$45.00     │
│                                    │ Bets: 127        │
│                                    │ ──────────────── │
│                                    │ 🔔 Notifications │
│                                    │ ⚠️ 5 loss streak │
│                                    │ ──────────────── │
│                                    │ 🔒 Vault         │
│                                    │ Locked: $500     │
│                                    │ [Auto @ $1000]   │
│                                    │ ──────────────── │
│                                    │ 💬 Support Bot   │
│                                    │ "Need a break?"  │
│                                    │ ──────────────── │
│                                    │ 👥 Accountability│
│                                    │ [Call Buddy]     │
│                                    │ [Screen Share]   │
│                                    │ ──────────────── │
│                                    │ ⏱️ Cooldown      │
│                                    │ Session: 2h 15m  │
│                                    │ [Take Break]     │
└─────────────────────────────────────────────────────────┘
```

**Sidebar Features:**
- 📊 **Live Stats**: Real-time RTP, P/L, streak tracking
- 🔔 **Smart Notifications**: Anomaly alerts, loss warnings, time reminders
- 🔒 **Auto-Vault**: Lock funds when balance exceeds threshold
- 💬 **Support Bot**: AI chat for help (needs implementation)
- 👥 **Accountability Buddy**: Phone-a-friend, screen share
- ⏱️ **Cooldown Controls**: Self-exclusion, break timers

**User Input Options:**
- Quick-tap buttons for common results
- Voice input for hands-free logging
- Paste from clipboard (copy from casino)

---

### 4. **Screen Capture + OCR** 📱 Works on Mobile

Use device screen recording to capture gameplay, then OCR the results.

```
Casino App/Site → Screen Capture → OCR → TiltCheck Analyzer
```

**How it works:**
- User grants screen capture permission
- AI/ML model trained to recognize game UI elements
- Extract bet amounts, multipliers, results from visual data

**Pros:**
- Works on mobile (iOS/Android)
- Works with native casino apps
- Casino can't detect or block it

**Cons:**
- Battery intensive
- Requires ML model per game
- Less accurate than network interception
- Privacy concerns (capturing screen)

---

### 5. **Casino API Integration** 🤝 Partnership Approach

Partner with casinos to receive official gameplay data feeds.

```
Casino Backend → Official API → TiltCheck → Trust Score
```

**How it works:**
- Casinos provide read-only API access to anonymized gameplay data
- TiltCheck analyzes aggregate RTP across all players
- Casinos get "TiltCheck Verified" badge

**Pros:**
- Most accurate data
- Real-time aggregate analysis
- Casinos incentivized (trust badge)
- No user action required

**Cons:**
- Requires casino cooperation
- Casinos may refuse or falsify data
- Business development required

---

## Recommended Approach by Game Type

| Game | Best Approach | Why |
|------|---------------|-----|
| **Plinko** | Provably Fair Verification | Deterministic path from seed |
| **Keno** | Provably Fair Verification | Number draws verifiable |
| **Pump** | Browser Extension | Need to capture crash point timing |
| **Mines** | Provably Fair Verification | Mine positions from seed |
| **Slots** | Screen OCR or Extension | Visual/network capture |

## Implementation Priority

1. **Phase 1**: Provably Fair Seed Verifier
   - Import bet history CSV
   - Verify Plinko, Keno, Mines outcomes
   - Calculate true RTP vs claimed

2. **Phase 2**: Browser Extension
   - Chrome extension for network interception
   - Auto-capture for Pump, Dice, Crash games
   - Real-time analysis

3. **Phase 3**: Split-Screen Sidebar
   - PWA with sidebar layout
   - Quick-tap for manual games
   - Integrated support/vault/cooldown

4. **Phase 4**: Screen OCR
   - Mobile app with screen capture
   - ML models for game recognition
   - Works with native casino apps

## Technical Considerations

### Provably Fair Hash Algorithms

Most casinos use HMAC-SHA256:
```
result = HMAC-SHA256(serverSeed, clientSeed:nonce)
```

Game-specific calculations:
- **Plinko**: Each hex char → left/right decision
- **Keno**: Divide hash into segments → number picks
- **Mines**: Hash segments → mine positions
- **Dice**: First 8 hex chars → roll (0-99.99)
- **Crash**: Complex formula with house edge baked in

### Data Storage

```typescript
interface GameSession {
  casinoId: string;
  gameType: 'plinko' | 'keno' | 'pump' | 'mines' | 'dice';
  
  // For provably fair verification
  serverSeedHash?: string;
  clientSeed?: string;
  nonceStart?: number;
  
  // Aggregated stats
  totalBets: number;
  totalWagered: number;
  totalPayout: number;
  observedRTP: number;
  
  // Anomaly flags
  anomalies: AnomalyResult[];
}
```

## Next Steps

1. ~~Which approach should we prioritize?~~ **ALL OF THEM - Give users options!**
2. Which casinos/games should we target first?
3. ~~Should we build the extension or focus on provably fair verification?~~ **Build both!**

## Implementation Roadmap

### Phase 1: Core Options (Current)
- ✅ PWA with sidebar and quick-tap input
- ✅ Provably fair seed verification
- ✅ Archive upload (CSV/JSON)

### Phase 2: Browser Extension
- [ ] Chrome extension for network interception
- [ ] Firefox extension port
- [ ] Auto-detect supported casinos

### Phase 3: Enhanced Mobile
- [ ] Screen OCR for native apps
- [ ] Voice input for hands-free logging
- [ ] Smartwatch companion app

### Phase 4: Casino Partnerships
- [ ] Official API integrations
- [ ] "TiltCheck Verified" badge program
- [ ] Aggregate anonymized RTP data
