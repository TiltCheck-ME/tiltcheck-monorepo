# Tilt Events Persistence - Deployment Guide

## 🎯 Overview

Deploy tilt events persistence system to production in 4 steps:
1. Set up Supabase table
2. Deploy backend
3. Deploy Discord bot
4. Deploy dashboard

**Total time**: ~30 minutes

---

## Step 1: Supabase Database Setup (5 min)

### Create the Table

1. Log into [Supabase Dashboard](https://supabase.com)
2. Select your TiltCheck project
3. Click **SQL Editor** (left sidebar)
4. Click **New Query** button
5. Copy the entire SQL from `/docs/migrations/001-tilt-events.sql`
6. Paste into the query editor
7. Click **Run** button

**Expected**: Green checkmark, "Success. No rows returned"

### Verify Table Created

1. Click **Table Editor** (left sidebar)
2. You should see `tilt_events` table in the list
3. Click it to verify columns:
   - id, user_id, timestamp, signals, tilt_score, context, created_at, updated_at

✅ **Database ready**

---

## Step 2: Deploy Backend

### Option A: Railway (Recommended - Easy)

#### 1. Connect GitHub
1. Go to [Railway.app](https://railway.app)
2. Click **New Project**
3. Select **GitHub Repo**
4. Connect your GitHub account
5. Select `tiltcheck-monorepo` repository
6. Click **Add Service**

#### 2. Configure Service
1. Click on the created service
2. Go to **Settings** tab
3. Set **Root Directory**: `backend`
4. Set **Build Command**: `pnpm install && pnpm build`
5. Set **Start Command**: `pnpm start`

#### 3. Add Environment Variables
In Railway, go to **Variables** tab and add:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
PORT=3000
NODE_ENV=production
DISCORD_TOKEN=your_token
# ... other existing vars
```

#### 4. Deploy
- Railway auto-deploys on push to `main` branch
- Watch the build logs
- When green checkmark appears, it's live

**Your backend URL will be**: `https://your-service.railway.app`

---

### Option B: Spaceship (If Using for Other Services)

#### 1. Prepare Backend

```bash
cd backend

# Install dependencies
pnpm install

# Build
pnpm build

# Verify it works
pnpm start
```

#### 2. Push to Repository

```bash
git add -A
git commit -m "feat: add tilt events persistence"
git push origin main
```

#### 3. Deploy via Spaceship

Follow Spaceship's standard Node.js deployment process:
- Push code
- Spaceship auto-detects `package.json`
- Sets build command: `pnpm install && pnpm build`
- Sets start command: `pnpm start`

#### 4. Set Environment Variables

In Spaceship dashboard, add:
```
SUPABASE_URL=your_url
SUPABASE_ANON_KEY=your_key
# ... other vars
```

**Your backend URL will be shown in Spaceship dashboard**

---

### Option C: Other Hosting (Vercel, Netlify, AWS, etc.)

Generic Node.js deployment:

```bash
# Ensure package.json has build script
# "build": "tsc -p tsconfig.json"

# Build
pnpm build

# Start
pnpm start
```

Set these environment variables in your hosting platform:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `PORT` (often set automatically)
- `NODE_ENV=production`
- Other existing vars

---

## Step 3: Deploy Discord Bot

### Option A: Railway

#### 1. Create New Service in Railway
1. Go back to your Railway project
2. Click **New Service**
3. Select **GitHub Repo** → same `tiltcheck-monorepo`
4. Click **Add Service**

#### 2. Configure Service
1. Go to **Settings** tab
2. Set **Root Directory**: `apps/discord-bot`
3. Set **Build Command**: `pnpm install && pnpm build`
4. Set **Start Command**: `pnpm start`

#### 3. Add Environment Variables
```
DISCORD_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id
BACKEND_URL=https://your-backend.railway.app
DASHBOARD_URL=https://your-dashboard.vercel.app/user
# ... other vars
```

**Important**: Set `BACKEND_URL` to the backend service URL from Step 2

#### 4. Deploy
Railway auto-deploys with your backend

---

### Option B: Other Hosting

Same as backend, but use `/apps/discord-bot` directory.

Key environment variables:
```
DISCORD_TOKEN=your_token
DISCORD_CLIENT_ID=your_client_id
BACKEND_URL=https://your-backend-url.com
```

---

## Step 4: Deploy Dashboard

### Option A: Vercel (Recommended for Next.js)

#### 1. Connect to Vercel
1. Go to [Vercel.com](https://vercel.com)
2. Click **New Project**
3. Import Git Repository
4. Select `tiltcheck-monorepo`
5. Click **Import**

#### 2. Configure
1. **Root Directory**: `apps/dashboard`
2. **Framework**: Next.js (auto-detected)
3. **Build Command**: `pnpm build` (auto-detected)

#### 3. Add Environment Variable
```
NEXT_PUBLIC_BACKEND_URL=https://your-backend.railway.app
```

**Important**: Must be `NEXT_PUBLIC_` so it's available in browser

#### 4. Deploy
Click **Deploy** button. Vercel builds and deploys automatically.

Your dashboard will be at: `https://your-project.vercel.app`

---

### Option B: Railway

You can also deploy the dashboard to Railway:

1. Create new service in Railway
2. Root Directory: `apps/dashboard`
3. Build Command: `pnpm install && pnpm build`
4. Start Command: `pnpm start`
5. Add `NEXT_PUBLIC_BACKEND_URL` env var
6. Deploy

---

### Option C: Other Hosting

Deploy as static Next.js app:

```bash
cd apps/dashboard
pnpm build
pnpm start
```

Set environment variable:
```
NEXT_PUBLIC_BACKEND_URL=https://your-backend-url.com
```

---

## Summary: Final URLs

After all deployments, you'll have 3 URLs:

| Service | URL | Example |
|---------|-----|---------|
| **Backend API** | `https://your-backend.railway.app` | Used by bot & dashboard |
| **Discord Bot** | Running on Railway | Users type `/dashboard` |
| **Web Dashboard** | `https://your-project.vercel.app` | Users click dashboard button |

---

## Step 5: Verify Production Deployment

### Test Backend Health
```bash
curl https://your-backend.railway.app/api/tilt/stats/test-user
# Should return JSON with stats
```

### Test Discord Command
1. Go to your Discord server
2. Type `/dashboard`
3. Should see tilt stats embed

### Test Web Dashboard
1. Visit: `https://your-project.vercel.app/user?userId=YOUR_DISCORD_ID`
2. Should load full dashboard with your stats

---

## Environment Variables Summary

### Backend (`.env` or hosting platform)
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
PORT=3000
NODE_ENV=production
DISCORD_TOKEN=your_token
MONGODB_URI=optional
SESSION_SECRET=production-secret
# ... other existing vars
```

### Discord Bot (`.env` or hosting platform)
```
DISCORD_TOKEN=your_token
DISCORD_CLIENT_ID=your_client_id
BACKEND_URL=https://your-backend.railway.app
DASHBOARD_URL=https://your-project.vercel.app/user
# ... other existing vars
```

### Dashboard (`.env.local` or hosting platform)
```
NEXT_PUBLIC_BACKEND_URL=https://your-backend.railway.app
```

---

## Common Issues & Fixes

### "Cannot connect to Supabase"
**Problem**: Backend can't reach Supabase  
**Fix**: Check `SUPABASE_URL` and `SUPABASE_ANON_KEY` are correct

### "/dashboard command returns error"
**Problem**: Bot can't reach backend API  
**Fix**: Check `BACKEND_URL` in bot environment variables

### "Dashboard shows no data"
**Problem**: Dashboard can't reach backend  
**Fix**: Check `NEXT_PUBLIC_BACKEND_URL` is set correctly in dashboard

### "Build fails on Railway/Vercel"
**Problem**: Build command failed  
**Fix**: 
- Ensure `pnpm-lock.yaml` is committed to git
- Check root directory is set correctly
- View build logs for exact error

### "Dashboard loads but stuck loading"
**Problem**: Backend URL incorrect or backend offline  
**Fix**: 
- Open browser DevTools → Console
- Check for fetch errors
- Verify `NEXT_PUBLIC_BACKEND_URL` matches actual backend

---

## Deployment Checklist

### Pre-Deployment
- [ ] Code pushed to GitHub main branch
- [ ] All tests passing locally
- [ ] Environment variables ready
- [ ] Supabase table created
- [ ] Got Supabase URL and key

### Backend Deployment
- [ ] Service created on hosting platform
- [ ] Root directory set to `backend`
- [ ] Build command configured
- [ ] Environment variables added
- [ ] Deployment successful
- [ ] Health check passes: `curl https://backend-url/api/tilt/stats/test`

### Bot Deployment
- [ ] Service created on hosting platform
- [ ] Root directory set to `apps/discord-bot`
- [ ] `BACKEND_URL` points to deployed backend
- [ ] `DISCORD_TOKEN` configured
- [ ] Deployment successful
- [ ] Check logs for: "[TiltHandler] ✅ Tilt events handler initialized"

### Dashboard Deployment
- [ ] Project created on hosting platform
- [ ] Root directory set to `apps/dashboard`
- [ ] `NEXT_PUBLIC_BACKEND_URL` set correctly
- [ ] Deployment successful
- [ ] Page loads: `https://dashboard-url/user?userId=test`

### Post-Deployment
- [ ] Backend API responds: `/api/tilt/stats/test`
- [ ] `/dashboard` command works in Discord
- [ ] Web dashboard loads full page
- [ ] Can see stats and recent events
- [ ] No console errors in browser

---

## Auto-Deploy on Git Push

### Railway
- Auto-deploys all services when you push to `main`
- No additional setup needed
- Watch deployment progress in Railway dashboard

### Vercel
- Auto-deploys when you push to `main`
- Can configure branch preview deployments
- Watch build progress in Vercel dashboard

### GitHub Actions (Optional)
For custom deployments, you can set up GitHub Actions:

```yaml
name: Deploy on Push
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: pnpm install
      - run: pnpm build
      - run: pnpm deploy  # your deploy script
```

---

## Rollback Procedure

If something goes wrong:

### Railway
1. Go to **Deployments** tab
2. Click previous successful deployment
3. Click **Redeploy**

### Vercel
1. Go to **Deployments** tab
2. Click previous successful deployment
3. Click **Redeploy**

### Manual Rollback
```bash
git revert HEAD
git push origin main
# Services auto-redeploy
```

---

## Monitoring & Maintenance

### Check Backend Health
```bash
curl https://your-backend.railway.app/api/tilt/stats/any-user-id
```

### Check Bot Status
- Type `/dashboard` in Discord
- Should respond within 2 seconds

### Monitor Supabase
1. Go to Supabase dashboard
2. Check **Database** → **Connections** tab
3. Monitor table size: `SELECT COUNT(*) FROM tilt_events;`

### View Logs

**Railway**:
- Click service → **Logs** tab

**Vercel**:
- Click project → **Deployments** → **Function Logs**

**Supabase**:
- Click project → **Database** → **Query Performance**

---

## Production Optimization

### Enable Caching on Dashboard
In `next.config.mjs`:
```javascript
const nextConfig = {
  // ... existing config
  onDemandEntries: {
    maxInactiveAge: 60 * 1000, // 60 seconds
    pagesBufferLength: 5,
  },
};
```

### Set up Supabase Backups
1. Supabase → **Settings** → **Backups**
2. Enable automatic daily backups
3. Keep 7-day retention

### Add Rate Limiting
In backend, add middleware:
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
});

app.use('/api/', limiter);
```

---

## What's Next After Deployment

1. **Monitor for 24 hours**
   - Watch error logs
   - Check if bot is working
   - Verify dashboard loads

2. **Enable RLS** (optional but recommended)
   - Uncomment RLS policies in migration
   - Add authentication to dashboard
   - Only show users their own data

3. **Set up Analytics**
   - Monitor tilt event volume
   - Track dashboard usage
   - Watch API response times

4. **Plan Scaling**
   - Monitor Supabase table size
   - Plan database replication
   - Consider caching layer if needed

---

## Quick Reference Commands

```bash
# Build everything locally
pnpm build

# Build specific service
pnpm build --filter @tiltcheck/backend
pnpm build --filter @tiltcheck/discord-bot
pnpm build --filter @tiltcheck/dashboard

# Test API locally
curl http://localhost:3000/api/tilt/stats/test-user

# Push changes
git add -A
git commit -m "feat: description"
git push origin main
```

---

## Support

If deployment fails:

1. Check Railway/Vercel build logs (click service → Logs)
2. Check environment variables are set
3. Check Supabase URL and key are correct
4. Run locally first: `cd backend && pnpm dev`
5. Review the setup guide: `/docs/TILT-PERSISTENCE-SETUP.md`

