# TiltGuard Browser Extension - Installation & Testing

## ✅ Build Complete! - Fully Functional UI

Your extension is ready with **working buttons** and **real features**:
- 🔐 Discord OAuth integration (guest mode for testing)
- 🔒 Vault system with balance tracking  
- 📊 Full dashboard access
- 💰 Wallet integration
- 📥 Session data export
- ✨ Premium upgrade path
- 🎯 Real-time tilt monitoring

Extension ready in `browser-extension/dist/`

## 📦 Installation Steps

### 1. Install in Chrome

1. **Open Chrome Extensions**
   - Navigate to `chrome://extensions/`
   - Or: Menu → More Tools → Extensions

2. **Enable Developer Mode**
   - Toggle the switch in the top right corner

3. **Load the Extension**
   - Click "Load unpacked"
   - Navigate to: `/Users/fullsail/Desktop/tiltcheck-monorepo/tiltcheck-monorepo/browser-extension/dist`
   - Click "Select"

4. **Verify Installation**
   - You should see "TiltGuard Casino Monitor" in your extensions list
   - The icon should appear in your browser toolbar

### 2. Start the WebSocket Server

The extension needs the analyzer server running to function:

```bash
cd /Users/fullsail/Desktop/tiltcheck-monorepo/tiltcheck-monorepo/packages/gameplay-analyzer
pnpm start:server
```

You should see:
```
[GameplayAnalyzer] WebSocket server listening on port 7071
```

**Keep this terminal running** while testing the extension.

## 🎮 Testing the Extension

### Test on Stake.com (Recommended)

1. **Open Stake.com**
   - Go to https://stake.com
   - Log in (or use demo mode)

2. **Open a Slot Game**
   - Navigate to any slot game (e.g., Gates of Olympus, Sugar Rush, etc.)
   - Let the game load completely

3. **Open Extension Popup**
   - Click the TiltGuard icon in your toolbar
   - Click "Start Guardian"

4. **Start Playing**
   - Place a few bets
   - Watch the extension popup for:
     - ✅ License verification status
     - 📊 Session stats (bets, P/L, RTP)
     - ⚠️ Tilt score updates
     - 🎯 Fairness analysis

### What to Look For

#### License Verification
The popup should show:
```
✅ Licensed by Curacao eGaming
License #: 8048/JAZ2020-013
```

#### Tilt Monitoring
Try these behaviors to trigger detections:
- **Rage Betting**: Click spin rapidly (< 2 seconds between bets)
- **Chasing Losses**: Increase bet 2.5x+ after a loss
- **Fast Clicking**: Click around the screen quickly (5+ times in 3s)
- **Bet Escalation**: Bet 5x+ your average

#### Expected Interventions
- **Warning (30-60 risk)**: Yellow indicator, vault suggestion
- **Critical (61-80 risk)**: Orange indicator, cooldown warning
- **Emergency (81+ risk)**: Red indicator, forced 5-minute cooldown

#### Fairness Analysis
After 10+ spins:
- Check "Session Stats" section
- Look for RTP calculation
- Watch for anomaly warnings (pump-and-dump, RTP drift, etc.)

### Test on Other Casinos

**Pre-configured casinos:**
- Stake.com ✅
- Roobet.com ✅
- BC.Game ✅
- Duelbits.com ✅

**Generic fallback** for other casinos (may require manual adjustment)

## 🐛 Troubleshooting

### Extension not connecting to server

**Check WebSocket server:**
```bash
# In terminal, you should see:
[GameplayAnalyzer] New client connected
[GameplayAnalyzer] Stats: { activeSessions: 1, connectedClients: 1 }
```

**If not connecting:**
- Verify server is running on port 7071
- Check browser console (F12) for errors
- Make sure `ANALYZER_WS_URL` is `ws://localhost:7071`

### No data being extracted

**Check content script:**
1. Open DevTools (F12)
2. Go to Console tab
3. Look for `[TiltGuard]` messages
4. Should see: `TiltGuard initialized for: stake.com`

**If no messages:**
- Refresh the casino page
- Make sure you're ON a game page (not homepage)
- Check if game is fully loaded

### License not detected

**This is normal for:**
- Unlicensed casinos (warning will show)
- New casinos without footer info
- Casinos with unusual license placement

**You should see:**
```
🚫 No gambling license found
This casino cannot be verified for fairness
```

### Interventions not triggering

**Make sure:**
- You've placed 5+ bets (baseline needed)
- Behaviors are extreme enough (check thresholds below)
- Extension is actually running (check popup shows "Guardian Active")

**Current thresholds:**
- Fast bet: < 2 seconds
- Chasing: 2.5x+ increase after loss
- Escalation: 5x+ average bet
- Fast clicks: 5+ in 3 seconds

## 📊 Monitoring in Real-Time

### Browser Console
```javascript
// Open DevTools (F12) → Console
// You should see:
[TiltGuard] Initialized
[TiltGuard] Connected to analyzer
[TiltGuard] License check: {...}
[TiltGuard] Spin detected: {bet: 1, win: 0, ...}
[TiltGuard] Tilt risk: 15/100
```

### Extension Popup
Live updates every 5 seconds:
- Tilt score changes
- Session stats refresh
- Intervention prompts appear
- License status

### WebSocket Server Terminal
```
[GameplayAnalyzer] Stats: { 
  activeSessions: 1, 
  totalSpins: 47, 
  connectedClients: 1 
}
[GameplayAnalyzer] Session abc123: 47 spins, RTP: 94.3%
```

## 🧪 Testing Checklist

- [ ] Extension loads in Chrome
- [ ] WebSocket server running
- [ ] Connect to Stake.com
- [ ] License detected and displayed
- [ ] Open slot game
- [ ] Click "Start Guardian"
- [ ] Place 5+ bets
- [ ] Session stats appear (bets, P/L, RTP)
- [ ] Trigger fast betting (< 2s)
- [ ] See tilt score increase
- [ ] Receive intervention warning
- [ ] Increase bet 3x after loss
- [ ] See "chasing losses" indicator
- [ ] Continue until 80+ risk score
- [ ] Verify cooldown overlay appears
- [ ] Wait 5 minutes for cooldown to end
- [ ] Check vault recommendation (when winning)
- [ ] Verify console logs working
- [ ] Check WebSocket stats updating

## 🎯 Next Steps After Testing

### If Everything Works:
1. Document any bugs/issues you find
2. Test on different casinos
3. Verify license detection accuracy
4. Test with real money (optional, careful!)
5. Measure intervention effectiveness

### If Issues Found:
1. Check browser console for errors
2. Verify WebSocket connection
3. Ensure server is running
4. Check import paths in content.ts
5. Rebuild extension: `cd browser-extension && pnpm build`

## 🔧 Development Mode

### Watch Mode (Auto-rebuild)
```bash
cd browser-extension
pnpm watch
```

Then in Chrome:
- chrome://extensions/
- Click reload icon on TiltGuard extension after each rebuild

### Manual Rebuild
```bash
cd browser-extension
pnpm clean && pnpm build
```

Then reload extension in Chrome.

## 📝 Logs Location

- **Browser Console**: DevTools (F12) → Console
- **Extension Logs**: chrome://extensions → TiltGuard → Errors
- **Server Logs**: Terminal running `pnpm start:server`
- **Session Data**: Stored in memory (not persisted yet)

## 🚀 Quick Start Commands

```bash
# Terminal 1: Start WebSocket server
cd packages/gameplay-analyzer
pnpm start:server

# Terminal 2: Rebuild extension (if needed)
cd browser-extension
pnpm build

# Then in Chrome:
# chrome://extensions/ → Load unpacked → select browser-extension/dist
# Visit stake.com → Play a slot → Click TiltGuard icon → Start Guardian
```

## 💡 Tips for Testing

1. **Use demo/play money first** to avoid real losses
2. **Start small** - place minimum bets to test behavior
3. **Be deliberate** - intentionally trigger tilt behaviors to see interventions
4. **Check all sections** - license, tilt, stats, interventions
5. **Test cooldown** - verify you can't bet during 5-minute cooldown
6. **Monitor server** - watch terminal for session updates
7. **Try different games** - slots have different volatility/RTP
8. **Test vault prompt** - win enough to trigger recommendation

## 🎉 You're Ready!

The extension is built and ready to test. Start the WebSocket server, load the extension in Chrome, and visit Stake.com to begin testing.

Good luck! 🍀
