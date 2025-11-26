# 🔧 COMPLETE DEPLOYMENT FIX GUIDE

## Issues Found

### ❌ Discord OAuth
- Missing Client Secret in `.env.local`
- Redirect URIs not configured for production domains

### ❌ Railway Deployment  
- ESM/CommonJS module conflicts
- Missing built packages in `node_modules`
- `rate-limiter.js` trying to use `import` in CommonJS context

### ❌ Render Deployment
- Same module issues as Railway
- Looking for `Dockerfile.render` that doesn't exist

---

## ✅ FIX 1: Discord OAuth (Extension)

### Step 1: Get Discord Client Secret

Go to: https://discord.com/developers/applications/1419742988128616479/oauth2

1. Under **"CLIENT SECRET"** → Click **"Copy"**
2. Keep it copied

### Step 2: Add to Local `.env.local`

The file is already created at:
```
browser-extension/server/.env.local
```

Open it and replace `YOUR_CLIENT_SECRET_HERE` with your actual secret.

### Step 3: Add All Redirect URIs in Discord

Still in Discord OAuth2 settings, add these **3 redirect URIs**:

```
http://localhost:3333/api/auth/discord/callback
https://tiltcheck.it.com/api/auth/discord/callback
https://tiltcheck-monorepo-production.up.railway.app/api/auth/discord/callback
```

Click **"Save Changes"**!

### Step 4: Test Local OAuth

```bash
cd browser-extension/server
node api.js
```

Open extension → Click Discord Login → Should work!

---

## ✅ FIX 2: Railway Deployment (Main Services)

### Current Railway Issues:

1. **ESM Module Error** - `rate-limiter.js` using `import` in CommonJS
2. **Missing Packages** - `@tiltcheck/suslink`, `@tiltcheck/discord-utils` not built
3. **Build Process** - Packages not building before deployment

### Solution: Fix Build Process

```bash
# 1. Build all packages first
cd /Users/fullsail/Desktop/tiltcheck-monorepo/tiltcheck-monorepo
pnpm build

# 2. Check what's built
ls -la packages/*/dist

# 3. Deploy to Railway
railway up
```

### Alternative: Deploy Only Extension API to Railway

Instead of deploying the entire monorepo, deploy just the browser extension API:

```bash
# Create new Railway service for extension API
cd browser-extension/server

# Initialize Railway in this directory
railway init

# Link to existing project or create new one
# Choose: "tiltcheck-extension-api" as service name

# Set environment variables
railway variables set DISCORD_CLIENT_ID=1419742988128616479
railway variables set DISCORD_CLIENT_SECRET=your_secret_here
railway variables set API_BASE_URL=https://tiltcheck-extension-api.up.railway.app
railway variables set PORT=3333
railway variables set NODE_ENV=production

# Deploy
railway up

# Get your domain
railway domain
```

---

## ✅ FIX 3: Render Deployment

### Issue: Missing Dockerfile.render

Render is looking for `Dockerfile.render` but it doesn't exist.

### Solution: Use Existing Dockerfile

```bash
# Rename/copy existing Dockerfile
cp Dockerfile.render Dockerfile

# Or update render.yaml to use correct Dockerfile
```

### Check render.yaml

```bash
cat render.yaml
```

Should point to correct Dockerfile or use Node buildpack.

---

## 🎯 RECOMMENDED APPROACH

Deploy services separately to avoid monorepo complexity:

### 1. Extension API → Railway (Separate Service)

```bash
cd browser-extension/server

# Simple, standalone deployment
railway init
railway variables set DISCORD_CLIENT_ID=1419742988128616479
railway variables set DISCORD_CLIENT_SECRET=your_secret
railway variables set API_BASE_URL=https://your-domain.up.railway.app
railway variables set PORT=3333
railway up
```

**Pros:**
- No monorepo build complexity
- Fast deploys
- Simple debugging

### 2. Main Services → Render (Keep as is)

Fix the module issues:

```bash
# Build packages locally
pnpm build

# Push to git
git add -A
git commit -m "Build packages for deployment"
git push

# Render will auto-deploy
```

---

## 📋 Quick Fix Checklist

**Discord OAuth:**
- [ ] Get Client Secret from Discord Developer Portal
- [ ] Add to `browser-extension/server/.env.local`
- [ ] Add 3 redirect URIs in Discord OAuth2 settings
- [ ] Test local: `cd browser-extension/server && node api.js`

**Railway (Extension API):**
- [ ] `cd browser-extension/server`
- [ ] `railway init` (create new service)
- [ ] Set environment variables
- [ ] `railway up`
- [ ] `railway domain` → Get production URL
- [ ] Update `sidebar.ts` with production URL
- [ ] Rebuild extension: `cd .. && pnpm build`

**Railway (Main Services) - Optional:**
- [ ] Run `pnpm build` in monorepo root
- [ ] Check `packages/*/dist` exist
- [ ] `railway up` from root
- [ ] Check logs: `railway logs`

**Render - Optional:**
- [ ] Create `Dockerfile.render` or update `render.yaml`
- [ ] Ensure packages build in Render build step
- [ ] Push to git → Auto-deploy

---

## 🚀 FASTEST PATH TO WORKING OAUTH

```bash
# 1. Get Discord Client Secret
open https://discord.com/developers/applications/1419742988128616479/oauth2

# 2. Add to .env.local
cd browser-extension/server
# Edit .env.local - add your secret

# 3. Add redirect URIs in Discord portal (3 URIs shown above)

# 4. Test local
node api.js
# Should see: 🎰 TiltGuard API Server on http://localhost:3333

# 5. Deploy to Railway (separate service)
railway init
railway variables set DISCORD_CLIENT_ID=1419742988128616479
railway variables set DISCORD_CLIENT_SECRET=your_secret
railway variables set API_BASE_URL=https://will-get-this-after-deploy.up.railway.app
railway variables set PORT=3333
railway up

# 6. Get Railway domain
railway domain
# Copy the URL

# 7. Update API_BASE_URL
railway variables set API_BASE_URL=https://your-actual-domain.up.railway.app

# 8. Update extension
cd ..
# Edit src/sidebar.ts - change API_BASE to Railway URL
pnpm build

# 9. Reload extension in Chrome

# 10. Test Discord login!
```

---

## Current Status

✅ **Extension API code** - Complete with OAuth  
✅ **Local .env.local** - Created, needs Client Secret  
❌ **Discord redirect URIs** - Need to add production URLs  
❌ **Railway deployment** - Monorepo has module errors  
❌ **Render deployment** - Missing Dockerfile  

**Next Action**: Add Discord Client Secret + Redirect URIs, then deploy extension API separately to Railway.
