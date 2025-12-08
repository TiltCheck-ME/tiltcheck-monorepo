# 🚀 Quick Start - Tilt Persistence System

**TL;DR**: Tilt events persistence is fully implemented. Here's what to do:

## 1️⃣ Create the Database Table (2 minutes)

1. Go to https://supabase.com and log in
2. Open your TiltCheck project
3. Click **SQL Editor** → **New Query**
4. Copy-paste entire SQL from: `/docs/migrations/001-tilt-events.sql`
5. Click **Run** button
6. ✅ Done! Table created

## 2️⃣ Set Environment Variables

**Backend** (`.env` in `/backend`):
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

**Bot** (`.env` in `/apps/discord-bot`):
```
BACKEND_URL=http://localhost:3000
```

**Dashboard** (`.env.local` in `/apps/dashboard`):
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
```

## 3️⃣ Test Locally (5 minutes)

Open 3 terminals:

**Terminal 1:**
```bash
cd backend && pnpm dev
```

**Terminal 2:**
```bash
cd apps/discord-bot && pnpm dev
```

**Terminal 3:**
```bash
cd apps/dashboard && pnpm dev
```

## 4️⃣ Verify It Works

### Discord Test
Type `/dashboard` in your Discord server → Should see tilt stats embed

### Web Test
Visit: `http://localhost:3000/user?userId=123456`
→ Should see full dashboard

### API Test
```bash
curl http://localhost:3000/api/tilt/stats/123456
# Should return stats JSON
```

## 5️⃣ Deploy to Production

1. Push code to GitHub
2. Deploy backend (Railway/Spaceship/etc.)
3. Deploy bot with production `BACKEND_URL`
4. Deploy dashboard with production `BACKEND_URL`
5. Done! System is live

---

## 📁 What Got Built

| What | Where | What It Does |
|------|-------|-------------|
| **Backend API** | `/backend/src/routes/tilt.ts` | Stores/retrieves tilt events |
| **Bot Handler** | `/apps/discord-bot/src/handlers/tilt-events-handler.ts` | Listens for tilt events, sends to API |
| **Discord Command** | `/apps/discord-bot/src/commands/dashboard.ts` | `/dashboard` slash command |
| **Web Dashboard** | `/apps/dashboard/src/app/user/page.tsx` | Full tilt stats page |
| **Database Schema** | `/docs/migrations/001-tilt-events.sql` | Supabase table + indexes |

---

## 🎯 How It Works (User Perspective)

```
User types: /dashboard
    ↓
Bot shows embed with:
  - Tilt score (0-10)
  - Stats grid
  - Recent events
  - "Full Dashboard" button
    ↓
User clicks button
    ↓
Opens web page with full history & stats
```

---

## ❓ Troubleshooting

| Problem | Fix |
|---------|-----|
| "Database not connected" | Check Supabase URL & key in `.env` |
| `/dashboard` doesn't work | Check `BACKEND_URL` in bot `.env` |
| Dashboard shows no data | Run migration SQL first |
| Build fails | Run `pnpm install` then `pnpm build` |

---

## 📚 Full Docs

- **Setup Guide** (detailed steps): `/docs/TILT-PERSISTENCE-SETUP.md`
- **API Reference** (endpoints): `/docs/TILT-EVENTS-API.md`
- **Features** (capabilities): `/docs/USER-DASHBOARD.md`
- **Summary** (what was built): `/docs/TILT-PERSISTENCE-COMPLETE.md`

---

## ✅ Status

| Component | Status |
|-----------|--------|
| Backend API | ✅ Built & tested |
| Bot Handler | ✅ Built & tested |
| Discord Command | ✅ Built & tested |
| Web Dashboard | ✅ Built & tested |
| Database Schema | ✅ Ready to deploy |
| Documentation | ✅ Complete |
| TypeScript Compilation | ✅ All passing |

**Everything is ready to go!** 🎉

