# Deployment Recommendation: What You Actually Need

## Current Situation

You have a **monorepo** with:
- **Backend services** (Node.js/Express APIs) - Need a server to run
- **Frontend PWAs** (HTML/CSS/JS) - Static files that can be served anywhere
- **Discord bots** - Need to run 24/7

**Currently using**: Railway for deployment (as seen in `railway.json`)

## The Question

Do you need GitHub Pages for PWAs, or should you keep everything on Railway?

## My Recommendation: **Keep It Simple - Use Railway for Everything**

### Why Railway (Current Approach) is Better

**✅ PROS:**
1. **Everything in one place**
   - Backend API + Frontend PWA served together
   - No CORS configuration needed
   - Simpler deployment (one push = everything deploys)
   - Single domain with paths (e.g., `tiltcheck.me/dashboard`, `tiltcheck.me/api/`)

2. **The dashboard is ALREADY working**
   - You just fixed it - it serves at `localhost:5055/dashboard/`
   - Deploy to Railway = works immediately at `tiltcheck.me/dashboard/`
   - No additional configuration needed

3. **Less complexity**
   - One deployment to manage
   - No DNS splitting between GitHub Pages and Railway
   - No separate CI/CD workflows
   - Easier to debug (everything in one place)

4. **Better for APIs**
   - Backend and frontend on same origin = no CORS issues
   - Easier authentication (cookies work seamlessly)
   - API calls are `/api/...` instead of `https://api.tiltcheck.me/...`

**❌ CONS:**
- Not free (GitHub Pages is free, Railway has costs)
- But Railway free tier is generous for starting out

### Why GitHub Pages Would Be More Complex

**❌ CONS:**
1. **Split architecture**
   - Frontend on GitHub Pages (tiltcheck.me)
   - Backend on Railway (api.tiltcheck.me)
   - Need to configure DNS for both
   - Need to handle CORS between them

2. **More configuration**
   - Separate CI/CD for frontend vs backend
   - Need to update all API calls in frontend to point to `api.tiltcheck.me`
   - More moving parts = more things to break

3. **Not necessary yet**
   - Your PWAs are small HTML/JS files
   - Railway can serve them just fine
   - Only need GitHub Pages if you have millions of visitors (you don't yet)

**✅ PROS:**
- Free hosting for frontend
- GitHub's global CDN is fast
- But these benefits don't outweigh the complexity for your use case

## What I Suggest You Do

### Option 1: Simple Unified Deployment (RECOMMENDED)

Keep your current architecture - everything on Railway:

```
tiltcheck.me (Railway)
├── /                      → Landing page
├── /dashboard/            → Dashboard PWA  
├── /control-room/         → Control Room PWA
├── /tracker/              → Tracker PWA (when built)
├── /surveys/              → Surveys PWA (when built)
└── /api/
    ├── /dashboard/        → Dashboard API
    ├── /tracker/          → Tracker API
    └── /surveys/          → Surveys API
```

**How it works:**
- One Railway deployment
- One domain (tiltcheck.me)
- Backend serves both APIs AND static PWA files
- Simple, clean, works perfectly

**Deployment:**
```bash
# Just push to Railway
railway up

# Everything deploys together
# ✅ Backend APIs running
# ✅ Frontend PWAs served as static files
# ✅ All accessible at tiltcheck.me
```

### Option 2: Split Deployment (More Complex, Not Recommended Yet)

Frontend on GitHub Pages, backend on Railway:

```
Frontend (GitHub Pages):
- dashboard.tiltcheck.me
- tracker.tiltcheck.me  
- surveys.tiltcheck.me

Backend (Railway):
- api.tiltcheck.me
```

**Only use this if:**
- You have millions of visitors and need GitHub's CDN
- You want free frontend hosting (but Railway free tier exists)
- You have complex frontend builds (React/Vue that need npm build)

**You DON'T need this because:**
- Your PWAs are simple HTML/JS (no build step)
- Railway can serve them fine
- Adds unnecessary complexity

## Step-by-Step: Deploy to Railway (What You Should Do)

### 1. Configure Railway Deployment

Update your backend server to serve static files:

**File: `services/dashboard/src/server.ts`** (already correct!)
```typescript
// Static dashboard front-end
const DASHBOARD_PUBLIC_DIR = possiblePaths.find(p => fs.existsSync(p));

if (DASHBOARD_PUBLIC_DIR) {
  app.use('/dashboard', express.static(DASHBOARD_PUBLIC_DIR, {}));
  app.get('/dashboard', (_req, res) => {
    res.sendFile(path.join(DASHBOARD_PUBLIC_DIR, 'index.html'));
  });
}
```

✅ **This is already done!** Your dashboard serves static files correctly.

### 2. Set Up Custom Domain on Railway

```bash
# In Railway dashboard:
# 1. Go to your project
# 2. Click "Settings" → "Domains"
# 3. Add custom domain: tiltcheck.me
# 4. Railway gives you DNS records to add
```

### 3. Configure DNS

Point your domain to Railway:

```
# In your domain registrar (GoDaddy, Namecheap, etc.):
A     @             76.76.21.21  (Railway's IP)
CNAME www           your-project.railway.app
```

### 4. Deploy

```bash
# Commit your fix (you already did this!)
git push origin main

# Deploy to Railway
railway up

# Or link Railway to GitHub for auto-deploy on push
```

### 5. Access Your PWAs

```
https://tiltcheck.me/dashboard/       → Dashboard PWA
https://tiltcheck.me/api/health       → API health check  
https://tiltcheck.me/control-room/    → Control Room (when added)
```

## When to Consider GitHub Pages

Consider GitHub Pages + Railway split ONLY if:

1. **Traffic is very high** (millions of requests/month)
   - GitHub's CDN is faster globally
   - Offload static file serving from Railway
   
2. **Frontend is complex** (React/Next.js with build steps)
   - Need CI/CD just for frontend
   - Frequent frontend-only deployments
   
3. **You want free hosting**
   - Railway costs money after free tier
   - GitHub Pages is always free
   - But Railway free tier is 500 hours/month (plenty for starting)

**Currently, NONE of these apply to you.**

## Summary: My Recommendation

### ✅ DO THIS (Simple, Works Now):
1. **Keep Railway deployment** - Backend + Frontend together
2. **Configure tiltcheck.me domain** - Point to Railway
3. **Deploy the fixed dashboard** - `railway up` or push to main
4. **Access at** `tiltcheck.me/dashboard/`
5. **Done!** Everything works, no complexity

### ❌ DON'T DO THIS (Yet):
1. ~~Split to GitHub Pages + Railway~~
2. ~~Configure multiple subdomains~~
3. ~~Set up CORS between services~~
4. ~~Manage two separate deployments~~

**You can always switch to GitHub Pages later if needed. Start simple!**

## What You Should Do Right Now

1. **Test the dashboard locally** (you already did this! ✅)
   ```bash
   pnpm --filter @tiltcheck/dashboard dev
   open http://localhost:5055/dashboard/
   ```

2. **Deploy to Railway**
   ```bash
   railway up
   ```

3. **Configure your domain**
   - Add `tiltcheck.me` in Railway dashboard
   - Update DNS records

4. **Verify it works**
   - Visit `https://tiltcheck.me/dashboard/`
   - See your dashboard live!

## Questions?

**Q: Will this work for other PWAs (tracker, surveys)?**  
A: Yes! Same pattern:
```typescript
app.use('/tracker', express.static('path/to/tracker/public'));
app.use('/surveys', express.static('path/to/surveys/public'));
```

**Q: What about performance?**  
A: Railway is fast enough for thousands of users. Optimize later if needed.

**Q: Can I switch to GitHub Pages later?**  
A: Yes! You can always split later. Start simple now.

**Q: What about the PWA Strategy document?**  
A: That's for BUILDING the PWAs (React/Vue frontends). Deployment is separate. Build them first, then deploy to Railway.

---

**TL;DR: Keep it simple. Deploy everything to Railway. GitHub Pages adds complexity you don't need yet. Focus on building the PWAs first, not splitting infrastructure. 🚀**
