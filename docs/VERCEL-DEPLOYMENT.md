# TiltCheck - Updated Deployment Guide (Vercel + Railway)

## Overview
TiltCheck is now optimized for Vercel deployment (frontend + dashboard) with microservices on Railway/other platforms.

---

## Deployment Architecture

```
User Request
    ↓
Vercel (tiltcheck.me)
    ├── Frontend (Static HTML/CSS/JS)
    ├── Dashboard (Next.js 14)
    └── Routes to:
        ├── Railway → Backend API
        ├── Railway → Discord Bot
        └── Supabase → Database
```

---

## Step 1: Vercel Deployment (Primary)

### 1.1 Connect Repository
1. Go to [vercel.com](https://vercel.com)
2. Click **New Project**
3. Import `jmenichole/tiltcheck-monorepo`
4. Select **main** branch

### 1.2 Configure Build Settings
- **Framework Preset**: Other (leave blank)
- **Root Directory**: `./` (monorepo root)
- **Build Command**: `pnpm build` (uses custom script)
- **Output Directory**: Leave default
- **Install Command**: `pnpm install`

### 1.3 Environment Variables
Add these in Vercel Dashboard → Settings → Environment Variables:

```bash
# Vercel AI Gateway
VERCEL_AI_GATEWAY_ENABLED=true
AI_GATEWAY_URL=https://gateway.ai.cloudflare.com/v1

# Supabase (for auth)
NEXT_PUBLIC_SUPABASE_URL=https://ypyvqddzrdjzfdwhcacb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>

# Backend API URL (set after Railway deployment)
NEXT_PUBLIC_BACKEND_URL=https://your-backend.railway.app
```

### 1.4 Deploy
- Click **Deploy**
- Vercel will build both frontend and dashboard
- Your site will be live at `https://your-project.vercel.app`

### 1.5 Add Custom Domain
1. Go to Vercel → Settings → Domains
2. Add `tiltcheck.me`
3. Follow DNS instructions
4. Vercel handles SSL automatically

**Result**: ✅ Frontend + Dashboard deployed on Vercel with auto-SSL

---

## Step 2: Railway Deployment (Backend Services)

### 2.1 Deploy Backend API

#### Create Service
1. Go to [railway.app](https://railway.app)
2. Click **New Project**
3. Select **GitHub Repo** → `tiltcheck-monorepo`
4. Click **Add Service**

#### Configure
- **Root Directory**: `backend`
- **Build Command**: `pnpm install && pnpm build`
- **Start Command**: `pnpm start`
- **Watch Paths**: `backend/**`

#### Environment Variables
```bash
SUPABASE_URL=https://ypyvqddzrdjzfdwhcacb.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
PORT=3000
NODE_ENV=production
DISCORD_TOKEN=<your-discord-token>
DISCORD_CLIENT_ID=<your-client-id>
SESSION_SECRET=<generate-random-string>
```

#### Get Public URL
- Railway auto-generates: `https://backend-production-xxxx.up.railway.app`
- Copy this URL for next step

### 2.2 Deploy Discord Bot

#### Create Service
1. In same Railway project, click **New Service**
2. Select **GitHub Repo** → `tiltcheck-monorepo`
3. Click **Add Service**

#### Configure
- **Root Directory**: `apps/discord-bot`
- **Build Command**: `pnpm install && pnpm build`
- **Start Command**: `pnpm start`
- **Watch Paths**: `apps/discord-bot/**`

#### Environment Variables
```bash
DISCORD_TOKEN=<your-bot-token>
DISCORD_CLIENT_ID=<your-client-id>
BACKEND_URL=https://backend-production-xxxx.up.railway.app
DASHBOARD_URL=https://tiltcheck.me/dashboard/user
SUPABASE_URL=https://ypyvqddzrdjzfdwhcacb.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
```

**Result**: ✅ Backend + Bot running on Railway

---

## Step 3: Update Vercel Environment

Now that Railway backend is deployed, update Vercel:

1. Go to Vercel → Settings → Environment Variables
2. Update `NEXT_PUBLIC_BACKEND_URL` to Railway backend URL
3. Redeploy Vercel project

---

## Step 4: Supabase Database Setup

### 4.1 Create Tilt Events Table
1. Go to [supabase.com](https://supabase.com)
2. Select your project
3. Go to **SQL Editor**
4. Run migration from `/docs/migrations/001-tilt-events.sql`

### 4.2 Enable Row Level Security (Optional)
Uncomment RLS policies in the migration file for production security.

**Result**: ✅ Database ready for tilt events persistence

---

## Final URLs

After deployment, you should have:

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend** | https://tiltcheck.me | Landing pages, tools |
| **Dashboard** | https://tiltcheck.me/dashboard | Next.js admin/user dashboard |
| **Backend API** | https://backend-xxxx.railway.app | REST API for tilt events |
| **Discord Bot** | (running on Railway) | Handles `/dashboard` command |
| **Database** | Supabase | Stores tilt events + user data |

---

## Verification Checklist

### Frontend
- [ ] Visit https://tiltcheck.me
- [ ] Floating user button appears (top-right)
- [ ] Click login → Discord OAuth works
- [ ] After login, see avatar + username
- [ ] Footer navigation works

### Dashboard
- [ ] Visit https://tiltcheck.me/dashboard
- [ ] Dashboard loads (Control Center)
- [ ] Visit https://tiltcheck.me/dashboard/user
- [ ] User dashboard loads with stats

### Backend
- [ ] Test API: `curl https://backend-xxxx.railway.app/api/tilt/stats/test-user`
- [ ] Returns JSON with stats

### Discord Bot
- [ ] Type `/dashboard` in Discord server
- [ ] Bot responds with tilt stats embed
- [ ] Click "View Full Dashboard" button
- [ ] Opens dashboard in browser

---

## Auto-Deploy Setup

### Vercel Auto-Deploy
- Already enabled by default
- Push to `main` branch → auto-deploys frontend + dashboard
- View logs in Vercel Dashboard

### Railway Auto-Deploy
- Go to each service → Settings → GitHub
- Enable **Auto Deploy** on push to `main`
- Configure **Watch Paths** to only deploy on relevant file changes

---

## Environment Variables Summary

### Vercel (Frontend + Dashboard)
```bash
VERCEL_AI_GATEWAY_ENABLED=true
AI_GATEWAY_URL=https://gateway.ai.cloudflare.com/v1
NEXT_PUBLIC_SUPABASE_URL=https://ypyvqddzrdjzfdwhcacb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
NEXT_PUBLIC_BACKEND_URL=https://backend-xxxx.railway.app
```

### Railway Backend
```bash
SUPABASE_URL=https://ypyvqddzrdjzfdwhcacb.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
PORT=3000
NODE_ENV=production
DISCORD_TOKEN=<your-token>
DISCORD_CLIENT_ID=<your-id>
SESSION_SECRET=<random-string>
```

### Railway Discord Bot
```bash
DISCORD_TOKEN=<your-token>
DISCORD_CLIENT_ID=<your-id>
BACKEND_URL=https://backend-xxxx.railway.app
DASHBOARD_URL=https://tiltcheck.me/dashboard/user
SUPABASE_URL=https://ypyvqddzrdjzfdwhcacb.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
```

---

## Common Issues

### "Discord OAuth doesn't work"
- Check `NEXT_PUBLIC_SUPABASE_URL` is set in Vercel
- Verify Supabase redirect URI includes `https://tiltcheck.me`
- Check browser console for errors

### "Dashboard can't connect to backend"
- Verify `NEXT_PUBLIC_BACKEND_URL` points to Railway URL
- Check Railway backend is running (green status)
- Test backend API with curl

### "/dashboard command returns error"
- Check `BACKEND_URL` in bot environment variables
- Verify Railway backend is accessible
- Check bot logs for errors

### "Vercel build fails"
- Check `pnpm-lock.yaml` is committed
- Verify `package.json` build script exists
- View build logs for specific error

---

## Monitoring & Maintenance

### Vercel
- **Dashboard**: Monitor deployments, view logs
- **Analytics**: Track page views (free tier)
- **Logs**: Function logs available for 24h (Pro tier for longer)

### Railway
- **Metrics**: CPU, memory, network usage
- **Logs**: Real-time logs for each service
- **Alerts**: Set up alerts for downtime

### Supabase
- **Database**: Monitor connections, query performance
- **Auth**: Track login success/failure rates
- **Backups**: Enable automatic daily backups

---

## Scaling Considerations

### Vercel (Frontend)
- Auto-scales globally via CDN
- 100GB bandwidth/month (Hobby tier)
- Unlimited static requests

### Railway (Backend)
- Starts with $5/month credit
- Scales vertically (CPU/RAM)
- For high traffic: consider serverless functions

### Supabase
- Free tier: 500MB database, 50,000 monthly active users
- Paid tiers scale automatically

---

## Cost Estimate (Monthly)

| Service | Tier | Cost |
|---------|------|------|
| Vercel | Hobby | $0 (custom domain included) |
| Railway | Hobby | $5 credit → ~$10-20/month |
| Supabase | Free | $0 (under limits) |
| Discord Bot | Free | $0 (hosted on Railway) |
| **Total** | | **~$10-20/month** |

---

## Next Steps After Deployment

1. **Enable RLS** on Supabase for production security
2. **Set up monitoring** alerts (Railway + Vercel)
3. **Configure backups** (Supabase daily backups)
4. **Test OAuth flow** end-to-end
5. **Monitor logs** for first 24 hours
6. **Set up Sentry** for error tracking (optional)

---

## Rollback Procedure

### Vercel
1. Go to Deployments tab
2. Click previous working deployment
3. Click "Redeploy"

### Railway
1. Go to service → Deployments
2. Click previous working deployment
3. Click "Redeploy"

### Quick Rollback (Git)
```bash
git revert HEAD
git push origin main
# Both Vercel and Railway auto-redeploy
```

---

## Support

- **Vercel Docs**: https://vercel.com/docs
- **Railway Docs**: https://docs.railway.app
- **Supabase Docs**: https://supabase.com/docs
- **TiltCheck Discord**: https://discord.gg/s6NNfPHxMS

---

**Built by**: jmenichole  
**TiltCheck Ecosystem** © 2024–2025
