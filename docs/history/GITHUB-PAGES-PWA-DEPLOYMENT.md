<!-- Historical doc: 'self-exclusion' references below describe third-party casino/government systems or pre-policy terminology. They are intentionally preserved for historical accuracy. -->

# GitHub Pages PWA Deployment Strategy

## Overview

Deploy each TiltCheck PWA to GitHub Pages with custom subdomains under `tiltcheck.me`, using the domain for backend API calls and simplified access.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    GitHub Pages                          │
│                 (Static Frontend PWAs)                   │
└─────────────────────────────────────────────────────────┘
           │                │                │
           ▼                ▼                ▼
   dashboard.tiltcheck.me  tracker.tiltcheck.me  surveys.tiltcheck.me
           │                │                │
           └────────────────┴────────────────┘
                          │
                          ▼
            ┌─────────────────────────┐
            │   Backend API Server    │
            │   api.tiltcheck.me      │
            │   (Railway/Hosted)      │
            └─────────────────────────┘
```

## PWA Services to Deploy

### 1. Trust Dashboard (`dashboard.tiltcheck.me`)
- **Source**: `services/dashboard/public/`
- **Purpose**: Real-time trust scores, casino ratings, domain safety
- **Status**: ✅ Already has HTML/JS frontend
- **Features**: 
  - Trust gauges
  - Domain/casino movers
  - Severity distribution
  - Risk alerts
  - Live events stream

### 2. Control Room (`control-room.tiltcheck.me`)
- **Source**: `services/control-room/public/`
- **Purpose**: Admin panel for system monitoring
- **Status**: ✅ Has frontend
- **Features**:
  - System analytics
  - Service health monitoring
  - Configuration management

### 3. Landing Page (`www.tiltcheck.me` or `tiltcheck.me`)
- **Source**: `services/landing/public/`
- **Purpose**: Marketing site and ecosystem overview
- **Status**: ✅ Already deployed
- **Features**:
  - Product information
  - Documentation
  - Getting started guides

### 4. TiltCheck Tracker (`tracker.tiltcheck.me`) - Future
- **Source**: To be created
- **Purpose**: Personal gambling tracker PWA
- **Status**: ❌ Needs to be built (see TILTCHECK-PWA-MIGRATION.md)
- **Features**:
  - Session logging
  - Spending analytics
  - Self-exclusion tools
  - AI coaching chatbot

### 5. QualifyFirst (`surveys.tiltcheck.me`) - Future
- **Source**: To be created
- **Purpose**: Survey matching and completion platform
- **Status**: ❌ Backend exists, frontend needed
- **Features**:
  - Survey browsing
  - Match confidence display
  - Earnings tracker
  - Profile management

### 6. User Dashboard (`app.tiltcheck.me` or `my.tiltcheck.me`) - Future
- **Source**: `services/user-dashboard/` (to be built)
- **Purpose**: Unified user dashboard for all TiltCheck services
- **Status**: ❌ Needs to be built
- **Features**:
  - Profile management
  - Wallet overview (JustTheTip)
  - Trust score display
  - Service access hub

## GitHub Pages Deployment Strategy

### Option 1: Multiple GitHub Repos (Recommended)
Each PWA gets its own repo with GitHub Pages enabled:

```
tiltcheck/dashboard      → dashboard.tiltcheck.me
tiltcheck/tracker        → tracker.tiltcheck.me
tiltcheck/surveys        → surveys.tiltcheck.me
tiltcheck/control-room   → control-room.tiltcheck.me
tiltcheck/landing        → www.tiltcheck.me
```

**Pros**:
- Independent deployments
- Separate CI/CD per service
- Easier to manage permissions
- Faster builds (only changed PWA rebuilds)

**Cons**:
- More repos to manage
- Need to sync code from monorepo

### Option 2: Single Repo with Subdirectories (Current Approach)
Use the monorepo's `gh-pages` branch with subdirectories:

```
gh-pages/
├── index.html                  → tiltcheck.me (landing)
├── dashboard/                  → dashboard.tiltcheck.me
│   └── index.html
├── tracker/                    → tracker.tiltcheck.me
│   └── index.html
├── surveys/                    → surveys.tiltcheck.me
│   └── index.html
└── control-room/               → control-room.tiltcheck.me
    └── index.html
```

**Pros**:
- Single repo (monorepo stays intact)
- Easier code sharing
- Single deployment workflow

**Cons**:
- All PWAs deploy together
- Larger gh-pages branch
- Subdomain routing requires additional setup

**Recommended**: **Option 2** (monorepo approach) for simplicity

## Implementation Plan

### Phase 1: Update GitHub Pages Workflow

Modify `.github/workflows/pages.yml` to deploy all PWA services:

```yaml
name: Deploy GitHub Pages PWAs

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install pnpm
        run: npm install -g pnpm

      - name: Install dependencies
        run: pnpm install --no-frozen-lockfile

      - name: Build PWAs
        run: |
          # Build any PWAs that need compilation
          # (Most are static HTML, but future React/Vue PWAs will need building)
          echo "Building PWAs..."
          
      - name: Prepare deployment directory
        run: |
          mkdir -p out
          
          # Landing page (root)
          rsync -av --delete services/landing/public/ out/
          
          # Dashboard PWA
          mkdir -p out/dashboard
          rsync -av --delete services/dashboard/public/ out/dashboard/
          
          # Control Room PWA
          mkdir -p out/control-room
          rsync -av --delete services/control-room/public/ out/control-room/
          
          # Future: Tracker PWA
          # mkdir -p out/tracker
          # rsync -av --delete services/user-dashboard/public/ out/tracker/
          
          # Future: Surveys PWA
          # mkdir -p out/surveys
          # rsync -av --delete services/qualifyfirst/public/ out/surveys/
          
          # Documentation
          mkdir -p out/docs-md
          rsync -av docs/tiltcheck/ out/docs-md/
          
          # CNAME for custom domain
          echo "tiltcheck.me" > out/CNAME
          
          echo "Deployment artifacts prepared"

      - name: Publish to gh-pages
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: out
          force_orphan: false
```

### Phase 2: DNS Configuration

Configure DNS records for `tiltcheck.me`:

```
# A Records (point to GitHub Pages)
@             A     185.199.108.153
@             A     185.199.109.153
@             A     185.199.110.153
@             A     185.199.111.153

# CNAME Records (subdomains)
www           CNAME jmenichole.github.io.
dashboard     CNAME jmenichole.github.io.
tracker       CNAME jmenichole.github.io.
surveys       CNAME jmenichole.github.io.
control-room  CNAME jmenichole.github.io.
app           CNAME jmenichole.github.io.
my            CNAME jmenichole.github.io.
api           CNAME <your-backend-server-host>
```

**Note**: Replace `jmenichole.github.io` with the actual GitHub Pages URL for the repo.

### Phase 3: Backend API Configuration

#### Current State
Backend APIs are mixed across multiple ports:
- Dashboard: `localhost:5055`
- QualifyFirst: TBD
- Event Router: Internal only
- Trust Engines: Internal only

#### Proposed: Unified API Gateway
Create a single API server at `api.tiltcheck.me`:

```
api.tiltcheck.me/
├── dashboard/          → Dashboard API endpoints
│   ├── rollups/latest
│   ├── domains
│   ├── degens
│   └── ...
├── tracker/            → TiltCheck Tracker API
│   ├── sessions
│   ├── analytics
│   └── ...
├── surveys/            → QualifyFirst API
│   ├── profile
│   ├── matches
│   └── ...
├── trust/              → Trust Engines API
│   ├── domain
│   ├── casino
│   └── ...
└── wallet/             → JustTheTip API
    ├── balance
    ├── transactions
    └── ...
```

**Implementation Options**:

1. **Reverse Proxy** (Nginx/Caddy)
   - Single entry point
   - Route to individual services by path
   - Example: `/dashboard/*` → Dashboard service

2. **API Gateway Service**
   - Build custom gateway (Express/Fastify)
   - Centralized auth, rate limiting, logging
   - Smart routing to backend services

3. **Railway/Vercel**
   - Deploy API as monolithic service
   - Or use serverless functions per route

**Recommended**: Use Railway with reverse proxy (Nginx) for `api.tiltcheck.me`

### Phase 4: Update PWA Configuration

Each PWA needs to be configured to use the correct API endpoints:

#### Dashboard PWA
**File**: `services/dashboard/public/index.html`

Update API calls to use `api.tiltcheck.me`:

```javascript
// OLD (development)
const API_BASE = 'http://localhost:5055';

// NEW (production with fallback)
const API_BASE = window.location.hostname === 'localhost' 
  ? 'http://localhost:5055' 
  : 'https://api.tiltcheck.me/dashboard';

// API calls
fetch(`${API_BASE}/api/rollups/latest`)
fetch(`${API_BASE}/api/domains`)
```

Or use environment detection:

```javascript
const API_BASE = (() => {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:5055';
  }
  return 'https://api.tiltcheck.me/dashboard';
})();
```

#### Future Tracker PWA
```javascript
const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:3004'
  : 'https://api.tiltcheck.me/tracker';
```

#### Future Surveys PWA
```javascript
const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:3005'
  : 'https://api.tiltcheck.me/surveys';
```

### Phase 5: PWA Manifest Files

Each PWA needs a `manifest.json` for installability:

#### Dashboard Manifest (`services/dashboard/public/manifest.json`)
```json
{
  "name": "TiltCheck Trust Dashboard",
  "short_name": "TiltCheck",
  "description": "Real-time casino and domain trust monitoring",
  "start_url": "/dashboard/",
  "display": "standalone",
  "background_color": "#111111",
  "theme_color": "#00d4aa",
  "icons": [
    {
      "src": "/assets/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/assets/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

Link in HTML:
```html
<link rel="manifest" href="/dashboard/manifest.json">
```

### Phase 6: Service Workers for Offline Support

Add service worker for each PWA:

#### Dashboard Service Worker (`services/dashboard/public/sw.js`)
```javascript
const CACHE_NAME = 'tiltcheck-dashboard-v1';
const urlsToCache = [
  '/dashboard/',
  '/dashboard/index.html',
  '/dashboard/styles.css',
  // Add other assets
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
```

Register in HTML:
```html
<script>
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/dashboard/sw.js')
    .then(reg => console.log('SW registered'))
    .catch(err => console.log('SW registration failed'));
}
</script>
```

## CORS Configuration

Backend API must allow requests from GitHub Pages domains:

```javascript
// Express CORS setup
const cors = require('cors');

const allowedOrigins = [
  'https://tiltcheck.me',
  'https://www.tiltcheck.me',
  'https://dashboard.tiltcheck.me',
  'https://tracker.tiltcheck.me',
  'https://surveys.tiltcheck.me',
  'https://control-room.tiltcheck.me',
  'https://app.tiltcheck.me',
  'https://my.tiltcheck.me',
  'http://localhost:5055', // Development
  'http://localhost:3000',
  'http://localhost:3004',
  'http://localhost:3005'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
```

## Security Considerations

### 1. HTTPS Only
- GitHub Pages serves over HTTPS automatically
- Ensure API is also HTTPS (`api.tiltcheck.me`)
- Mixed content (HTTP API from HTTPS page) will be blocked

### 2. Content Security Policy (CSP)
Add CSP headers to HTML:

```html
<meta http-equiv="Content-Security-Policy" 
  content="default-src 'self'; 
           connect-src 'self' https://api.tiltcheck.me; 
           script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; 
           style-src 'self' 'unsafe-inline';">
```

### 3. Authentication
- Use Discord OAuth for user login
- Store JWT tokens securely (HttpOnly cookies or secure localStorage)
- Implement token refresh logic

### 4. Rate Limiting
- Implement rate limiting on API endpoints
- Prevent abuse of public PWAs

## Development Workflow

### Local Development
```bash
# Start backend API
pnpm --filter @tiltcheck/dashboard dev

# Open dashboard PWA
open http://localhost:5055/dashboard/

# Or use live-server for hot reload
cd services/dashboard/public
npx live-server --port=8080
```

### Testing Before Deployment
```bash
# Build artifacts
mkdir -p out/dashboard
rsync -av services/dashboard/public/ out/dashboard/

# Serve locally to test
npx http-server out -p 8080

# Test at http://localhost:8080/dashboard/
```

### Deployment
```bash
# Push to main branch
git push origin main

# GitHub Actions will automatically:
# 1. Build PWAs
# 2. Copy to out/
# 3. Deploy to gh-pages branch
# 4. Available at dashboard.tiltcheck.me
```

## Rollout Timeline

### Week 1: Infrastructure Setup
- [ ] Configure DNS for tiltcheck.me
- [ ] Set up API gateway at api.tiltcheck.me
- [ ] Update GitHub Pages workflow
- [ ] Test deployment to gh-pages

### Week 2: Dashboard PWA
- [ ] Update Dashboard API calls to use api.tiltcheck.me
- [ ] Add manifest.json
- [ ] Add service worker
- [ ] Test on dashboard.tiltcheck.me
- [ ] Update CORS on backend

### Week 3: Control Room PWA
- [ ] Update Control Room API calls
- [ ] Add PWA features (manifest, SW)
- [ ] Deploy to control-room.tiltcheck.me

### Week 4: Future PWAs
- [ ] Plan Tracker PWA frontend build
- [ ] Plan Surveys PWA frontend build
- [ ] Reserve subdomains (tracker.tiltcheck.me, surveys.tiltcheck.me)

## Benefits

### For Users
- ✅ **Easy Access**: Simple URLs (dashboard.tiltcheck.me)
- ✅ **Installable**: Add to home screen on mobile
- ✅ **Offline**: Basic functionality without internet
- ✅ **Fast**: Served from CDN (GitHub Pages)
- ✅ **Secure**: HTTPS by default

### For Development
- ✅ **Free Hosting**: GitHub Pages is free
- ✅ **Auto Deployment**: Push to main = auto deploy
- ✅ **Scalable**: GitHub's CDN handles traffic
- ✅ **Simple**: No server management for frontend
- ✅ **Monorepo Friendly**: All PWAs in one repo

### For Business
- ✅ **Professional**: Custom domain (tiltcheck.me)
- ✅ **Cost Effective**: Free hosting for all PWAs
- ✅ **SEO Friendly**: Crawlable by Google
- ✅ **Reliable**: GitHub's 99.9% uptime SLA
- ✅ **Branching**: Can test on other branches (staging.tiltcheck.me)

## Monitoring & Analytics

### GitHub Pages Stats
- View traffic in GitHub repo Insights → Traffic

### Google Analytics
Add to each PWA:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

### Performance Monitoring
- Use Lighthouse CI for PWA scores
- Monitor Core Web Vitals
- Track PWA install rates

## Troubleshooting

### Issue: 404 on Subdomain
**Cause**: DNS not configured or not propagated  
**Solution**: Check DNS settings, wait up to 48 hours for propagation

### Issue: API Calls Fail (CORS)
**Cause**: Backend not allowing GitHub Pages origin  
**Solution**: Add domains to CORS allowlist

### Issue: Mixed Content Error
**Cause**: API is HTTP, page is HTTPS  
**Solution**: Ensure API is served over HTTPS

### Issue: Service Worker Not Registering
**Cause**: HTTPS required for SW  
**Solution**: GitHub Pages uses HTTPS by default, check in dev tools

### Issue: Manifest Not Loading
**Cause**: Wrong path in link tag  
**Solution**: Use absolute path `/dashboard/manifest.json`

## Next Steps

1. **Update pages.yml workflow** - Add all PWA directories
2. **Configure DNS** - Point subdomains to GitHub Pages
3. **Update Dashboard** - Change API calls to use api.tiltcheck.me
4. **Deploy and Test** - Push to main and verify
5. **Build Future PWAs** - Tracker and Surveys frontends

---

**Made easier with GitHub Pages. Powered by tiltcheck.me. 🚀📦💻**
