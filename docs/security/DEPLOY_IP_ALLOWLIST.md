# 🔒 Deploying IP Allowlist Security to Production

## Overview
This guide covers deploying the IP allowlist security to Render, Railway, or similar platforms.

## What's Protected
- `/control-room` - Admin control panel
- `/admin/status` - System status API  
- `/admin/sitemap` - Site map API

## Local Testing (Already Working ✅)
Your localhost is already secured. Test with:
```bash
# Should work (localhost)
curl http://localhost:8080/control-room

# Should block (fake external IP)
curl -H "X-Forwarded-For: 99.99.99.99" http://localhost:8080/control-room
```

## Production Deployment Steps

### 1. Get Your Public IP
```bash
curl -s https://api.ipify.org
```
Copy this IP - you'll need it for Render.

### 2. Deploy to Render

#### Option A: Via Render Dashboard (Recommended)
1. Go to https://dashboard.render.com
2. Select your `landing-web` service
3. Click **Environment** tab
4. Add these environment variables:
   ```
   ADMIN_IP_1=YOUR_IP_FROM_STEP_1
   ADMIN_IP_2=your_office_ip_if_needed
   ADMIN_IP_3=your_vpn_ip_if_needed
   ```
5. Click **Save Changes**
6. Go to **Manual Deploy** → **Deploy latest commit**

#### Option B: Via Pull Request (Requires CI Pass)
1. Create PR from `feat/components-tests-a11y-ecosystem` to `main`
2. Wait for CI checks to pass
3. Merge PR
4. Render will auto-deploy

### 3. Verify Production Security

After deployment, test your live site:

```bash
# Replace with your actual domain
DOMAIN="tiltcheck.it.com"

# Should work from your IP
curl https://$DOMAIN/control-room

# Should block from unauthorized IP (test from another location/VPN)
curl https://$DOMAIN/control-room
# Expected: {"error":"Access denied","message":"Admin panel access is restricted..."}
```

### 4. Check Logs

View Render logs to confirm IP detection:
```
Dashboard → Your Service → Logs

Look for:
[2025-11-22T...] Admin access attempt from IP: X.X.X.X
[SECURITY] Admin access granted to authorized IP: X.X.X.X
```

Or for blocks:
```
[SECURITY] Blocked admin access from unauthorized IP: X.X.X.X
```

## IP Detection on Render

Render uses `X-Forwarded-For` header. The code handles this automatically:

```javascript
const clientIP = req.ip || 
                req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                req.headers['x-real-ip'];
```

## Adding More IPs Later

When you need to add more authorized IPs:

1. Go to Render Dashboard → Environment
2. Add `ADMIN_IP_4`, `ADMIN_IP_5`, etc.
3. Click **Save Changes** (auto-redeploys)

## Troubleshooting

### "I'm blocked from my own control room!"

1. Check your current IP: `curl -s https://api.ipify.org`
2. Add it to Render environment variables
3. Redeploy

### "Seal can still access the control room"

Make sure you've:
- ✅ Merged to `main` branch
- ✅ Deployed to production (Render/Railway)
- ✅ Set environment variables on Render
- ✅ Checked you're testing the live URL, not localhost

### "Getting 500 errors"

Check Render logs for issues. Common problems:
- Missing environment variables
- Syntax errors in IP addresses

## Security Notes

- **Localhost IPs** (`127.0.0.1`, `::1`, `::ffff:127.0.0.1`) are automatically allowed
- **Your public IP** must be set in `ADMIN_IP_1` environment variable
- **IP changes**: If you have dynamic IP, you'll need to update Render env vars when it changes
- **VPN users**: Add your VPN's exit IP as `ADMIN_IP_3`

## Files Changed

- `services/landing/server.js` - IP allowlist middleware
- `services/landing/public/trust.html` - Layout centering fixes
- `.env.production.example` - Production env template

## Next Steps

1. Open PR to `main` branch
2. Wait for CI checks
3. Merge PR  
4. Configure Render environment variables
5. Verify security with live tests
6. Tell Seal the control room is now locked down! 🔐
