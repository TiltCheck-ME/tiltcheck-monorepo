# Quick Deployment Guide - TiltCheck Frontend

## Easiest Option: Railway Deployment

### Step 1: Install Railway CLI
```bash
# Install Railway
curl -fsSL https://railway.app/install.sh | sh
```

### Step 2: Login to Railway
```bash
railway login
```
This opens a browser window - complete the login there.

### Step 3: Initialize Deployment
```bash
cd /Users/fullsail/Desktop/tiltcheck-monorepo-fresh

# Link to create a new project
railway init

# Select "Empty Project" when prompted
# Then select the GitHub repo: jmenichole/tiltcheck-monorepo
```

### Step 4: Set Environment Variables
```bash
# Set required variables
railway variables set NODE_ENV=production
railway variables set PORT=3000
railway variables set LANDING_LOG_PATH=/tmp/landing.log

# Admin IP (get your IP from https://ifconfig.me)
railway variables set ADMIN_IP_1=YOUR_IP_ADDRESS

# Optional: Newsletter salt (generate a random string)
railway variables set NEWSLETTER_SALT=$(openssl rand -hex 32)
```

### Step 5: Deploy
```bash
railway up
```

### Step 6: Get Your URL
```bash
# View your deployed service
railway open
```
Your app will be live at a URL like: `https://tiltcheck-frontend.up.railway.app`

---

## Alternative: Deploy via Railway Dashboard (No CLI)

### Step 1: Go to Railway Dashboard
1. Open https://railway.app/dashboard
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**

### Step 2: Select Repository
- Choose: `jmenichole/tiltcheck-monorepo`
- Click **"Link Repository"**

### Step 3: Configure Service
- **Root Directory**: `frontend`
- **Build Command**: `npm install`
- **Start Command**: `npm start`

### Step 4: Add Environment Variables
In the Railway dashboard, go to **Variables** tab and add:

```
NODE_ENV=production
PORT=3000
LANDING_LOG_PATH=/tmp/landing.log
ADMIN_IP_1=YOUR_IP_ADDRESS
NEWSLETTER_SALT=any-random-string
```

### Step 5: Deploy
- Click **"Deploy"** button
- Wait for build to complete (~2-3 minutes)
- Click the **URL** to view your app

---

## Verifying the Deployment

After deployment, visit your Railway URL and check:

1. **Home page loads** - `https://your-app.railway.app/`
2. **Admin pages work** - `https://your-app.railway.app/admin/status`
3. **Health check** - `https://your-app.railway.app/health`

---

## Common Issues & Fixes

### "Build failed - workspace:* dependency"
✅ **FIXED**: The express-utils is now vendored locally in `frontend/node_modules/`

### "Port not found error"
Make sure `PORT=3000` is set in Railway variables

### "Admin pages return 403"
This is expected - admin pages require your IP to be in `ADMIN_IP_1`

### "Static files not loading"
The `outputDirectory: "public"` in vercel.json should work. If not, Railway serves static files automatically.

---

## Adding a Custom Domain (Optional)

### Via Railway Dashboard:
1. Go to your service → **Settings** → **Domains**
2. Click **"Add Domain"**
3. Enter your domain (e.g., `tiltcheck.me`)
4. Follow DNS instructions

### DNS Setup:
- Add CNAME record pointing to: `gateway.railway.trafficmanager.net`
- Or add A record with Railway's IP

---

## Deploying Updates

### Via CLI:
```bash
cd /Users/fullsail/Desktop/tiltcheck-monorepo-fresh
git add .
git commit -m "your changes"
git push origin main
railway up
```

### Via Dashboard:
- Push to main branch → Railway auto-deploys

---

## What Gets Deployed

The frontend includes:
- Landing pages (index.html, about.html, etc.)
- Admin panels (admin-analytics, admin-status)
- API endpoints (newsletter, sitemap, health)
- Static assets (CSS, JS, images)

---

## Need Help?

- Railway Docs: https://docs.railway.app
- Railway Support: https://discord.gg/railway

