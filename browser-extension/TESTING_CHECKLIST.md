# ✅ TiltGuard Feature Testing Checklist

## Quick Tests (Do These Now!)

### 1. Authentication ✓
- [x] You see the login screen with Discord + Guest buttons
- [ ] Click **"Continue as Guest"**
  - Should show: User profile with "Guest" username
  - Should unlock: All main features

### 2. Quick Action Buttons
- [ ] Click **📊 Dashboard**
  - Opens new tab to `localhost:3000/dashboard` (will 404 if dashboard not running - that's OK!)
- [ ] Click **🔒 Vault**
  - Opens new tab to `localhost:3000/vault`
- [ ] Click **💰 Wallet**
  - Opens new tab to `localhost:3000/wallet`

**If buttons open tabs = ✅ WORKING**

### 3. Vault Features
- [ ] Look at "Current Balance" - should show $0.00
- [ ] Click **"Vault Current Balance"**
  - Should show alert: "No balance to vault" (since balance is $0)
- [ ] Click **"Vault Custom Amount"**
  - Should show prompt: "Enter amount to vault:"
  - Enter: `100`
  - Should show alert: "✅ Vaulted $100.00!"
  - Check "🔒 Vaulted" amount - should now show $100.00

**If vault balance updates = ✅ WORKING**

### 4. Session Export
- [ ] Click **"📥 Export Session Data"**
  - Should download file: `tiltguard-session-[timestamp].json`
  - Open the file - should contain JSON with stats

**If file downloads = ✅ WORKING**

### 5. Guardian Toggle
- [ ] Look at "Guardian Status" - should show "⭕ Inactive"
- [ ] Click **"Start Guardian"** button
  - Button text should change to "Stop Guardian"
  - Status should change to "✅ Active"
  - **Check browser console (F12):** Should see `[TiltGuard] Starting monitoring...`

**If status changes + console logs appear = ✅ WORKING**

### 6. Console Logs (Open F12 → Console)
You should see:
```
[TiltGuard] Initializing on: stake.com
[TiltGuard] Sidebar created
[TiltGuard] License verification: {isLegitimate: true, ...}
```

**If you see these logs = ✅ WORKING**

### 7. Settings & Minimize
- [ ] Click **⚙️ Settings** (top right)
  - Should show alert: "Settings panel coming soon!"
- [ ] Click **− Minimize** (top right)
  - Sidebar should slide mostly off-screen
  - Button should change to **+**
  - Click again to restore

**If sidebar minimizes = ✅ WORKING**

### 8. Premium Features
- [ ] Scroll down to "🤖 AI Insights" section
- [ ] Should see "✨ Premium" badge
- [ ] Click **"Upgrade to Premium"**
  - Opens new tab to `localhost:3000/premium`

**If tab opens = ✅ WORKING**

---

## Advanced Tests (If You Want to Go Deeper)

### Test Real Gameplay Monitoring

1. **Start Guardian** (click the button)
2. **Open a slot game** on Stake
3. **Place a few bets**
4. **Watch the sidebar:**
   - "Bets" counter should increase
   - "Duration" timer should tick
   - "Wagered" should show total bet amounts
   - "Net P/L" should update
   - "RTP" should calculate

**Check console for:**
```
[TiltGuard] Spin detected: {bet: X, win: Y, ...}
```

**If stats update after bets = ✅ FULLY WORKING**

### Test Tilt Detection

1. **Place bets quickly** (< 2 seconds apart)
2. **Watch "Tilt Monitor" section:**
   - Score should increase from 0
   - Risk level should change color (green → yellow → orange → red)
   - Indicators should appear below score

**If tilt score increases = ✅ DETECTION WORKING**

### Test License Verification

**Look at "🔒 License Status" section:**
- On Stake.com: Should show **"✅ Licensed"** (Curacao eGaming)
- Color should be green

**Check console:**
```
[TiltGuard] License verification: {
  isLegitimate: true,
  licenseInfo: {authority: "Curacao eGaming", ...}
}
```

**If you see green license badge = ✅ WORKING**

---

## What "Working" Looks Like

### ✅ All Features Working:
- Buttons open new tabs (even if pages 404)
- Vault balance updates when you test it
- Session export downloads JSON
- Guardian status toggles
- Sidebar minimizes/expands
- Console shows TiltGuard logs
- Stats update when playing

### ❌ Not Working Signs:
- Buttons do nothing when clicked
- No console logs
- Sidebar doesn't appear at all
- JavaScript errors in console (red text)
- Vault balance doesn't change

---

## 🎯 Quick Validation (30 seconds)

1. Click "Continue as Guest" → ✓
2. Click "Dashboard" button → New tab opens → ✓
3. Click "Vault Custom Amount" → Enter 50 → Alert shows → Vault balance shows $50 → ✓
4. Click "Export Session Data" → File downloads → ✓
5. Press F12 → Console shows `[TiltGuard]` logs → ✓

**If all 5 work = 100% WORKING! 🎉**

---

## Screenshots to Verify

**Take screenshot of:**
1. Full sidebar showing all sections
2. Console with TiltGuard logs
3. Downloaded session JSON file

Share if you want me to confirm everything looks right!
