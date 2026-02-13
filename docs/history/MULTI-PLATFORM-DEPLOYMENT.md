# Multi-Platform Deployment Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    TiltCheck Multi-Platform Deploy              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Frontend (Vercel)          API Backend (Railway)              │
│  ├─ Landing Page            ├─ Express Server                  │
│  ├─ Navigation              ├─ WebSocket (Game Server)         │
│  ├─ Sidebar Nav             ├─ REST API                        │
│  ├─ Supabase Auth           ├─ Event Router                    │
│  └─ Direct API Calls        └─ Modules (Poker, DA&D)          │
│      ↓                                                          │
│    https://api.tiltcheck.com                                   │
│                                                                 │
│  Discord Bots (Render)      Data Persistence (Supabase)       │
│  ├─ DA&D Bot                ├─ User Profiles                   │
│  ├─ Main Discord Bot        ├─ Trust Scores                    │
│  ├─ JustTheTip Bot          ├─ Casino Data                     │
│  └─ Calls Backend API       └─ Wallet Hashes                   │
│      (BACKEND_API_URL)                                          │
│                            Optional: Redis Cache (Upstash)    │
│                            ├─ Session Cache                    │
│                            └─ Rate Limiting                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Deployment Steps

### 1. Railway (Backend API)

**What's deployed:**
- `backend/` (Express server + WebSocket)
- `packages/*` (shared utilities)
- `services/event-router/` (event bus)
- `modules/poker/`, `modules/dad/` (game logic)

**Fix the build context issue:**
1. Go to Railway project → Backend service settings
2. Find "Root Directory" or "Service Root Path"
3. Change from `backend` to `.` (repo root)
4. Keep "Dockerfile Path" as `backend/Dockerfile`
5. Redeploy

**Expected outcome:**
- Docker can now see all workspace packages
- `backend/Dockerfile` will build successfully
- Sidebar nav will deploy when frontend is pushed

---

### 2. Vercel (Frontend)

**What's deployed:**
- `frontend/` (Express server serving HTML pages)
- Static assets (JS, CSS, images)
- Sidebar navigation (`frontend/public/js/navigation.js`, `frontend/public/styles/sidebar-nav.css`)

**Setup:**
1. Connect Vercel to your GitHub repo
2. Select project root: `.` (repo root)
3. Build command: `cd frontend && npm install && npm run build`
4. Output directory: `frontend/public`
5. Set environment variables:
   - `BACKEND_API_URL` → `https://api.tiltcheck.com` (your Railway backend URL)
   - `SUPABASE_URL` → (your Supabase URL)
   - `SUPABASE_ANON_KEY` → (your Supabase anon key)

**Expected outcome:**
- Landing page + all HTML pages live
- Sidebar navigation works on all pages
- API calls go to Railway backend

---

### 3. Render (Discord Bots)

**What's deployed:**
- `apps/dad-bot/` (DA&D game bot)
- `apps/discord-bot/` (main bot)
- `bot/` (JustTheTip tipping bot)
- All three run in **one container**

**Setup:**
1. Create new Render service → Web Service
2. Connect GitHub repo
3. Settings:
   - Repository: `jmenichole/tiltcheck-monorepo`
   - Branch: `main`
   - Root Directory: `.` (repo root)
   - Build command: (leave empty, uses Dockerfile.bots)
   - Start command: (leave empty, uses Dockerfile.bots)
   - Dockerfile: `Dockerfile.bots`
4. Environment variables:
   - `DISCORD_TOKEN` → (Discord bot token)
   - `DISCORD_CLIENT_ID` → (Discord client ID)
   - `DISCORD_GUILD_ID` → (your server ID)
   - `JUSTTHETIP_DISCORD_BOT_TOKEN` → (JustTheTip token)
   - `JUSTTHETIP_DISCORD_CLIENT_ID` → (JustTheTip client ID)
   - `JUSTTHETIP_FEE_WALLET` → (Solana wallet address)
   - `TRUST_ALERTS_CHANNEL_ID` → (Discord channel ID)
   - `SUPPORT_CHANNEL_ID` → (Discord channel ID)
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `BACKEND_API_URL` → `https://api.tiltcheck.com`
   - `SOLANA_RPC_URL` → `https://api.mainnet-beta.solana.com`
   - `SOLANA_NETWORK` → `mainnet-beta`

5. Deploy

**Expected outcome:**
- All three Discord bots connect to Discord
- Bots can communicate with Railway backend API
- Bots persist data to Supabase

---

## Data Persistence (Supabase)

**What's stored:**
- User profiles (Supabase Auth + custom user_profiles table)
- Trust scores (trust_scores table)
- Casino data (casino_data table)
- Tipping wallets & hashes (justthetip_wallets table)

**No additional setup needed** — already configured in `.env.local`

**Optional: Redis Cache (Upstash)**
Add for performance:
1. Sign up at upstash.com (free tier available)
2. Create Redis database
3. Add to Railway/Render env vars:
   - `REDIS_URL` → (Upstash connection string)
4. Used for: session cache, rate limiting, real-time data

---

## Deployment Checklist

- [ ] **Railway:** Fix build context to `.`, redeploy backend
- [ ] **Vercel:** Connect GitHub repo, set env vars, deploy frontend
- [ ] **Render:** Create web service with `Dockerfile.bots`, set all bot tokens & Supabase keys, deploy
- [ ] **DNS/URLs:** Ensure `https://api.tiltcheck.com` points to Railway backend
- [ ] **Hard refresh** in browser (Cmd+Shift+R) to see sidebar nav changes
- [ ] **Test** Discord bots connect and respond
- [ ] **Verify** API calls from frontend to backend work (check browser DevTools → Network)

---

## Environment Variables Summary

| Service | Variable | Source |
|---------|----------|--------|
| All | SUPABASE_URL | Supabase dashboard |
| All | SUPABASE_ANON_KEY | Supabase dashboard |
| All | SUPABASE_SERVICE_ROLE_KEY | Supabase dashboard |
| Railway | SOLANA_RPC_URL | https://api.mainnet-beta.solana.com |
| Railway | SOLANA_NETWORK | mainnet-beta |
| Render | DISCORD_TOKEN | Discord Developer Portal |
| Render | DISCORD_CLIENT_ID | Discord Developer Portal |
| Render | DISCORD_GUILD_ID | Your Discord server ID |
| Render | JUSTTHETIP_DISCORD_BOT_TOKEN | Discord Developer Portal |
| Render | JUSTTHETIP_DISCORD_CLIENT_ID | Discord Developer Portal |
| Render | JUSTTHETIP_FEE_WALLET | Solana wallet address |
| Render | TRUST_ALERTS_CHANNEL_ID | Discord channel ID |
| Render | SUPPORT_CHANNEL_ID | Discord channel ID |
| Vercel | BACKEND_API_URL | Your Railway backend URL |

---

## Troubleshooting

### Sidebar nav not showing on Vercel
- Check that `frontend/public/js/navigation.js` and `frontend/public/styles/sidebar-nav.css` exist
- Hard refresh browser (Cmd+Shift+R or Ctrl+Shift+R)
- Check Vercel logs for build errors

### Discord bots not connecting
- Verify bot tokens are correct in Render env vars
- Check Render logs: `docker logs <service-id>`
- Ensure Discord intents are enabled (server members, message content)

### API calls from Vercel to Railway fail (CORS)
- Add CORS headers to Railway backend (already in `backend/Dockerfile`)
- Verify `BACKEND_API_URL` in Vercel matches your Railway URL
- Check browser DevTools → Network → see actual error

### Build fails on Railway
- Verify root directory is set to `.` (not `backend`)
- Check `railway.json` has correct Dockerfile path
- Verify `pnpm-lock.yaml` is up to date: run `pnpm install` locally and commit

---

## Cost Optimization

| Service | Cost | Notes |
|---------|------|-------|
| Vercel | $0–$20/mo | Free tier has 100 GB/month bandwidth |
| Railway | $5–$50/mo | Free tier has 5GB storage + $5 credit/month |
| Render | $0–$12/mo | Free tier has shared CPU; bots fit in free tier |
| Supabase | $0–$25/mo | Free tier has 500MB storage; scales as needed |
| Upstash Redis | $0–$10/mo | Free tier has 10K commands/day; optional |

**Estimated monthly cost: $5–$75** (mostly Railway for backend stability)

---

## Next: Deployment Order

1. **Fix Railway build context** (prerequisite for all subsequent deploys)
2. **Deploy Railway backend** (ensures API is live)
3. **Deploy Vercel frontend** (links to Railway API)
4. **Deploy Render bots** (connects to Railway + Supabase)
5. **Test end-to-end**: Frontend → API → Bots → Supabase

---

## Questions?

- Railway build context stuck? See Railway docs: https://docs.railway.app/
- Vercel env vars not working? Check Vercel dashboard → Project settings → Environment Variables
- Render bots not starting? SSH into container and check logs
