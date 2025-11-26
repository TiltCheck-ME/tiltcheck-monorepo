# 🔧 QUICK FIX: Discord OAuth Invalid Redirect

## 🎯 Your Setup

**Discord App ID**: `1419742988128616479`
**Railway Domains**:
- Primary: `https://tiltcheck.it.com`
- Backup: `https://tiltcheck-monorepo-production.up.railway.app`
**Local Dev**: `http://localhost:3333`

---

## ✅ Step 1: Add All Redirect URIs to Discord

Go to: https://discord.com/developers/applications/1419742988128616479/oauth2

### Click "Add Redirect" for each:

```
http://localhost:3333/api/auth/discord/callback
https://tiltcheck.it.com/api/auth/discord/callback
https://tiltcheck-monorepo-production.up.railway.app/api/auth/discord/callback
```

**Click "Save Changes"** at the bottom!

---

## ✅ Step 2: Get Your Discord Client Secret

Still on the OAuth2 page:

1. Under **"CLIENT SECRET"** → Click **"Copy"** (or Reset Secret if lost)
2. Keep this copied - you'll need it next

---

## ✅ Step 3: Configure Local Environment

```bash
cd browser-extension/server
open .env.local
```

**Update these values**:

```env
# Discord OAuth Configuration
DISCORD_CLIENT_ID=1419742988128616479
DISCORD_CLIENT_SECRET=paste_your_secret_here
API_BASE_URL=http://localhost:3333

# Server Configuration
PORT=3333
NODE_ENV=development
```

Save: `Cmd+S`

---

## ✅ Step 4: Configure Railway Environment

```bash
cd /Users/fullsail/Desktop/tiltcheck-monorepo/tiltcheck-monorepo

# Set Discord OAuth variables on Railway
railway variables set DISCORD_CLIENT_ID=1419742988128616479
railway variables set DISCORD_CLIENT_SECRET=paste_your_secret_here
railway variables set API_BASE_URL=https://tiltcheck.it.com

# Set server config
railway variables set PORT=3333
railway variables set NODE_ENV=production
```

---

## ✅ Step 5: Deploy to Railway

### Option A: Deploy browser-extension API

```bash
# Navigate to server directory
cd browser-extension/server

# Deploy this specific service
railway up --service tiltguard-api
```

### Option B: Create new Railway service for extension API

```bash
cd browser-extension/server

# Initialize Railway for this directory
railway init

# Set variables
railway variables set DISCORD_CLIENT_ID=1419742988128616479
railway variables set DISCORD_CLIENT_SECRET=your_secret
railway variables set API_BASE_URL=https://your-service.up.railway.app
railway variables set PORT=3333
railway variables set NODE_ENV=production

# Deploy
railway up

# Get domain
railway domain
```

---

## ✅ Step 6: Update Extension for Production

Once Railway is deployed, update the extension:

```typescript
// browser-extension/src/sidebar.ts
// Change line ~10:
const API_BASE = 'https://tiltcheck.it.com/api';
// or
const API_BASE = 'https://your-railway-domain.up.railway.app/api';
```

```bash
# Rebuild extension
cd browser-extension
pnpm build
```

---

## 🧪 Step 7: Test Local OAuth

```bash
# Start local server with .env.local
cd browser-extension/server
node api.js

# Should show:
# 🎰 TiltGuard API Server
# 🌐 Server: http://localhost:3333
```

### Test in Extension:

1. Reload extension in Chrome
2. Click Discord Login
3. Should redirect to Discord without "invalid redirect" error
4. Authorize → Redirects back to `localhost:3333/api/auth/discord/callback`
5. Window closes, you're logged in!

---

## 🚀 Step 8: Test Production OAuth

### Update extension to use Railway:

```bash
cd browser-extension
# Edit src/sidebar.ts - change API_BASE to Railway URL
pnpm build
# Reload extension in Chrome
```

### Test:

1. Click Discord Login
2. Redirects to Discord
3. Authorize
4. Redirects back to Railway: `tiltcheck.it.com/api/auth/discord/callback`
5. Shows success page
6. Window closes, logged in!

---

## 🔍 Check Railway Deployment Status

```bash
# Check if service is running
railway status

# Check logs
railway logs

# Check environment variables
railway variables

# Get domain
railway domain
```

---

## 🆘 Troubleshooting

### "Invalid Redirect URI"

**Cause**: Redirect URI not added in Discord Developer Portal

**Solution**:
1. Go to Discord OAuth2 settings
2. Add ALL three redirect URIs (local + both Railway domains)
3. Click "Save Changes"
4. Wait 30 seconds for propagation

---

### "Railway domain not loading"

**Check deployment**:
```bash
railway status
railway logs
```

**Common issues**:
1. Service not deployed: `railway up`
2. Wrong PORT: Should be set in Railway variables
3. Build failed: Check logs for errors

**Fix**:
```bash
# Redeploy
cd browser-extension/server
railway up

# Check it's running
curl https://tiltcheck.it.com/api/health
```

---

### "DISCORD_CLIENT_SECRET not configured"

**Cause**: Secret not in .env or Railway variables

**Local fix**:
```bash
cd browser-extension/server
open .env.local
# Add: DISCORD_CLIENT_SECRET=your_secret
# Save: Cmd+S
```

**Railway fix**:
```bash
railway variables set DISCORD_CLIENT_SECRET=your_secret
railway restart
```

---

### "Extension can't connect to Railway"

**Check CORS**:

Your `server/api.js` should have:
```javascript
app.use(cors({
  origin: [
    'chrome-extension://YOUR_EXTENSION_ID',
    'https://tiltcheck.it.com',
    'http://localhost:3333'
  ],
  credentials: true
}));
```

**Get your extension ID**:
1. Go to `chrome://extensions/`
2. Copy ID under TiltGuard
3. Add to CORS origins

---

## 📋 Complete Checklist

- [ ] Added all 3 redirect URIs in Discord Developer Portal
- [ ] Copied Discord Client Secret
- [ ] Added secret to `browser-extension/server/.env.local`
- [ ] Added secret to Railway variables
- [ ] Set `API_BASE_URL` in Railway
- [ ] Deployed to Railway (`railway up`)
- [ ] Railway domain is accessible (`curl https://tiltcheck.it.com/api/health`)
- [ ] Updated extension `API_BASE` to Railway URL
- [ ] Rebuilt extension (`pnpm build`)
- [ ] Reloaded extension in Chrome
- [ ] Tested Discord OAuth (both local and production)

---

## 🎯 Quick Commands

```bash
# 1. Add Discord secret locally
cd browser-extension/server
echo "DISCORD_CLIENT_SECRET=your_secret" >> .env.local

# 2. Add to Railway
railway variables set DISCORD_CLIENT_SECRET=your_secret
railway variables set API_BASE_URL=https://tiltcheck.it.com

# 3. Deploy to Railway
railway up

# 4. Test Railway is up
curl https://tiltcheck.it.com/api/health

# 5. Rebuild extension for production
cd ../
# Edit sidebar.ts API_BASE first!
pnpm build

# 6. Test!
```

---

**Next**: Once Discord OAuth works, you can deploy and use production!
