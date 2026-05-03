<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-03-14 -->

<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-03 -->

# Website Changes Not Showing - Caching Troubleshooting Guide

**Problem:** You edited website pages but changes aren't appearing on tiltcheck.me. The console shows old state.

**Root Cause:** Browser caching + Service Worker caching + Cloudflare edge cache

---

## Immediate Fixes (Try These First)

### Fix 1: Hard Refresh (Clear Browser Cache)

**Chrome/Edge:**
```
Windows: Ctrl + Shift + Del
or
Right-click page → Inspect → Network tab → Disable cache (checkbox) → Reload
```

**Firefox:**
```
Windows: Ctrl + Shift + Delete
or
Shift + F5 for hard refresh
```

**Safari:**
```
Cmd + Shift + Delete
or
Develop → Empty Web Caches
```

---

### Fix 2: Clear Service Worker Cache

Service Workers cache assets aggressively. You need to unregister the old one:

**In Chrome DevTools:**
1. Open DevTools (F12)
2. Go to **Application** tab
3. Click **Service Workers** in left sidebar
4. Click **Unregister** on any registered service workers
5. Go to **Cache Storage**
6. Delete all cache entries (right-click each → Delete)
7. **Hard refresh** the page (Ctrl + Shift + R)

**Or programmatically** - open browser console and run:
```javascript
// Clear all service worker caches
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(reg => reg.unregister());
  });
  caches.keys().then(cacheNames => {
    cacheNames.forEach(cacheName => {
      caches.delete(cacheName);
    });
  });
  console.log('Service workers unregistered, caches cleared');
  location.reload();
}
```

---

### Fix 3: Clear Cloudflare Cache (Production)

If you deployed changes to tiltcheck.me, Cloudflare CDN might be caching the old version:

**Option A: Via Cloudflare Dashboard**
1. Go to https://dash.cloudflare.com
2. Select your domain (tiltcheck.me)
3. Click **Caching** → **Configuration**
4. Scroll to **Purge Cache**
5. Click **Purge Everything**

**Option B: Via Cloudflare API**
```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache" \
  -H "X-Auth-Email: your@email.com" \
  -H "X-Auth-Key: <cloudflare_api_key>" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
```

**Option C: Purge Single Files**
```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache" \
  -H "X-Auth-Email: your@email.com" \
  -H "X-Auth-Key: <cloudflare_api_key>" \
  -H "Content-Type: application/json" \
  --data '{"files":["https://tiltcheck.me/","https://tiltcheck.me/index.html"]}'
```

---

### Fix 4: Browser LocalStorage Persistence

Some state might be cached in browser storage:

```javascript
// In browser console, run:
localStorage.clear();
sessionStorage.clear();
location.reload();
```

Or in **DevTools** → **Application** tab:
- Click **Local Storage** → Right-click domain → **Delete**
- Click **Session Storage** → Right-click domain → **Delete**

---

## If Changes Were Deployed to Production

### Step 1: Verify Deployment Happened

Check if your code was actually deployed to the cloud:

```bash
# Check recent git commits
git log --oneline -10

# Check if deployment was triggered
# Look for GitHub Actions or Cloud Build status
```

### Step 2: Rebuild & Redeploy Web Service

If you pushed code but it's not deployed:

```bash
# Local build
pnpm --filter @tiltcheck/web build

# Check build output
ls -la apps/web/dist/

# If build successful, redeploy to production
# This depends on your deployment method:

# Option A: Cloud Build trigger (if configured)
gcloud builds submit --config=cloudbuild-web.yaml

# Option B: Docker push (if you have access)
docker build -f apps/web/Dockerfile -t us-central1-docker.pkg.dev/tiltchcek/tiltcheck/web:latest .
docker push us-central1-docker.pkg.dev/tiltchcek/tiltcheck/web:latest

# Option C: Manual Cloud Run update
gcloud run deploy tiltcheck-web --image=us-central1-docker.pkg.dev/tiltchcek/tiltcheck/web:latest
```

### Step 3: Verify New Build is Live

```bash
# Wait 2-3 minutes for deployment
# Then:
curl -I https://tiltcheck.me/

# Check response headers for date (should be recent)
# Check for new cache-buster headers
```

---

## Root Cause: Why This Keeps Happening

### 1. **Service Worker Aggressive Caching**
Your app has a Service Worker (`sw.js`) that caches assets indefinitely. When you update the code, the old Service Worker serves the cached version.

**Solution:** Update Service Worker cache version:
```javascript
// In sw.js or your service worker registration
const CACHE_VERSION = 'v' + new Date().getTime();
const CACHE_NAME = `tiltcheck-${CACHE_VERSION}`;

// Then in your build/deploy script:
sed -i "s/CACHE_VERSION = .*/CACHE_VERSION = 'v$(date +%s)'/g" sw.js
```

### 2. **Cloudflare/CDN Edge Cache**
Static files cached at Cloudflare with long TTL (Time To Live).

**Solution:** Add cache-busting to assets:
```html
<!-- Add timestamp or hash to assets -->
<script src="/app.js?v=1234567890"></script>
<link rel="stylesheet" href="/style.css?v=1234567890">

<!-- Or use webpack/vite asset hashing automatically -->
<!-- Vite does this by default: app.abc123def456.js -->
```

### 3. **Browser Cache + 304 Not Modified**
Browser sees `Cache-Control: max-age` header and doesn't check for updates.

**Solution:** Configure proper cache headers:
```
# In nginx.conf or web server config
location ~* \.(js|css|jpg|jpeg|png|gif|ico|svg|webp)$ {
  # Static assets with long cache (hashed filenames)
  expires 1y;
  add_header Cache-Control "public, immutable";
}

location ~* \.(html)$ {
  # HTML with no cache or short cache
  expires -1;
  add_header Cache-Control "no-cache, no-store, must-revalidate";
}

location / {
  # SPA fallback
  try_files $uri $uri/ /index.html;
  expires -1;
  add_header Cache-Control "no-cache, no-store, must-revalidate";
}
```

### 4. **Git Not Deployed**
Code exists locally but hasn't been pushed or deployed yet.

**Checklist:**
```bash
git status                    # See uncommitted changes
git add -A                    # Stage all
git commit -m "..."           # Commit
git push origin main          # Push to remote
# Then verify deployment via GitHub Actions or Cloud Build
```

---

## Complete Cleanup Sequence

**If nothing else works, do this in order:**

### Step 1: Browser Side
```javascript
// Run in browser console
navigator.serviceWorker.getRegistrations().then(r => r.forEach(x => x.unregister()));
caches.keys().then(names => names.forEach(name => caches.delete(name)));
localStorage.clear();
sessionStorage.clear();
indexedDB.databases().forEach(db => indexedDB.deleteDatabase(db.name));
location.reload();
```

### Step 2: Cloudflare
- Go to Cloudflare Dashboard
- Purge Everything (see Fix 3 above)

### Step 3: Verify Code is Deployed
```bash
# Check deployed version
curl https://api.tiltcheck.me/health

# Check web service logs
gcloud run logs read tiltcheck-web --limit 100

# Check web service current revision
gcloud run describe tiltcheck-web --region us-central1
```

### Step 4: Force Revalidation
- Open DevTools
- Disable cache (Network tab, checkbox)
- Hard refresh (Ctrl+Shift+R)
- Check that new resources load (no 304 responses)

---

## Testing Locally (No Cache Issues)

If you're testing on localhost:

```bash
# Build locally
pnpm --filter @tiltcheck/web build

# Start dev server with no cache
cd apps/web
pnpm dev

# In another terminal, clear browser cache after each save:
# (See "Hard Refresh" section above)
```

Or use dev server with cache disabled:

```bash
# Vite (with CORS headers that prevent caching)
VITE_DISABLE_CACHE=true pnpm --filter @tiltcheck/web dev
```

---

## Monitoring (Going Forward)

### Add Cache-Busting to Your Build

**In package.json (web app):**
```json
"scripts": {
  "build": "vite build && echo '{\"version\":\"'$(date +%s)'\"}' > dist/version.json",
  "dev": "DISABLE_CACHE=1 vite"
}
```

**In your HTML:**
```html
<script>
  // Force reload if version changed
  fetch('/version.json').then(r => r.json()).then(data => {
    const storedVersion = localStorage.getItem('app-version');
    if (storedVersion && storedVersion !== data.version) {
      localStorage.removeItem('app-version');
      location.reload(true);
    }
    localStorage.setItem('app-version', data.version);
  });
</script>
```

### Configure Proper Cache Headers

**See the nginx.conf example above** - use immutable headers for hashed assets, no-cache for HTML.

---

## Quick Diagnostic Checklist

- [ ] Ran hard refresh (Ctrl+Shift+R)
- [ ] Cleared Service Workers (DevTools → Application)
- [ ] Cleared browser cache (DevTools → Clear site data)
- [ ] Purged Cloudflare cache (if production)
- [ ] Verified code was pushed to git
- [ ] Verified deployment completed (GitHub Actions/Cloud Build)
- [ ] Checked recent files have new timestamps
- [ ] Opened in incognito/private window (no cache)

---

## What to Report If Still Broken

If none of these work, provide:
1. URL you're testing (local vs tiltcheck.me)
2. What changes you made (file names)
3. Output of `git status` and `git log -1`
4. Screenshot of Network tab in DevTools showing what's loaded
5. Service Worker status (registered/unregistered)
6. Cloudflare cache status (if production)

---

**Made for Degens. By Degens.**

© 2024–2026 TiltCheck Ecosystem. All Rights Reserved.
