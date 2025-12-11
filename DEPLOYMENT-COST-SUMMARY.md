# Deployment Cost Summary

## Quick Answer

**Q: How much to deploy everything to Railway?**  
**A: $20/month for production (Railway Pro tier)**

## Two Deployment Options

### Option 1: Everything on Railway
```
Railway (Backend + All PWAs)
├── api.tiltcheck.me/api/          → APIs
├── tiltcheck.me/dashboard/        → Dashboard PWA
├── tiltcheck.me/tracker/          → Tracker PWA
└── tiltcheck.me/surveys/          → Surveys PWA
```

**Cost:** $20/month (Pro tier required for 24/7)

### Option 2: GitHub Pages + Railway (RECOMMENDED)
```
GitHub Pages (Free):
├── dashboard.tiltcheck.me         → Dashboard PWA
├── tracker.tiltcheck.me           → Tracker PWA
└── surveys.tiltcheck.me           → Surveys PWA

Railway (Paid):
└── api.tiltcheck.me               → Backend APIs only
```

**Cost:** $20/month (same cost, better architecture)

## Why Option 2 is Better (Same Price!)

Both cost $20/month, but Option 2 gives you:

✅ **Free PWA hosting forever** (GitHub Pages)  
✅ **Less Railway usage** (only APIs, not static files)  
✅ **Better separation** (frontend/backend independent)  
✅ **Faster PWA delivery** (GitHub's global CDN)  
✅ **Independent deployments** (update PWA without touching backend)

## Railway Pricing Breakdown

### Free Tier
- **$0/month**
- **500 hours** execution time
- **~21 days** of 24/7 uptime
- ❌ **Not suitable for production**

### Pro Tier (Production)
- **$20/month base** subscription
- **Includes $20 usage credits**
- Your estimated usage: **~$10/month**
- **Leftover credits: $10**

### What Costs Money?
- vCPU time: ~$0.000231/vCPU-minute
- Memory: ~$0.000231/GB-minute
- Network: Free under 100GB/month

### Your Estimated Usage
```
Backend API (Node.js/Express):
- vCPU: 0.5 vCPU × 730 hours = $5/month
- Memory: 512 MB × 730 hours = $5/month
- Total: ~$10/month
```

## Cost Comparison Over Time

| Month | Free Tier | Pro Tier |
|-------|-----------|----------|
| 1 | $0* | $20 |
| 2 | $0* | $20 |
| 3 | $0* | $20 |
| 6 | $0* | $120 |
| 12 | $0* | $240 |

*Free tier shuts down after 500 hours (~21 days) each month

## My Final Recommendation

### Phase 1: Start with Free Tier (Testing)
- Deploy everything to Railway free tier
- Test with real users
- **Cost: $0/month**
- **Duration: 1-2 months** (testing phase)

### Phase 2: Move to Production Setup
- PWAs → GitHub Pages (free)
- Backend API → Railway Pro ($20/month)
- **Cost: $20/month**
- **Duration: Ongoing**

### Why This is Best
1. **Start free** (validate the project works)
2. **Scale smartly** (GitHub Pages free forever)
3. **Pay only for backend** (where the real work happens)
4. **Professional setup** (production-ready)

## Alternative: If You Want Even Cheaper

### Use Free Tier + Auto-Stop
Railway free tier with automatic stop/start:
- Run only when needed
- Stop at night (if your users are in one timezone)
- **~300-400 hours/month** (13-16 days)
- **Cost: $0/month**

⚠️ **Downside:** Not 24/7, users may see downtime

### Use Vercel/Netlify Instead
- **Vercel Hobby**: Free for frontends + $20/mo for backend
- **Netlify**: Similar pricing
- **DigitalOcean Droplet**: $4-6/mo (but you manage server yourself)

## Bottom Line

**For reliable 24/7 production hosting:**
- **Minimum: $20/month** (Railway Pro)
- **Recommended: $20/month** (GitHub Pages free + Railway Pro)
- **Free tier: Not suitable** for production (500 hour limit)

**You can't avoid paying ~$20/month for backend APIs** if you want:
- 24/7 uptime
- Reliable service
- No manual restarts
- Production-grade hosting

**But you CAN avoid paying for frontend hosting** by using GitHub Pages!

---

**Start on free tier to test, plan to pay $20/month for production. 💰**
