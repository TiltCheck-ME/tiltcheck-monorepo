<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-03-14 -->

# Deployed Changes Not Showing - Quick Fix

**Problem:** You pushed code, it deployed, but the live site still shows old version.

**Root Cause:** Multi-layer caching (Service Worker + Browser + Cloudflare CDN)

---

## Step 1: Verify Deployment Actually Succeeded

### Check Git Push Status
```bash
cd C:\Users\jmeni\tiltcheck-monorepo
git log --oneline -3
git branch -vv
```

Should show your recent commits and branch status.

### Check Cloud Build/Deployment
Go to Google Cloud Console and check:
1. **Cloud Build** → Recent builds
   - Did `cloudbuild-web.yaml` or `cloudbuild.yaml` run after your push?
   - Did it succeed? (green checkmark)

2. **Cloud Run** services
   - Is `tiltcheck-web` updated? Check timestamp
   - Click service → Revisions → should show new revision deployed

3. **GitHub Actions** (if set up)
   - Check `.github/workflows/` for deployment workflows
   - Did they run after your push?

---

## Step 2: Clear ALL Caches (Immediate)

### In Browser (Right Now)

**Open browser console (F12 → Console) and paste this:**

```javascript
// CLEAR EVERYTHING
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(reg => {
      console.log('Unregistering SW:', reg.scope);
      reg.unregister();
    });
  });
}

// Clear all cache storage
caches.keys().then(names => {
  names.forEach(name => {
    console.log('Deleting cache:', name);
    caches.delete(name);
  });
});

// Clear browser storage
localStorage.clear();
sessionStorage.clear();
console.log('All caches cleared!');

// Wait 2 seconds then reload
setTimeout(() => {
  location.reload(true);
}, 2000);
```

### Then Hard Refresh
After the console clears everything, do:
- **Windows:** `Ctrl + Shift + Delete` (opens clear browsing data)
- **OR:** `Ctrl + Shift + R` (hard refresh)
- **Wait 5 seconds** for page to fully load

---

## Step 3: Clear Cloudflare Cache (Production)

If you deployed to `tiltcheck.me`:

**Go to:** https://dash.cloudflare.com
1. Select `tiltcheck.me` domain
2. Click **Caching** in left menu
3. Scroll to **Purge Cache** section
4. Click **Purge Everything**
5. **Wait 30 seconds** for purge to complete

---

## Step 4: Verify What's Actually Deployed

### Check Live File Version
Open browser DevTools → **Network** tab → Click on any resource

Look at response headers:
```
Cache-Control: max-age=...
ETag: "..."
Last-Modified: Wed, 14 Mar 2026 ...
```

The timestamp should be **recent** (today's date, or within last few minutes).

### Directly Check Deployed HTML
```bash
# Check the actual HTML being served
curl -I https://tiltcheck.me/

# Look for Last-Modified date - should be today
# Or check response headers

# Get full response with headers
curl -v https://tiltcheck.me/ 2>&1 | head -50
```

If `Last-Modified` is old (days/weeks ago), deployment didn't actually push new code.

---

## Step 5: If Still Old - Rebuild & Redeploy

**If dates show old deployment:**

```bash
# 1. Check what's in the repo
git status
git log --oneline -1

# 2. Rebuild locally to test
pnpm clean
pnpm install
pnpm --filter @tiltcheck/web build

# Check build output has new files
ls -la apps/web/dist/

# 3. If build successful, trigger Cloud Build manually
gcloud builds submit --config=cloudbuild-web.yaml --substitutions=BRANCH_NAME=main

# 4. Watch the build
gcloud builds log [BUILD_ID] --stream

# 5. Verify deployment
curl -I https://tiltcheck.me/
```

---

## Step 6: Check for Service Worker Issues

**In DevTools:**

1. Go to **Application** tab
2. Click **Service Workers** in left sidebar
3. Look for registered service workers
4. If any show "waiting to activate" → Click **skipWaiting** button
5. If any are "redundant" or "error" → Click **Unregister**

**Also check:**
- **Cache Storage** → Delete all caches
- **Application → Manifest** → Make sure manifest is up to date

---

## Complete Nuclear Option (If Nothing Works)

**This clears everything:**

1. **Browser:**
   - Chrome: Settings → Privacy → Clear browsing data → **All time** → Check all boxes → Clear
   - OR use the console script above

2. **Cloudflare:**
   - Purge Everything (see Step 3)

3. **Dev Server (if local):**
   ```bash
   # Kill any running dev servers
   pkill -f "vite" || true
   pkill -f "npm run dev" || true
   
   # Full rebuild
   pnpm clean
   pnpm install
   pnpm --filter @tiltcheck/web build
   pnpm --filter @tiltcheck/web dev
   
   # Load http://localhost:5173 in NEW incognito window
   ```

4. **Production:**
   - Manual Cloud Run update:
   ```bash
   gcloud run deploy tiltcheck-web \
     --image=us-central1-docker.pkg.dev/tiltchcek/tiltcheck/web:latest \
     --region=us-central1 \
     --allow-unauthenticated
   ```

---

## What You Should See After Fixes

**Network tab in DevTools should show:**
- ✅ New files with TODAY's timestamp
- ✅ No 304 "Not Modified" responses
- ✅ HTML with `Cache-Control: no-cache`
- ✅ Hashed assets (like `app.abc123.js`) with 1-year cache

**Console should show:**
- ✅ No Service Worker errors
- ✅ No CORS errors
- ✅ TiltCheck initialization messages with NEW content

---

## Prevent This Going Forward

### 1. Fix Cache Headers (nginx.conf)
```nginx
location ~* \.(js|css|webp|svg)$ {
  # Hashed files - cache forever
  expires 1y;
  add_header Cache-Control "public, immutable";
}

location ~* index.html$ {
  # HTML - never cache, always validate
  expires -1;
  add_header Cache-Control "no-cache, no-store, must-revalidate";
  add_header Pragma "no-cache";
  add_header Expires "0";
}

location / {
  # SPA fallback
  try_files $uri $uri/ /index.html;
  expires -1;
  add_header Cache-Control "no-cache, no-store, must-revalidate";
}
```

### 2. Service Worker Cache Busting
In your service worker, add version:
```javascript
const CACHE_VERSION = 'v-' + new Date().toISOString().split('T')[0];
const CACHE_NAME = `tiltcheck-${CACHE_VERSION}`;

// This creates new cache every day
```

### 3. Check Deployment Logs
```bash
# Watch Cloud Run logs in real-time
gcloud run logs read tiltcheck-web --follow --region us-central1

# Check deployment status
gcloud run describe tiltcheck-web --region us-central1 | grep -A5 "Latest Revision"
```

---

## Quick Checklist (Do This Now)

- [ ] Open browser DevTools → Console
- [ ] Paste the cache-clearing JavaScript above
- [ ] Wait for reload to complete
- [ ] Go to **Network** tab
- [ ] Hard refresh (Ctrl+Shift+R)
- [ ] Check all file timestamps are recent
- [ ] Go to Cloudflare → Purge Everything
- [ ] Wait 30 seconds
- [ ] Reload page again
- [ ] If still old, check `curl -I https://tiltcheck.me/` for Last-Modified date

---

**If after all this it's STILL showing old content:**

1. Check `git log -1` to confirm your changes were pushed
2. Check Cloud Build status - did it complete successfully?
3. Check Cloud Run revision list - is new revision there?
4. Check actual deployed container logs for errors

Let me know what you find and I'll help debug further.

**Made for Degens. By Degens.**

© 2024–2026 TiltCheck Ecosystem. All Rights Reserved.
