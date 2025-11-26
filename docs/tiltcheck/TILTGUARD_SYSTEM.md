# TiltGuard - Real-Time Tilt Prevention & Casino Verification

## Overview

**TiltGuard** is an enhanced version of the gameplay analyzer that combines:
1. **Casino License Verification** - Validates legitimacy before analysis
2. **Tilt Detection** - Real-time behavioral monitoring
3. **Smart Interventions** - Proactive protection mechanisms
4. **RTP/Fairness Analysis** - Statistical anomaly detection

## Key Features

### 🔍 Casino License Verification

**Automatically checks for gambling licenses in casino footer/pages**

#### Recognized Licensing Authorities

**Tier 1 (Strictest):**
- UK Gambling Commission (UKGC)
- Malta Gaming Authority (MGA)
- Gibraltar Gambling Commission

**Tier 2 (Reputable):**
- Curacao eGaming
- Kahnawake Gaming Commission
- Alderney Gambling Control
- Isle of Man

**US State Licenses:**
- Nevada Gaming Control
- New Jersey DGE
- Pennsylvania Gaming Control

#### Verification Logic

```typescript
if (no license found in footer) {
  verdict = 'unlicensed'
  shouldAnalyze = false
  message = "🚫 No gambling license found. Cannot verify fairness."
}

if (red flags detected) {
  verdict = 'suspicious'
  shouldAnalyze = false
  message = "⚠️ Red flags detected. Analysis not recommended."
}

if (license found && verified) {
  verdict = 'legitimate'
  shouldAnalyze = true
  message = "✅ Licensed by [Authority] ([Jurisdiction])"
}
```

### 🧠 Tilt Detection Algorithms

#### 1. Rage Betting Detection
**Trigger**: Fast consecutive bets

```typescript
if (avgInterval < 2000ms) {
  severity = interval < 1000ms ? 'critical' : 'high'
  intervention = 'cooldown' // Force 5-min break
}
```

**Evidence**:
- Average time between bets
- Number of consecutive fast bets
- Speed trend

#### 2. Chasing Losses
**Trigger**: Increasing bets after losses

```typescript
if (consecutiveLosses >= 3 && betIncrease > 2.5x) {
  severity = increase > 10x ? 'critical' : 'high'
  intervention = 'vault_recommendation'
}
```

**Evidence**:
- Consecutive loss count
- Bet escalation factor
- Pattern timeline

#### 3. Fast/Erratic Clicking
**Trigger**: Rapid clicking patterns

```typescript
if (clicks > 5 in 3 seconds) {
  severity = clicks > 10 ? 'high' : 'medium'
  intervention = 'cooldown'
}
```

**Evidence**:
- Click count in window
- Click frequency trend

#### 4. Bet Escalation
**Trigger**: Bets far above baseline

```typescript
if (currentBet > baselineAvg * 5) {
  severity = escalation > 20x ? 'critical' : 'high'
  intervention = 'warning'
}
```

**Evidence**:
- Baseline average bet (first 10 bets)
- Current bet size
- Escalation factor

#### 5. Session Duration Warning
**Trigger**: Extended play sessions

```typescript
if (duration > 2 hours) {
  severity = 'critical'
  intervention = 'session_break'
} else if (duration > 1 hour) {
  severity = 'medium'
  intervention = 'reminder'
}
```

### 💰 Smart Vault Recommendations

#### Profit Protection
```typescript
if (balance >= initialBalance * 5) {
  suggestedVault = profit * 0.5 // Vault 50% of profits
  urgency = 'high'
  realWorldComparison = findAffordableItem(suggestedVault)
}
```

#### Real-World Spending Reminders

**Tracks common items people forget to buy:**
- Trash bags ($15)
- Toilet paper ($20)
- Groceries ($100)
- Gas ($50)
- Phone bill ($80)
- Utilities ($150)
- Rent ($1500)

**Example Message:**
```
"Hey, you mentioned needing trash bags. 
Your balance is 10x what they cost - 
maybe pull $15 and grab them now?"
```

#### Stop-Loss Protection
```typescript
if (lossPercent >= 50%) {
  urgency = 'critical'
  intervention = 'emergency_stop'
  message = "⚠️ STOP LOSS: You've lost 50% of starting balance"
}
```

### 🛑 Intervention System

#### Cooldown Period
**Triggered by:** Critical tilt indicators

**Actions:**
1. Blocks all betting UI elements
2. Shows fullscreen overlay with countdown timer
3. Duration: 5 minutes (configurable)
4. Auto-releases after timer expires

**UI:**
```
┌─────────────────────────────────┐
│           🛑                     │
│     Cooldown Period              │
│   Tilt detected. Take a break.   │
│                                  │
│           120                    │
│                                  │
│ Betting will resume when timer   │
│     reaches zero.                │
└─────────────────────────────────┘
```

#### Phone a Friend
**Triggered by:** Multiple high-severity tilt signs

**Prompt:**
```
"📞 Multiple tilt signs detected. 
Consider calling someone before continuing."

[Take Break] [Continue]
```

#### Emergency Stop
**Triggered by:**
- Critical tilt score (≥80/100)
- Stop-loss hit (50% down)
- 3+ critical indicators

**Actions:**
1. Blocks all betting
2. Shows emergency modal
3. Forces vault decision

**UI:**
```
┌─────────────────────────────────┐
│      🚨 EMERGENCY STOP           │
│                                  │
│   Critical tilt detected!        │
│   Your risk score is 87/100      │
│                                  │
│ [Vault Balance] [I Understand]   │
└─────────────────────────────────┘
```

## Tilt Risk Scoring

### Score Calculation
```typescript
riskScore = 0

for (tiltSign of detectedSigns) {
  baseWeight = {
    rage_betting: 25,
    chasing_losses: 30,
    fast_clicks: 15,
    bet_escalation: 20,
    duration_warning: 10
  }[tiltSign.type]
  
  severityMultiplier = {
    low: 0.5,
    medium: 1.0,
    high: 1.5,
    critical: 2.0
  }[tiltSign.severity]
  
  riskScore += baseWeight * severityMultiplier * confidence
}

return Math.min(100, Math.round(riskScore))
```

### Risk Levels
- **0-30**: Safe (green)
- **31-60**: Caution (yellow)
- **61-80**: Warning (orange)
- **81-100**: Critical (red)

### Intervention Thresholds
- **≥30**: Show tilt indicators in popup
- **≥60**: Recommend cooldown
- **≥80**: Force emergency stop

## Enhanced Popup UI

### Sections

#### 1. License Status
```
┌──────────────────────────────┐
│ ✅ Licensed Casino            │
│ Malta Gaming Authority (MGA)  │
│ License #MGA/B2C/123/2020     │
└──────────────────────────────┘
```

or

```
┌──────────────────────────────┐
│ 🚫 Unlicensed Casino          │
│ No gambling license found.    │
│ Cannot verify fairness.       │
│ Play at your own risk.        │
└──────────────────────────────┘
```

#### 2. Tilt Monitor
```
┌──────────────────────────────┐
│ 🧠 Tilt Monitor     [42/100]  │
│                               │
│ ⚠️ Chasing Losses (High)      │
│   Bet 8.5x after 5 losses     │
│                               │
│ ⚠️ Fast Betting (Medium)      │
│   1.2s between bets           │
└──────────────────────────────┘
```

#### 3. Active Intervention
```
┌──────────────────────────────┐
│ 💰 VAULT RECOMMENDATION       │
│                               │
│ Your balance is $487.         │
│ That's 12x what trash bags    │
│ cost. Pull $15 and buy them?  │
│                               │
│ [Vault & Buy]  [Later]        │
└──────────────────────────────┘
```

#### 4. Session Stats
```
┌──────────────────────────────┐
│ 📊 Session Overview           │
│                               │
│ Duration: 47m    Bets: 234    │
│ P/L: +$87       ROI: +43%     │
│ RTP: 97.2%      Fair ✅       │
└──────────────────────────────┘
```

## Integration with Existing Modules

### LockVault Integration
```typescript
// When vault recommended
chrome.runtime.sendMessage({
  type: 'open_vault',
  data: {
    amount: suggestedAmount,
    reason: 'tilt_protection',
    lockDuration: 24 * 60 * 60 * 1000 // 24 hours
  }
});
```

### Gameplay Dashboard
```typescript
// Send tilt events to dashboard
wss.send({
  type: 'tilt_event',
  sessionId,
  tiltSign: {
    type: 'rage_betting',
    severity: 'critical',
    timestamp: Date.now()
  }
});
```

### Discord Bot Notifications
```typescript
// Alert Discord when critical tilt
if (tiltRisk >= 80) {
  discordClient.sendDM(userId, {
    embed: {
      title: '🚨 Critical Tilt Alert',
      description: 'Your tilt score reached 87/100',
      color: 0xff3838,
      fields: [
        { name: 'Risk', value: 'Critical' },
        { name: 'Recommendation', value: 'Take immediate break' }
      ]
    }
  });
}
```

## Configuration

### Tilt Thresholds (Configurable)
```typescript
const config = {
  // Rage betting
  fastBetThreshold: 2000,      // ms between bets
  rageBetCount: 5,             // consecutive fast bets
  
  // Chasing losses
  betIncreaseMultiplier: 2.5,  // 2.5x after loss
  chasingPattern: 3,           // consecutive increases
  
  // Session duration
  warningDuration: 60 * 60 * 1000,    // 1 hour
  criticalDuration: 2 * 60 * 60 * 1000, // 2 hours
  
  // Vault thresholds
  vaultThreshold: 5,           // 5x initial balance
  profitVaultPercent: 0.5,     // Vault 50% of profits
  stopLossPercent: 0.5,        // Stop at 50% loss
}
```

## User Flow Examples

### Example 1: Chasing Losses
```
1. User loses 3 bets in a row
2. User doubles bet size each time
3. TiltGuard detects chasing pattern
4. Shows notification:
   "⚠️ You're chasing losses. 
    Bet increased 8x after losses."
5. If continues, triggers cooldown
6. Blocks betting for 5 minutes
```

### Example 2: Big Win Protection
```
1. User wins big, balance goes from $100 to $520
2. TiltGuard detects 5.2x increase
3. Shows vault recommendation:
   "💰 Your balance is $520.
    Consider vaulting $210 (50% of profits).
    
    BTW, that's 14x what trash bags cost.
    Want to pull $15 and grab them?"
4. User vaults $210
5. Continues playing with $310
```

### Example 3: Unlicensed Casino
```
1. User opens casino site
2. TiltGuard checks footer for license
3. No license found
4. Shows persistent warning banner:
   "🚫 No gambling license found.
    This casino cannot be verified.
    Fairness analysis disabled."
5. RTP analysis won't run
6. Only tilt monitoring active
```

## Testing Checklist

- [ ] License verification on known casinos
- [ ] Rage betting triggers cooldown
- [ ] Chasing losses detected accurately
- [ ] Vault recommendations appear at 5x balance
- [ ] Real-world comparisons match user's items
- [ ] Stop-loss triggers at 50% down
- [ ] Emergency stop blocks betting
- [ ] Cooldown countdown works correctly
- [ ] Popup shows real-time tilt score
- [ ] Unlicensed casinos blocked from analysis

## Privacy & Security

1. ✅ **All local** - No external servers
2. ✅ **No tracking** - Session IDs are random
3. ✅ **No logging** - Bet amounts not stored permanently
4. ✅ **User control** - Can disable at any time
5. ✅ **Transparent** - All code open source

## Future Enhancements

- [ ] ML-based tilt prediction (predict before it happens)
- [ ] Customizable real-world item list
- [ ] Integration with banking APIs for auto-vault
- [ ] Voice alerts for critical tilt
- [ ] Biometric data (heart rate, if available)
- [ ] Social accountability (friend monitoring)
- [ ] Historical tilt patterns analysis
- [ ] Personalized intervention strategies

## Summary

**TiltGuard** transforms the gameplay analyzer into a comprehensive protection system that:

1. ✅ **Verifies casino legitimacy** before analysis
2. ✅ **Monitors 5 tilt indicators** in real-time
3. ✅ **Provides 6 intervention types** when needed
4. ✅ **Recommends vaulting** at strategic times
5. ✅ **Reminds about real purchases** to ground spending
6. ✅ **Forces cooldowns** during critical tilt
7. ✅ **Blocks unlicensed casinos** from fairness grading

This creates a **guardian system** that protects players from both rigged games AND their own tilt, while respecting their autonomy through informed consent.
