# 🚀 DEPLOYMENT - START HERE

## Choose Your Path

### 🏃 In a Hurry? (5 minutes)
1. Read: [`DEPLOYMENT-CHECKLIST.md`](./DEPLOYMENT-CHECKLIST.md)
2. Follow the 5 steps
3. Done!

### 👨‍💼 Want Detailed Steps? (15 minutes)
1. Read: [`DEPLOYMENT-GUIDE.md`](./DEPLOYMENT-GUIDE.md)
2. Follow detailed instructions for each service
3. Deploy!

### 📖 Need Full Context First? (20 minutes)
1. Read: [`QUICK-START-TILT-PERSISTENCE.md`](./QUICK-START-TILT-PERSISTENCE.md)
2. Read: [`DEPLOYMENT-CHECKLIST.md`](./DEPLOYMENT-CHECKLIST.md)
3. Read: [`DEPLOYMENT-GUIDE.md`](./DEPLOYMENT-GUIDE.md)
4. Deploy with confidence!

---

## What Gets Deployed

| Component | Where | Time |
|-----------|-------|------|
| **Supabase** (Database) | Supabase.com | 5 min |
| **Backend API** | Railway or your choice | 5 min |
| **Discord Bot** | Railway or your choice | 5 min |
| **Web Dashboard** | Vercel or your choice | 5 min |
| **TOTAL TIME** | - | **~20 minutes** |

---

## Three Simple Steps

```
Step 1: Create Database
  └─→ Copy SQL to Supabase SQL Editor
      └─→ Click Run
          └─→ ✅ Table Created

Step 2: Deploy Backend + Bot
  └─→ Create Railway Project
      └─→ Connect GitHub
          └─→ Add Environment Variables
              └─→ ✅ Auto-Deploy

Step 3: Deploy Dashboard
  └─→ Create Vercel Project
      └─→ Connect GitHub
          └─→ Add Environment Variables
              └─→ ✅ Auto-Deploy
```

---

## The Documents You Need

| Document | Purpose | Time | When To Read |
|----------|---------|------|--------------|
| **DEPLOYMENT-CHECKLIST.md** | Step-by-step checklist | 10 min | **Use this while deploying** |
| **DEPLOYMENT-GUIDE.md** | Detailed instructions | 15 min | Before starting, or stuck on a step |
| **QUICK-START-TILT-PERSISTENCE.md** | Quick overview | 5 min | First time understanding the system |
| **docs/migrations/001-tilt-events.sql** | Database schema | - | Copy-paste to Supabase |

---

## Credentials You Need

Before you start, gather these:

```
Supabase:
  □ URL: https://xxxx.supabase.co
  □ Anon Key: eyJxx...

Discord:
  □ Bot Token: MT...
  □ Client ID: 123...

GitHub:
  □ Repository: tiltcheck-monorepo
  □ Branch: main
```

---

## The 5-Minute Path

**If you're experienced with deployments:**

1. Create Supabase table (SQL from `/docs/migrations/001-tilt-events.sql`)
2. Railway: New Project → GitHub → `tiltcheck-monorepo` → Add service for `backend`
3. Railway: Add service for `apps/discord-bot`
4. Vercel: New Project → GitHub → `tiltcheck-monorepo` → Root: `apps/dashboard`
5. Add environment variables to each service
6. ✅ Done!

**Detailed version:**
Open [`DEPLOYMENT-CHECKLIST.md`](./DEPLOYMENT-CHECKLIST.md) and follow step-by-step

---

## Services to Deploy

### 1️⃣ Backend (Node.js API)
- What: REST API endpoints
- Where: Railway (or Spaceship, Render, etc.)
- Build: `pnpm install && pnpm build`
- Start: `pnpm start`
- Key Env Var: `SUPABASE_URL`, `SUPABASE_ANON_KEY`

### 2️⃣ Discord Bot (Node.js)
- What: Discord bot + event handler
- Where: Railway (or same as backend)
- Build: `pnpm install && pnpm build`
- Start: `pnpm start`
- Key Env Var: `BACKEND_URL`, `DISCORD_TOKEN`

### 3️⃣ Dashboard (Next.js)
- What: Web UI
- Where: Vercel (recommended for Next.js)
- Build: `pnpm install && pnpm build`
- Start: `pnpm start`
- Key Env Var: `NEXT_PUBLIC_BACKEND_URL`

### 4️⃣ Database (Supabase)
- What: PostgreSQL + Auth
- Where: Supabase.com
- Setup: Run SQL migration
- No build/start needed

---

## Quick Verification

After deployment, verify everything works:

```bash
# 1. Test backend
curl https://your-backend-url/api/tilt/stats/test

# 2. Test discord
Type /dashboard in Discord

# 3. Test web
Visit https://your-dashboard-url/user?userId=123
```

All three should work without errors.

---

## Pre-Deployment Checklist

- [ ] Code is pushed to GitHub (`git push origin main`)
- [ ] You have Supabase credentials
- [ ] You have Discord bot token
- [ ] You have Railway/Vercel accounts
- [ ] You've read `DEPLOYMENT-CHECKLIST.md`

---

## Common Issues

| Problem | Solution |
|---------|----------|
| Build fails | Check logs in Railway/Vercel, ensure pnpm-lock.yaml is committed |
| Bot doesn't work | Check `BACKEND_URL` env var matches your deployed backend |
| Dashboard shows nothing | Check `NEXT_PUBLIC_BACKEND_URL` is correct |
| "Cannot reach database" | Check Supabase URL and key in backend env vars |

---

## After Deployment

1. Monitor first 24 hours (check logs)
2. Test `/dashboard` command daily
3. Test web dashboard loads correctly
4. Set up backups (Supabase → Settings → Backups)
5. Enable auto-deploy (push to main = auto update)

---

## Let's Go! 🚀

### First time? Start here:
1. Open: [`DEPLOYMENT-CHECKLIST.md`](./DEPLOYMENT-CHECKLIST.md)
2. Follow the 5 steps
3. Watch the green checkmarks appear
4. Done!

### Experienced? Jump to:
[`DEPLOYMENT-GUIDE.md`](./DEPLOYMENT-GUIDE.md) for detailed instructions

### Need quick refresh?
[`QUICK-START-TILT-PERSISTENCE.md`](./QUICK-START-TILT-PERSISTENCE.md)

---

**Ready?** Open [`DEPLOYMENT-CHECKLIST.md`](./DEPLOYMENT-CHECKLIST.md) now →

