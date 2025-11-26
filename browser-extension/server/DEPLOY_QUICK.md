# ✅ Render Deployment - FIXED & READY

## What Was Fixed

1. **✅ Added Supabase Support** - API now supports database with automatic fallback to in-memory
2. **✅ Fixed Dependencies** - Created proper `package.json` in `server/` directory
3. **✅ Environment Variables** - Added dotenv support for configuration
4. **✅ Port Configuration** - Uses `process.env.PORT` for Render compatibility

## 🚀 Deploy to Render NOW (5 minutes)

### Step 1: Render Dashboard Setup

```
1. Go to: https://dashboard.render.com/
2. Click: "New +" → "Web Service"
3. Connect: Your GitHub repo (jmenichole/tiltcheck-monorepo)
4. Branch: ci/analyzers-workflow-rebased (or main)
```

### Step 2: Configure Build

```yaml
Name: tiltguard-api
Environment: Node
Region: Oregon (US West)
Root Directory: browser-extension/server
Build Command: npm install
Start Command: npm start
```

### Step 3: Environment Variables

**Click "Advanced" → "Add Environment Variable"**

**Required:**
```
NODE_ENV = production
```

**Optional (Database - add later):**
```
SUPABASE_URL = https://your-project.supabase.co
SUPABASE_KEY = your-anon-public-key
```

**Optional (Discord OAuth - add later):**
```
DISCORD_CLIENT_ID = your-client-id
DISCORD_CLIENT_SECRET = your-client-secret
API_BASE_URL = https://tiltguard-api.onrender.com
```

### Step 4: Deploy

1. Click **"Create Web Service"**
2. Wait 2-3 minutes (watch build logs)
3. ✅ Copy your URL: `https://tiltguard-api.onrender.com`

### Step 5: Test Deployment

```bash
# Replace with your actual Render URL
curl https://tiltguard-api.onrender.com/api/health

# Should return:
# {"status":"online","service":"tiltguard-api",...}
```

---

## 🎯 Update Extension to Use Production API

### Edit sidebar.ts

```bash
# Open browser-extension/src/sidebar.ts
# Find line ~10-15:
const API_BASE = 'http://localhost:3333/api';

# Change to:
const API_BASE = 'https://tiltguard-api.onrender.com/api';
```

### Rebuild & Test

```bash
cd browser-extension
pnpm build

# Reload extension in Chrome:
# 1. chrome://extensions/
# 2. Click reload icon under TiltGuard
# 3. Open extension sidebar
# 4. Click "Continue as Guest"
# 5. Should work with production API!
```

---

## 📊 What Happens Now

### ✅ Working (No Database Needed)
- Guest authentication
- Session tracking (in-memory)
- Vault deposits/withdrawals (in-memory)
- Dashboard metrics (in-memory)
- Premium plans listing
- Health checks

### ⚠️ Limitations (Free Tier)
- **Data resets** on server restart (no database yet)
- **Sleeps after 15 min** of inactivity
- **Cold start** ~30 seconds on first request

### 🔄 To Make It Better

**Add Database (20 min setup)**:
1. Create Supabase project (free): https://supabase.com
2. Run SQL schema from `PRODUCTION_DEPLOYMENT.md`
3. Add `SUPABASE_URL` and `SUPABASE_KEY` to Render env vars
4. Redeploys automatically → data persists!

**Prevent Sleeping**:
- Upgrade to Render paid ($7/month) - always-on
- Or use https://cron-job.org to ping every 10 min (free)
- Or switch to Fly.io (3 always-on VMs free)

---

## 🆘 Troubleshooting

### Build Fails on Render

**Error**: `Cannot find module @supabase/supabase-js`

**Solution**: Already fixed! `server/package.json` now includes all dependencies.

---

### Server Returns 500 Error

**Check Render logs**:
1. Dashboard → tiltguard-api → Logs
2. Look for errors

**Common issue**: Missing environment variables
**Solution**: Add `NODE_ENV=production` in Render dashboard

---

### Extension Can't Connect

**Error in browser console**: `Failed to fetch`

**Solutions**:
1. Check API URL in `sidebar.ts` matches Render URL
2. Rebuild extension: `pnpm build`
3. Reload extension in Chrome
4. Check CORS - should allow `chrome-extension://` origins

---

## 📁 What Changed

### New Files Created:
- ✅ `browser-extension/server/package.json` - Standalone server dependencies
- ✅ `browser-extension/server/.env.example` - Environment template
- ✅ `browser-extension/server/RENDER_DEPLOY.md` - Detailed deployment guide
- ✅ `browser-extension/server/DEPLOY_QUICK.md` - This file (quick reference)

### Updated Files:
- ✅ `browser-extension/server/api.js` - Added Supabase support with fallback
- ✅ Uses `process.env.PORT` for Render compatibility
- ✅ Imports `dotenv/config` for environment variables
- ✅ Creates Supabase client if credentials provided

---

## 🎉 You're Ready!

**Current Status**:
- ✅ API server works locally (port 3333)
- ✅ Supabase-ready (optional, falls back to memory)
- ✅ Render deployment configured
- ✅ Extension can connect to production API

**Next Step**: Deploy to Render (5 min) or add Supabase database first (20 min)

---

**Quick Commands Reference**:

```bash
# Local development
cd browser-extension/server
npm install
npm start

# Test locally
curl http://localhost:3333/api/health

# Build extension for production
cd browser-extension
pnpm build

# Check server logs (if using nohup)
tail -f browser-extension/server/server.log
```

---

**Need Help?** See `RENDER_DEPLOY.md` or `PRODUCTION_DEPLOYMENT.md` for full details.
