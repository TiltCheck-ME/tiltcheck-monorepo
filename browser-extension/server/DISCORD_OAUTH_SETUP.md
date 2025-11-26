# ✅ Discord OAuth Setup - Complete Guide

## 🎯 What You Need

Your Discord Application is already created!
- **Application ID**: `1419742988128616479`
- **OAuth URL**: You already have it working
- **Missing**: Client Secret (get it below)

---

## 🔐 Step 1: Get Your Discord Client Secret

### Quick Steps (2 minutes):

1. **Go to Discord Developer Portal**:
   ```
   https://discord.com/developers/applications/1419742988128616479/oauth2
   ```

2. **Copy Client Secret**:
   - Under "CLIENT SECRET"
   - Click "Copy" button
   - Or click "Reset Secret" if you lost it (then copy the new one)

3. **Add to `.env` file**:
   ```bash
   cd browser-extension/server
   nano .env
   ```
   
   **Paste your secret**:
   ```env
   DISCORD_CLIENT_SECRET=your_actual_secret_here
   ```
   
   Save: `Ctrl+O`, `Enter`, then `Ctrl+X`

---

## 🔄 Step 2: Verify Redirect URI

**In Discord Developer Portal**:

1. Go to: `OAuth2` → `Redirects`

2. Make sure this is listed:
   ```
   http://localhost:3333/api/auth/discord/callback
   ```

3. If not, click **"Add Redirect"**, paste it, and click **"Save Changes"**

---

## 🏗️ Step 3: Rebuild Extension & Restart Server

```bash
# Terminal 1: Restart server with new .env
cd browser-extension/server
# Kill old server
lsof -ti:3333 | xargs kill -9
# Start with new environment
node api.js

# Terminal 2: Rebuild extension
cd browser-extension
pnpm build
```

---

## ✅ Step 4: Test Discord Login

1. **Reload Extension in Chrome**:
   - Go to `chrome://extensions/`
   - Click reload icon under TiltGuard

2. **Open Extension Sidebar**:
   - Click TiltGuard icon in toolbar

3. **Click "Discord Login"**:
   - Should open Discord OAuth window
   - Authorize the app
   - Window closes automatically
   - You're logged in! ✅

---

## 🧪 Test Commands

```bash
# Test OAuth redirect
curl -I http://localhost:3333/api/auth/discord
# Should return: HTTP/1.1 302 Found
# Location: https://discord.com/api/oauth2/authorize...

# Test callback (with fake code - will error but shows endpoint works)
curl "http://localhost:3333/api/auth/discord/callback?code=test123"
# Should return error about invalid code (that's OK!)
```

---

## 🎉 What You Get

Once working:
- ✅ Real Discord authentication
- ✅ Your Discord username shown in extension
- ✅ User data saved to database (or in-memory)
- ✅ Vault automatically created for your account
- ✅ No more guest mode needed!

---

## 🆘 Troubleshooting

### "DISCORD_CLIENT_SECRET not configured"

**Solution**: Add it to `browser-extension/server/.env`:
```env
DISCORD_CLIENT_SECRET=your_secret_here
```

### "Invalid OAuth2 redirect_uri"

**Solution**: Add redirect in Discord portal:
```
http://localhost:3333/api/auth/discord/callback
```

### "Failed to exchange code for token"

**Causes**:
1. Wrong client secret
2. Code already used (codes expire after 1 use)
3. Redirect URI mismatch

**Solution**: Check server logs for exact error:
```bash
tail -f browser-extension/server/server.log
```

### Extension doesn't receive auth

**Solution**: Check browser console (F12) for errors. The window.postMessage might be blocked.

---

## 📋 Complete Environment File

Your `browser-extension/server/.env` should look like:

```env
# Discord OAuth
DISCORD_CLIENT_ID=1419742988128616479
DISCORD_CLIENT_SECRET=paste_your_secret_here

# Server
API_BASE_URL=http://localhost:3333
PORT=3333
NODE_ENV=development

# Database (optional)
SUPABASE_URL=
SUPABASE_KEY=
```

---

## 🚀 Next Steps After Login Works

1. **Deploy to Production**:
   - Add production redirect: `https://your-api.render.com/api/auth/discord/callback`
   - Update `API_BASE_URL` env var in Render

2. **Add Database**:
   - Set up Supabase (free)
   - User data persists across restarts

3. **Link to Discord Bot**:
   - Share user identity between extension and bot
   - Tip history, trust scores sync

---

**Quick Command Summary**:

```bash
# Get your secret from Discord portal, then:

# 1. Add to .env
cd browser-extension/server
echo "DISCORD_CLIENT_SECRET=your_secret_here" >> .env

# 2. Restart server
lsof -ti:3333 | xargs kill -9 && node api.js

# 3. Rebuild extension
cd ../
pnpm build

# 4. Reload in Chrome and test!
```

---

**Need Your Client Secret?** Go here:  
👉 https://discord.com/developers/applications/1419742988128616479/oauth2

Click "Copy" under CLIENT SECRET, then paste in `.env` file!
