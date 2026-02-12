# UPDATED Deployment Recommendation: You Already Have Separate Repos!

## NEW Understanding

You mentioned: **"each one of these already has its own github repo"**

This changes everything! If each PWA already has its own GitHub repo, then **YES - GitHub Pages is the perfect solution!**

## Current Architecture (As I Now Understand It)

```
GitHub Repos (Separate):
├── tiltcheck-monorepo         → This repo (backend + core)
├── tiltcheck-dashboard        → Dashboard PWA repo (?)
├── tiltcheck-tracker          → Tracker PWA repo (?)
├── tiltcheck-surveys          → Surveys PWA repo (?)
└── tiltcheck-landing          → Landing page repo (?)
```

## My NEW Recommendation: ✅ Use GitHub Pages for Each PWA

Since each PWA already has its own repo, GitHub Pages is **PERFECT** and **SIMPLE**:

### Architecture

```
GitHub Pages (Static PWAs):
├── dashboard.tiltcheck.me     → Deployed from tiltcheck-dashboard repo
├── tracker.tiltcheck.me       → Deployed from tiltcheck-tracker repo
├── surveys.tiltcheck.me       → Deployed from tiltcheck-surveys repo
└── tiltcheck.me               → Deployed from tiltcheck-landing repo

Railway/Backend (APIs):
└── api.tiltcheck.me           → Deployed from tiltcheck-monorepo
```

### Why This is IDEAL

**✅ Perfect separation:**
- Each PWA has its own repo = its own GitHub Pages site
- Independent deployments (update dashboard without touching surveys)
- Clear ownership per PWA

**✅ Free hosting:**
- All PWAs hosted free on GitHub Pages
- Only pay for backend API server (Railway/Vercel)

**✅ Simple CI/CD:**
- Push to PWA repo = auto-deploy to GitHub Pages
- No manual builds needed

**✅ Fast delivery:**
- GitHub's global CDN
- PWAs load instantly worldwide

## Step-by-Step Setup

### For Each PWA Repo (dashboard, tracker, surveys, etc.)

#### 1. Enable GitHub Pages

In each PWA repo:
```
GitHub Repo → Settings → Pages
├── Source: Deploy from branch
├── Branch: main (or gh-pages)
└── Folder: / (root) or /docs
```

#### 2. Add GitHub Actions Workflow

Create `.github/workflows/deploy.yml` in each PWA repo:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./public  # Or wherever your HTML files are
```

#### 3. Add CNAME File

In each PWA repo, create `public/CNAME` (or wherever your files are):

**tiltcheck-dashboard repo:**
```
dashboard.tiltcheck.me
```

**tiltcheck-tracker repo:**
```
tracker.tiltcheck.me
```

**tiltcheck-surveys repo:**
```
surveys.tiltcheck.me
```

**tiltcheck-landing repo:**
```
tiltcheck.me
```

#### 4. Configure API Endpoint

In each PWA's JavaScript, use environment detection:

**Example for dashboard:**
```javascript
// In your index.html or main.js
const API_BASE = (() => {
  const hostname = window.location.hostname;
  
  // Local development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:5055';  // Local API
  }
  
  // Production - unified API endpoint
  return 'https://api.tiltcheck.me';
})();

// Use in all API calls
fetch(`${API_BASE}/api/dashboard/rollups/latest`)
fetch(`${API_BASE}/api/dashboard/domains`)
```

### For Backend API (tiltcheck-monorepo)

#### 1. Deploy to Railway (or Vercel)

```bash
# In tiltcheck-monorepo
railway up

# Configure custom domain in Railway dashboard
# Set domain to: api.tiltcheck.me
```

#### 2. Update CORS to Allow PWA Domains

In your backend server (e.g., `services/dashboard/src/server.ts`):

```typescript
import cors from 'cors';

const allowedOrigins = [
  'https://tiltcheck.me',
  'https://dashboard.tiltcheck.me',
  'https://tracker.tiltcheck.me',
  'https://surveys.tiltcheck.me',
  'https://control-room.tiltcheck.me',
  'http://localhost:5055',  // Local dev
  'http://localhost:3000',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
```

#### 3. Update API Routes

Make sure API is organized by service:

```typescript
// services/dashboard/src/server.ts
app.use('/api/dashboard', dashboardRoutes);

// Future: services/tracker/src/server.ts
app.use('/api/tracker', trackerRoutes);

// Future: services/surveys/src/server.ts
app.use('/api/surveys', surveysRoutes);
```

### DNS Configuration

Configure your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.):

```dns
# GitHub Pages (A records for apex domain)
@             A     185.199.108.153
@             A     185.199.109.153
@             A     185.199.110.153
@             A     185.199.111.153

# PWA Subdomains (CNAME to GitHub Pages)
dashboard     CNAME jmenichole.github.io.
tracker       CNAME jmenichole.github.io.
surveys       CNAME jmenichole.github.io.
control-room  CNAME jmenichole.github.io.
www           CNAME jmenichole.github.io.

# Backend API (CNAME to Railway)
api           CNAME your-project.railway.app.
```

**Note:** Each PWA repo must have the CNAME file matching its subdomain.

## Example: Dashboard PWA Setup

Since the dashboard PWA might already be in the monorepo at `services/dashboard/public/`, you have two options:

### Option A: Keep in Monorepo, Deploy via GitHub Pages Workflow

Update `.github/workflows/pages.yml` in tiltcheck-monorepo:

```yaml
name: Deploy Dashboard to GitHub Pages

on:
  push:
    branches: [ main ]
    paths:
      - 'services/dashboard/public/**'
  workflow_dispatch:

jobs:
  deploy-dashboard:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        
      - name: Deploy Dashboard
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./services/dashboard/public
          cname: dashboard.tiltcheck.me
```

### Option B: Extract to Separate Repo

If you truly have separate repos, the dashboard files would be in their own repo:

```
tiltcheck-dashboard/
├── index.html
├── experimental.html
├── components/
├── config/
├── CNAME (contains: dashboard.tiltcheck.me)
└── .github/
    └── workflows/
        └── deploy.yml
```

## Workflow Summary

### Deploying a PWA Update

```bash
# In PWA repo (e.g., tiltcheck-dashboard)
cd tiltcheck-dashboard

# Make changes to HTML/CSS/JS
vim index.html

# Commit and push
git add .
git commit -m "Update dashboard UI"
git push origin main

# GitHub Actions automatically deploys to dashboard.tiltcheck.me
# ✅ Live in ~30 seconds!
```

### Deploying a Backend API Update

```bash
# In monorepo
cd tiltcheck-monorepo

# Make changes to backend
vim services/dashboard/src/server.ts

# Test locally
pnpm --filter @tiltcheck/dashboard dev

# Deploy to Railway
railway up

# ✅ API live at api.tiltcheck.me
```

## What About the Monorepo?

The monorepo (`tiltcheck-monorepo`) should contain:

**✅ Keep in monorepo:**
- Backend API services (`services/dashboard/src/server.ts`)
- Shared packages (`packages/types`, `packages/event-router`)
- Discord bots (`apps/discord-bot`)
- Core business logic
- Tests, CI/CD for backend

**❌ Extract to separate repos (if not already done):**
- PWA frontend files (HTML/CSS/JS)
- Each PWA gets its own repo for GitHub Pages deployment

## Migration Path (If PWAs are Currently in Monorepo)

If the PWAs are currently in `services/*/public/` in the monorepo:

### Step 1: Create Separate Repos

```bash
# Create new repo for dashboard PWA
gh repo create tiltcheck-dashboard --public

# Extract dashboard public files
cd /tmp
mkdir tiltcheck-dashboard
cd tiltcheck-dashboard
git init

# Copy files from monorepo
cp -r /path/to/monorepo/services/dashboard/public/* .

# Add CNAME
echo "dashboard.tiltcheck.me" > CNAME

# Push to new repo
git add .
git commit -m "Initial dashboard PWA"
git remote add origin https://github.com/jmenichole/tiltcheck-dashboard
git push -u origin main
```

### Step 2: Enable GitHub Pages

In the new repo, enable GitHub Pages from Settings.

### Step 3: Keep Backend in Monorepo

The backend (`services/dashboard/src/server.ts`) stays in the monorepo. Only the frontend (public files) move out.

## Benefits of This Approach

**✅ Separation of concerns:**
- Frontend (PWAs) = Static files on GitHub Pages (free)
- Backend (APIs) = Node.js servers on Railway (paid)

**✅ Independent deployments:**
- Update dashboard UI without redeploying backend
- Update backend API without redeploying frontends

**✅ Cost effective:**
- All PWAs hosted free on GitHub Pages
- Only pay for API server

**✅ Simple CI/CD:**
- Push to PWA repo = auto-deploy via GitHub Actions
- Push to monorepo = backend redeploys on Railway

**✅ Scalable:**
- GitHub's CDN handles millions of requests
- Backend can scale independently

## Next Steps

1. **Confirm your repo structure** - Do you actually have separate repos for each PWA, or are they all in the monorepo?

2. **If separate repos exist:**
   - Enable GitHub Pages for each
   - Add deploy workflow
   - Configure DNS

3. **If all in monorepo:**
   - Extract PWA frontend files to separate repos
   - Keep backend in monorepo
   - Set up GitHub Pages

4. **Configure API backend:**
   - Deploy to Railway with domain `api.tiltcheck.me`
   - Update CORS settings
   - Test API endpoints

5. **Update PWA frontends:**
   - Change all API calls to use `api.tiltcheck.me`
   - Test locally with local backend
   - Deploy to GitHub Pages

## Questions to Clarify

**Q1:** Do you already have separate GitHub repos for dashboard, tracker, surveys, etc.?  
**A:** If YES → Use GitHub Pages (this document applies)  
**A:** If NO → Consider keeping in monorepo, deploy to Railway (previous recommendation applies)

**Q2:** Where are the PWA files currently located?  
**A:** In monorepo at `services/*/public/`? → Need to extract to separate repos  
**A:** Already in separate repos? → Perfect, just enable GitHub Pages

**Q3:** What's your current deployment setup?  
**A:** Everything on Railway? → Consider migrating frontends to GitHub Pages  
**A:** Nothing deployed yet? → GitHub Pages + Railway is ideal

---

**TL;DR: If you have separate repos for each PWA → GitHub Pages is PERFECT. Enable it, configure DNS, deploy. Backend API stays on Railway at api.tiltcheck.me. Simple, free, fast. 🚀**

Let me know which scenario matches your setup, and I'll give you exact commands to execute!
