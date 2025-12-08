# 🚀 Deployment Checklist - Tilt Persistence System

## ⚠️ CRITICAL: Commit Discipline

**BEFORE ANYTHING ELSE:** After every change, do this:

```bash
# 1. Check uncommitted changes
git status

# 2. Stage everything
git add -A

# 3. Commit with meaningful message
git commit -m "feat: description of what changed"

# 4. PUSH IMMEDIATELY (don't wait!)
git push origin main

# 5. Verify success (look for "main -> main" in output)
# Example: To https://github.com/jmenichole/tiltcheck-monorepo.git c8e4424..d0fbab2 main -> main
```

**Why?** Recent issue: Changes were made but not pushed → production didn't update → users saw 404s

**Solution:** Push within 1 minute of commit. Always.

---

## Pre-Deployment (Do First)

### Prepare Your Accounts
- [ ] Supabase account & TiltCheck project open
- [ ] Railway account (or Vercel/other hosting)
- [ ] GitHub account with tiltcheck-monorepo access
- [ ] Discord developer portal with bot token

### Get Credentials
- [ ] Supabase URL: `https://xxxx.supabase.co`
- [ ] Supabase Anon Key: `eyxx...`
- [ ] Discord Bot Token: `MT...`
- [ ] Discord Client ID: `123...`

### Push Code (MANDATORY)
```bash
git add -A
git commit -m "feat: add tilt events persistence"
git push origin main
# ⏳ Wait for "main -> main" confirmation
```

✅ All code is now on GitHub and deploying

---

## Step 1: Database (5 minutes)

- [ ] Log into Supabase
- [ ] Click **SQL Editor** → **New Query**
- [ ] Copy-paste entire SQL from `/docs/migrations/001-tilt-events.sql`
- [ ] Click **Run** button
- [ ] Verify table created in **Table Editor**

✅ Database ready

---

## Step 2: Deploy Backend (10 minutes)

### Via Railway (Easiest)

1. Go to [Railway.app](https://railway.app)
2. Click **New Project**
3. Select **GitHub Repo** → `tiltcheck-monorepo`
4. New Service created

5. **Settings Tab:**
   - [ ] Root Directory: `backend`
   - [ ] Build Command: `pnpm install && pnpm build`
   - [ ] Start Command: `pnpm start`

6. **Variables Tab:**
   ```
   SUPABASE_URL=https://xxxx.supabase.co
   SUPABASE_ANON_KEY=eyxx...
   PORT=3000
   NODE_ENV=production
   DISCORD_TOKEN=MT...
   ```

7. Watch deploy logs → Green checkmark = Success
8. Copy the URL from Railway dashboard (e.g., `https://something.railway.app`)

✅ Backend deployed. Save the URL!

**Backend URL**: `_________________________`

---

## Step 3: Deploy Bot (5 minutes)

### Via Railway

1. In Railway project, click **New Service**
2. Select **GitHub Repo** → `tiltcheck-monorepo`

3. **Settings Tab:**
   - [ ] Root Directory: `apps/discord-bot`
   - [ ] Build Command: `pnpm install && pnpm build`
   - [ ] Start Command: `pnpm start`

4. **Variables Tab:**
   ```
   DISCORD_TOKEN=MT...
   DISCORD_CLIENT_ID=123...
   BACKEND_URL=https://your-backend.railway.app
   DASHBOARD_URL=https://your-dashboard-url/user
   ```
   
   **⚠️ IMPORTANT**: Use backend URL from Step 2!

5. Watch deploy logs → Green checkmark = Success

✅ Bot deployed

---

## Step 4: Deploy Dashboard (5 minutes)

### Via Vercel (Easiest for Next.js)

1. Go to [Vercel.com](https://vercel.com)
2. Click **New Project**
3. Select **GitHub** → Import → `tiltcheck-monorepo`
4. Click **Import**

5. **Configuration:**
   - [ ] Framework Preset: Next.js (auto)
   - [ ] Root Directory: `apps/dashboard`
   - [ ] Build Command: `pnpm build` (auto)

6. **Environment Variables:**
   ```
   NEXT_PUBLIC_BACKEND_URL=https://your-backend.railway.app
   ```
   
   **⚠️ IMPORTANT**: Use backend URL from Step 2!

7. Click **Deploy** button
8. Wait for green checkmark

Copy the dashboard URL: `https://xxxx.vercel.app`

✅ Dashboard deployed. Save the URL!

**Dashboard URL**: `_________________________`

---

## Step 5: Verification (5 minutes)

### Test 1: Backend API
```bash
curl https://your-backend.railway.app/api/tilt/stats/test-user
```

Expected: JSON response with stats
- [ ] Returns 200 OK
- [ ] Has fields: totalEvents, averageTiltScore, etc.

### Test 2: Discord Command
1. Go to your Discord server
2. Type `/dashboard`
3. Bot should respond with embed

- [ ] See tilt stats embed
- [ ] Color-coded (green/yellow/orange/red)
- [ ] "Full Dashboard" button visible

### Test 3: Web Dashboard
1. Visit: `https://your-dashboard.vercel.app/user?userId=123456`
2. Should load dashboard page

- [ ] Page loads (not stuck)
- [ ] Shows tilt status card
- [ ] Shows stats grid
- [ ] Shows recent events (if any)

✅ All systems working!

---

## Post-Deployment (Optional but Recommended)

### Update Bot Invite URL
If dashboard URL changed, update bot invite links everywhere:
- [ ] Discord server welcome message
- [ ] Dashboard button link in bot command

### Monitor for 24 Hours
- [ ] Check Railway dashboard for errors
- [ ] Check Vercel dashboard for errors
- [ ] Test `/dashboard` command periodically
- [ ] Check dashboard loads without errors

### Set Up Alerts (Optional)
- [ ] Railway: Enable email alerts for deployment failures
- [ ] Vercel: Enable email alerts for deployment failures
- [ ] Supabase: Monitor table size growth

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Backend won't deploy | Check build logs in Railway. Verify package.json exists. |
| Bot deployment fails | Check Root Directory is `apps/discord-bot` |
| Dashboard shows error | Check `NEXT_PUBLIC_BACKEND_URL` matches actual backend URL |
| `/dashboard` doesn't work | Check bot's `BACKEND_URL` env var matches deployed backend |
| "Cannot reach database" | Check Supabase URL and key are correct |

---

## Final Checklist

- [ ] Code pushed to GitHub
- [ ] Supabase table created
- [ ] Backend deployed and responds to API calls
- [ ] Bot deployed and `/dashboard` command works
- [ ] Dashboard deployed and loads page
- [ ] Backend URL saved: `_________________`
- [ ] Dashboard URL saved: `_________________`
- [ ] Tested all 3 verification tests above
- [ ] No errors in deployment logs
- [ ] Ready for production! 🎉

---

## What's Deployed

| Service | Where | URL |
|---------|-------|-----|
| **Backend API** | Railway | `https://your-backend.railway.app` |
| **Discord Bot** | Railway | Running (check logs) |
| **Web Dashboard** | Vercel | `https://your-dashboard.vercel.app` |
| **Database** | Supabase | PostgreSQL `tilt_events` table |

---

## Next Time You Push Code

Push to main branch:
```bash
git add -A
git commit -m "your message"
git push origin main
```

All services auto-update:
- Railway auto-deploys backend & bot
- Vercel auto-deploys dashboard

Watch the deployments in the dashboards - green checkmark = done!

---

## Need Help?

1. **Deployment issues?** → `/DEPLOYMENT-GUIDE.md` (detailed)
2. **Setup issues?** → `/docs/TILT-PERSISTENCE-SETUP.md`
3. **API issues?** → `/docs/TILT-EVENTS-API.md`
4. **Quick refresh?** → `/QUICK-START-TILT-PERSISTENCE.md`

