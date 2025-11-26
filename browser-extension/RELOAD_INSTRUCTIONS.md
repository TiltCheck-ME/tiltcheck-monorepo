# Force Extension Reload in Chrome

## The extension was rebuilt successfully, but Chrome is showing the old version.

### ✅ How to Force Chrome to Load New Code:

**Method 1: Hard Reload (Recommended)**
1. Go to `chrome://extensions/`
2. Find **TiltGuard Casino Monitor**
3. Click the **🔄 reload icon** (circular arrow)
4. Close ALL Stake.com tabs
5. Open a fresh Stake.com tab

**Method 2: Remove & Reinstall**
1. Go to `chrome://extensions/`
2. Find **TiltGuard Casino Monitor**
3. Click **Remove**
4. Click **Load unpacked**
5. Select: `/Users/fullsail/Desktop/tiltcheck-monorepo/tiltcheck-monorepo/browser-extension/dist`

**Method 3: Clear Extension Data**
1. `chrome://extensions/`
2. Click **"Details"** on TiltGuard
3. Scroll down to **"Site permissions"**
4. Click **"Clear data"** if available
5. Click the reload icon
6. Refresh Stake.com

### 🎯 What You Should See After Reload:

**Old UI (Before):**
- Just shows "Checking license..."
- No buttons work
- Minimalist design

**New UI (After):**
- **Login screen with:**
  - "Continue with Discord" button (purple)
  - "Continue as Guest" button
- **After clicking Guest:**
  - User profile section with avatar
  - 3 quick action buttons: Dashboard | Vault | Wallet
  - Balance & Protection section with vault buttons
  - License status
  - Guardian control
  - Tilt monitor with circular score
  - Session stats
  - Premium feature section
  - Export session button

### 🐛 If Still Showing Old UI:

**Check Console Logs:**
1. Open Stake.com
2. Press F12 (DevTools)
3. Go to Console tab
4. Look for these messages:
```
[TiltGuard] Initializing on: stake.com
[TiltGuard] Sidebar created
[TiltGuard] License verification: {...}
```

**If you see errors:**
- Take screenshot and share
- Check Network tab for failed requests
- Look for red errors in Console

**If you see NO logs at all:**
- Extension didn't load
- Try Method 2 (Remove & Reinstall)

### 📦 Current Build Info:

- **File:** `browser-extension/dist/content.js`
- **Size:** 65KB
- **Lines:** 1,700
- **Build Time:** Nov 25, 2024 15:15
- **Includes:** Full sidebar UI with all working buttons

### 🚀 Quick Test After Reload:

1. Visit stake.com
2. You should see sidebar on right with login screen
3. Click "Continue as Guest"
4. Click each button to verify it works:
   - Dashboard → Opens new tab
   - Vault → Opens new tab
   - Wallet → Opens new tab
   - Vault Current Balance → Shows confirmation
   - Export Session Data → Downloads JSON

If all buttons work, you're on the new version! ✅
