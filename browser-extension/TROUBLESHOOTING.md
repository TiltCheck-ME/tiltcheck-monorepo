# Domain & Server Troubleshooting Guide

This guide helps you diagnose and fix issues when "the domain doesn't work" or servers aren't responding.

---

## 🔍 Quick Diagnosis Checklist

Run through these checks in order:

### 1. Is the API Server Running?

```bash
# Check if process is running
lsof -i :3333

# Expected output:
# COMMAND   PID      USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
# node    90660  fullsail   23u  IPv6 ...      TCP *:3333 (LISTEN)
```

**If no output**: Server is not running → [Start Server](#start-server)

**If you see output**: Server is running → Check [API Response](#2-is-api-responding)

---

### 2. Is API Responding?

```bash
curl http://localhost:3333/api/health
```

**Expected**:
```json
{"status":"online","service":"tiltguard-api","timestamp":"...","users":0,"vaults":0,"sessions":0}
```

**If connection refused**: Server crashed → Check [Logs](#check-server-logs)

**If timeout**: Port blocked → Check [Firewall](#firewall-issues)

**If 404**: Wrong URL → Check [API Base URL](#wrong-api-base-url)

---

### 3. Is Extension Using Correct URL?

```bash
# Check what URL extension is configured to use
grep -n "API_BASE" browser-extension/src/sidebar.ts
```

**Expected**:
```typescript
const API_BASE = 'http://localhost:3333/api';
```

**If different**: Update and rebuild → [Update Extension URL](#update-extension-url)

---

### 4. Is Extension Loaded in Chrome?

1. Open `chrome://extensions/`
2. Look for "TiltGuard" or your extension name
3. Check **Errors** button (if red, click it)

**If not listed**: Extension not installed → [Load Extension](#load-extension-in-chrome)

**If errors**: Extension crashed → [Fix Extension Errors](#fix-extension-errors)

---

## 🛠️ Common Issues & Fixes

### Issue 1: Server Not Running

#### Symptoms
- `curl` shows "connection refused"
- `lsof -i :3333` shows nothing
- Extension buttons show "endpoint not found"

#### Fix: Start Server

```bash
cd browser-extension

# Option A: Foreground (see logs)
node server/api.js

# Option B: Background (runs independently)
nohup node server/api.js > server.log 2>&1 &

# Option C: Using pnpm script
pnpm server
```

**Verify**:
```bash
curl http://localhost:3333/api/health
# Should return: {"status":"online",...}
```

---

### Issue 2: Port Already in Use

#### Symptoms
- Error: `EADDRINUSE: address already in use :::3333`
- Server won't start

#### Fix: Kill Existing Process

```bash
# Find process using port 3333
lsof -ti:3333

# Kill it
lsof -ti:3333 | xargs kill -9

# Start server again
node server/api.js
```

**Alternative**: Change port in both files:

```javascript
// browser-extension/server/api.js
const PORT = process.env.PORT || 3334; // Changed from 3333
```

```typescript
// browser-extension/src/sidebar.ts
const API_BASE = 'http://localhost:3334/api'; // Changed from 3333
```

Then rebuild extension: `pnpm build`

---

### Issue 3: Server Crashed

#### Symptoms
- Server was running, now `lsof` shows nothing
- No response from API

#### Fix: Check Server Logs

```bash
# If using nohup
tail -f browser-extension/server.log

# If using pnpm server
# Logs appear in terminal
```

**Common crash reasons**:

1. **Uncaught Exception**
   ```
   Error: Cannot read property 'id' of undefined
   ```
   → Fix code error, restart server

2. **Out of Memory**
   ```
   FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed
   ```
   → Clear in-memory data, restart server, move to database

3. **Port Conflict**
   ```
   EADDRINUSE: address already in use
   ```
   → Kill conflicting process (see [Issue 2](#issue-2-port-already-in-use))

---

### Issue 4: Wrong API Base URL

#### Symptoms
- Extension shows "404 Not Found"
- Server logs show no requests
- Extension buttons don't work

#### Fix: Update Extension URL

```bash
# Check current URL
grep "API_BASE" browser-extension/src/sidebar.ts

# Should be:
# const API_BASE = 'http://localhost:3333/api';

# If different, update:
# 1. Open sidebar.ts
# 2. Change API_BASE to correct URL
# 3. Rebuild extension
pnpm build

# 4. Reload extension in Chrome
# Go to chrome://extensions/
# Click reload icon under TiltGuard
```

---

### Issue 5: CORS Error

#### Symptoms
- Browser console shows:
  ```
  Access to fetch at 'http://localhost:3333/api/...' from origin 'chrome-extension://...' has been blocked by CORS policy
  ```

#### Fix: Update CORS Settings

```javascript
// browser-extension/server/api.js

// Add your extension ID
app.use(cors({
  origin: [
    'chrome-extension://YOUR_EXTENSION_ID', // Replace with real ID
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  credentials: true
}));
```

**Find your extension ID**:
1. Go to `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Copy ID under extension name (e.g., `abcdefghijklmnopqrstuvwxyz123456`)

**Restart server** after updating CORS.

---

### Issue 6: Extension Not Loading

#### Symptoms
- Extension not in Chrome toolbar
- Not listed in `chrome://extensions/`

#### Fix: Load Extension in Chrome

```bash
# 1. Build extension
cd browser-extension
pnpm build

# 2. Load in Chrome
# - Open chrome://extensions/
# - Enable "Developer mode" (top right)
# - Click "Load unpacked"
# - Select: browser-extension/dist/
```

**Verify**:
- Extension appears in list
- Click extension icon in toolbar → sidebar opens

---

### Issue 7: Extension Errors

#### Symptoms
- Red "Errors" button in `chrome://extensions/`
- Extension icon grayed out
- Console shows JavaScript errors

#### Fix: Debug Extension Errors

**Step 1: Check Error Details**
1. Go to `chrome://extensions/`
2. Click **Errors** button under TiltGuard
3. Read error message

**Common errors**:

**A) `Uncaught SyntaxError: Unexpected token '<'`**
- Cause: TypeScript not compiled to JavaScript
- Fix:
  ```bash
  cd browser-extension
  rm -rf dist
  pnpm build
  # Reload extension in Chrome
  ```

**B) `Cannot read properties of undefined (reading 'postMessage')`**
- Cause: Content script running on wrong page
- Fix: Check `manifest.json` matches patterns:
  ```json
  "matches": ["*://*.casino.com/*", "http://localhost:*/*"]
  ```

**C) `Failed to fetch`**
- Cause: API server not running
- Fix: Start server (see [Issue 1](#issue-1-server-not-running))

---

### Issue 8: Firewall Blocking Port

#### Symptoms
- Server running but `curl` times out
- No response from localhost

#### Fix: Allow Port in Firewall

**macOS**:
```bash
# Check firewall status
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate

# If enabled, add Node.js
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/node
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblockapp /usr/local/bin/node
```

**Alternative**: Disable firewall temporarily for testing:
```bash
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate off
```

---

### Issue 9: Production Domain Not Working

#### Symptoms
- Extension works on localhost
- Deployed domain returns errors
- Live server not responding

#### Fix: Production Checklist

**1. Check Server Status**
```bash
# For Render.com
# Go to dashboard → View logs
# Should show: "Server running on port 3333"

# For Fly.io
fly status
fly logs

# For VPS
ssh user@your-server
pm2 status
pm2 logs tiltguard-api
```

**2. Test Health Endpoint**
```bash
curl https://your-domain.com/api/health

# Should return:
# {"status":"online",...}
```

**3. Check Environment Variables**
- Render: Dashboard → Environment
- Fly.io: `fly secrets list`
- VPS: `cat .env`

**Required variables**:
- `PORT` (usually 3333 or set by platform)
- `NODE_ENV=production`
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`

**4. Update Extension URL**
```typescript
// browser-extension/src/sidebar.ts
const API_BASE = 'https://your-domain.com/api'; // Production URL
```

Rebuild and reload extension.

**5. Check SSL Certificate**
```bash
curl -I https://your-domain.com
# Should return: HTTP/2 200
# NOT: SSL certificate problem
```

If SSL error: Platform should auto-provision (Render/Fly.io) or use Certbot (VPS).

---

## 🧪 Testing Workflow

### Complete Test After Any Fix

```bash
# 1. Server health
curl http://localhost:3333/api/health
# ✅ Should return: {"status":"online"}

# 2. Guest auth
curl -X POST http://localhost:3333/api/auth/guest
# ✅ Should return: {"token":"guest_...","user":{...}}

# 3. Vault check
curl http://localhost:3333/api/vault/guest_123
# ✅ Should return: {"userId":"guest_123","balance":0,...}

# 4. Extension load
# - Open Chrome → chrome://extensions/
# - TiltGuard should be listed with no errors
# - Click icon → sidebar opens
# - Click "Continue as Guest"
# - ✅ Main UI loads with metrics

# 5. Check browser console
# - Right-click sidebar → Inspect
# - Console tab
# - ✅ No red errors
```

---

## 📊 Diagnostic Commands

### Quick Status Check

```bash
# Copy-paste this entire block to check everything:

echo "=== Server Status ==="
lsof -i :3333 && echo "✅ Server running" || echo "❌ Server not running"

echo -e "\n=== API Health ==="
curl -s http://localhost:3333/api/health | jq || echo "❌ API not responding"

echo -e "\n=== Extension URL ==="
grep "API_BASE" browser-extension/src/sidebar.ts

echo -e "\n=== Last Build ==="
ls -lh browser-extension/dist/content.js | awk '{print $6, $7, $8, $9}'

echo -e "\n=== Server Logs (last 10 lines) ==="
tail -10 browser-extension/server.log 2>/dev/null || echo "No log file found"
```

---

## 🆘 Still Not Working?

### Collect Debug Info

```bash
# Run this and share output:

echo "OS: $(uname -a)"
echo "Node: $(node -v)"
echo "pnpm: $(pnpm -v)"
echo "Chrome: $(open -a 'Google Chrome' --args --version 2>&1 | head -1)"

echo -e "\n=== Extension Build ==="
ls -lh browser-extension/dist/

echo -e "\n=== Server Process ==="
ps aux | grep "node server/api.js"

echo -e "\n=== Port 3333 Status ==="
lsof -i :3333

echo -e "\n=== Network Test ==="
curl -v http://localhost:3333/api/health 2>&1 | head -20

echo -e "\n=== Extension Console Errors ==="
echo "Check Chrome DevTools → Console for errors"
```

### Reset Everything

**Nuclear option** - wipe and restart:

```bash
# 1. Kill server
lsof -ti:3333 | xargs kill -9

# 2. Clean build
cd browser-extension
rm -rf dist node_modules
pnpm install
pnpm build

# 3. Start fresh server
node server/api.js

# 4. In Chrome:
# - Remove extension
# - Load unpacked from dist/
# - Test
```

---

## 📝 Prevention Checklist

To avoid "domain doesn't work" issues:

- [ ] Always rebuild extension after code changes: `pnpm build`
- [ ] Keep server running in background: `nohup node server/api.js &`
- [ ] Check server logs regularly: `tail -f server.log`
- [ ] Verify API URL matches in sidebar.ts and server
- [ ] Test health endpoint after changes: `curl .../api/health`
- [ ] Use consistent ports (don't change randomly)
- [ ] Document custom ports if changed from 3333
- [ ] Monitor production server uptime (UptimeRobot)

---

## 🔗 Related Documentation

- **ARCHITECTURE.md** - Full system overview
- **PRODUCTION_DEPLOYMENT.md** - Deploying to production
- **API_INTEGRATION.md** - API endpoint reference
- **QUICK_REFERENCE.md** - Common commands

---

**Last Updated**: 2025-01-15  
**Maintained by**: jmenichole
