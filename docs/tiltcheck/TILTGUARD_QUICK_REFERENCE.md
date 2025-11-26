# TiltGuard Quick Reference

## What It Does

**TiltGuard** is a browser extension that:

1. ✅ **Verifies casino has a gambling license** before analyzing
2. ✅ **Monitors your betting behavior** for tilt signs
3. ✅ **Detects rigged games** through RTP analysis
4. ✅ **Intervenes when you're tilting** with cooldowns/prompts
5. ✅ **Reminds you about real purchases** when balance is high
6. ✅ **Forces breaks** during critical tilt (80+ risk score)

## Casino License Check

### What happens when you visit a casino:

**Licensed Casino (✅):**
```
✅ Licensed by Malta Gaming Authority (MGA)
License #MGA/B2C/123/2020

→ Full analysis enabled
→ RTP tracking active
→ Tilt monitoring active
```

**Unlicensed Casino (🚫):**
```
🚫 No gambling license found
This casino cannot be verified for fairness
Play at your own risk

→ RTP analysis DISABLED
→ Only tilt monitoring active
→ Persistent warning banner shown
```

## Tilt Detection (5 Algorithms)

### 1. Rage Betting
**What it detects:** Betting too fast (< 2 seconds between bets)

**Intervention:**
- 5-minute forced cooldown
- Betting UI blocked
- Countdown timer overlay

### 2. Chasing Losses
**What it detects:** Increasing bets after losses (2.5x+ escalation)

**Intervention:**
- Vault recommendation
- "You're up 8x after 5 losses" warning
- Phone-a-friend suggestion if continues

### 3. Fast/Erratic Clicking
**What it detects:** 5+ clicks in 3 seconds

**Intervention:**
- Cooldown warning
- "You're clicking erratically" notification

### 4. Bet Escalation
**What it detects:** Betting 5x+ your average

**Intervention:**
- Warning notification
- Vault suggestion
- Emergency stop if 20x+

### 5. Session Duration
**What it detects:** Playing > 1 hour

**Intervention:**
- 1 hour: "Time for a break?" reminder
- 2 hours: "You've been playing 2 hours" - forced break suggestion

## Tilt Risk Score

**0-30 (Safe):** Green indicator, all good  
**31-60 (Caution):** Yellow indicator, warnings shown  
**61-80 (Warning):** Orange indicator, vault recommended  
**81-100 (Critical):** Red indicator, **EMERGENCY STOP**

## Interventions

### Cooldown (Forced Break)
**Triggered by:** Critical tilt signs

**What happens:**
1. All betting buttons disabled
2. Fullscreen overlay with timer
3. 5-minute countdown
4. Auto-release when timer hits zero

### Vault Recommendation
**Triggered by:** Balance 5x+ starting amount

**Example:**
```
💰 Your balance is $487
Consider vaulting $243 (50% of profits)

BTW, that's 16x what trash bags cost.
Want to pull $15 and grab them now?

[Vault & Buy]  [Later]
```

### Phone a Friend
**Triggered by:** 2+ high-severity tilt signs

**Prompt:**
```
📞 Multiple tilt indicators detected
Maybe call someone before continuing?

[Take Break]  [Continue]
```

### Emergency Stop
**Triggered by:** Risk score ≥ 80

**What happens:**
1. All betting BLOCKED
2. Red emergency modal
3. Must choose: Vault or Acknowledge

```
🚨 EMERGENCY STOP

Critical tilt detected!
Risk score: 87/100

[Vault Balance]  [I Understand (Continue)]
```

## Real-World Spending Reminders

**Items tracked:**
- Trash bags ($15)
- Toilet paper ($20)
- Groceries ($100)
- Gas ($50)
- Phone bill ($80)
- Utilities ($150)
- Rent ($1500)

**How it works:**
1. You mention needing something in chat/notes
2. When balance reaches 5x+ item cost
3. Get reminder: "Hey, trash bags cost $15. Your balance is 10x that. Pull some and buy them?"

## Popup UI Sections

### 1. License Status
Shows if casino is legitimate or unlicensed

### 2. Tilt Monitor
Live tilt score (0-100) with active indicators

### 3. Active Interventions
Vault prompts, spending reminders, cooldown status

### 4. Session Stats
- Duration
- Total bets
- Net profit/loss
- ROI
- RTP
- Fairness verdict

### 5. Controls
- Start/Stop Guardian
- Vault Balance
- View Full Report

## Quick Actions

**Start monitoring:**
1. Click extension icon
2. Click "Start Guardian"
3. Play normally - TiltGuard watches

**During cooldown:**
- Wait for timer
- No override option (by design)
- Use time to reflect

**When vault prompted:**
- Consider suggestion
- Click "Vault Now" to protect winnings
- Or "Later" to continue (not recommended if critical)

## Stop-Loss Protection

**Automatic trigger at 50% loss:**

```
⚠️ STOP LOSS TRIGGERED

You've lost 50% of your starting balance

Strongly recommend vaulting remaining $50

[Vault Everything]  [Continue]
```

## Configuration

**Default thresholds (can be customized):**
- Fast bet: < 2 seconds
- Chasing: 2.5x+ increase after loss
- Escalation: 5x+ average bet
- Duration warning: 1 hour
- Duration critical: 2 hours
- Vault trigger: 5x initial balance
- Stop-loss: 50% down

## Privacy

- ✅ All data stays local (no external servers)
- ✅ WebSocket runs on localhost only
- ✅ No tracking/analytics
- ✅ Random session IDs (not linkable)
- ✅ Can disable anytime

## FAQ

**Q: Can I override a cooldown?**  
A: No - that's the point. Critical tilt requires a break.

**Q: What if I don't want vault reminders?**  
A: You can dismiss them, but they'll appear again if balance increases.

**Q: Does it work on all casinos?**  
A: Pre-configured for Stake, Roobet, BC.Game, Duelbits. Generic fallback for others.

**Q: What if license check fails?**  
A: RTP analysis disabled, only tilt monitoring active. You'll see a warning.

**Q: Can I customize tilt thresholds?**  
A: Not in UI yet, but coming soon. Can edit config file manually.

**Q: Does it prevent me from gambling?**  
A: No - it **protects** you while gambling. You maintain full control (except during cooldowns).

## Developer Integration

**Listen for tilt events:**
```typescript
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'tilt_update') {
    console.log('Risk score:', msg.data.tiltRisk);
  }
  
  if (msg.type === 'intervention') {
    console.log('Intervention:', msg.data.type);
  }
});
```

**Trigger vault programmatically:**
```typescript
chrome.runtime.sendMessage({
  type: 'open_vault',
  data: { amount: 100, reason: 'manual' }
});
```

## Support

**For issues:**
1. Check console logs (F12 → Console)
2. Verify WebSocket server running (ws://localhost:7071)
3. Check casino is in supported list
4. Report to GitHub issues

**For customization:**
Edit `config` object in `tilt-detector.ts`
