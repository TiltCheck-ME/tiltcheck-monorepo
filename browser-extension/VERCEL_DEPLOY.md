# Deploy TiltGuard API to Vercel

## 🚀 Quick Deploy (5 minutes)

### 1. Install Vercel CLI

```bash
npm i -g vercel
```

### 2. Deploy from browser-extension directory

```bash
cd /Users/fullsail/Desktop/tiltcheck-monorepo/tiltcheck-monorepo/browser-extension
vercel
```

**Follow prompts:**
- Set up and deploy? **Y**
- Scope: Select your account
- Link to existing project? **N**
- Project name: **tiltguard-api** (or custom)
- Directory: **./browser-extension**
- Override settings? **N**

### 3. Add Environment Variables

```bash
vercel env add DISCORD_CLIENT_ID
# Paste: 1419742988128616479

vercel env add DISCORD_CLIENT_SECRET
# Paste: wz0Cbj_aAjoTezAU1IH54pKlnjfMz1XY

vercel env add SUPABASE_URL
# (Optional - leave empty for now)

vercel env add SUPABASE_KEY
# (Optional - leave empty for now)
```

### 4. Deploy to Production

```bash
vercel --prod
```

Vercel will give you a URL like: `https://tiltguard-api.vercel.app`

---

## 📋 Add Discord Redirect URI

Go to: https://discord.com/developers/applications/1419742988128616479/oauth2

Add your new Vercel URL:
```
https://your-project.vercel.app/api/auth/discord/callback
```

**Click "Save Changes"**

---

## 🔧 Update Extension API URL

Edit `browser-extension/src/sidebar.ts`:

```typescript
const API_BASE = 'https://your-project.vercel.app/api';
```

Rebuild extension:
```bash
cd browser-extension
pnpm build
```

Reload extension in Chrome.

---

## ✅ Test Endpoints

```bash
# Health check
curl https://your-project.vercel.app/api/health

# Guest auth
curl -X POST https://your-project.vercel.app/api/auth/guest

# Dashboard (needs token)
curl -H "Authorization: Bearer YOUR_TOKEN" https://your-project.vercel.app/api/dashboard
```

---

## 🎯 What's Different from Railway

**Vercel Serverless:**
- Each endpoint is a separate function file
- No persistent server process
- Auto-scales on demand
- Cold starts (~100ms first request)
- Free tier: 100GB bandwidth, 100k invocations/month

**Files Created:**
```
browser-extension/
├── api/
│   ├── health.js              → /api/health
│   ├── dashboard.js           → /api/dashboard
│   ├── auth/
│   │   ├── guest.js           → /api/auth/guest
│   │   ├── discord.js         → /api/auth/discord
│   │   └── discord/
│   │       └── callback.js    → /api/auth/discord/callback
│   ├── vault/
│   │   └── balance.js         → /api/vault/balance
│   └── package.json
├── vercel.json                → Vercel config
└── .vercelignore              → Deployment exclusions
```

---

## 🔥 Benefits

✅ **Free tier generous** (100k requests/month)  
✅ **Auto GitHub deploys** (connect repo)  
✅ **Instant global CDN**  
✅ **Zero config SSL**  
✅ **No server management**  

---

## 🚨 Limitations

⚠️ **No persistent in-memory storage** (use Supabase)  
⚠️ **Cold starts** (first request slower)  
⚠️ **10s execution limit** (enough for API)  

---

**Ready to deploy!** Run `vercel` from browser-extension directory.
