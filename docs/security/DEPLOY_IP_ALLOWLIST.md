# 🔒 Deploying IP Allowlist Security to Production

## Overview
This guide covers deploying the IP allowlist security to Railway.

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
Copy this IP - you'll need it for Railway.

### 2. Deploy to Railway

#### Via Railway Dashboard (Recommended)
1. Go to https://railway.app
2. Select your `landing-web` service
3. Click **Variables** tab
4. Add these environment variables:
   ```
   ADMIN_IP_1=YOUR_IP_FROM_STEP_1
   ADMIN_IP_2=your_office_ip_if_needed
   ADMIN_IP_3=your_vpn_ip_if_needed
   ```
5. Railway will auto-redeploy with new variables

#### Via Railway CLI
```bash
railway variables --set ADMIN_IP_1=YOUR_IP_FROM_STEP_1
railway up
```

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

View Railway logs to confirm IP detection:
```bash
railway logs

# Look for:
[2025-11-22T...] Admin access attempt from IP: X.X.X.X
[SECURITY] Admin access granted to authorized IP: X.X.X.X
```

Or for blocks:
```
[SECURITY] Blocked admin access from unauthorized IP: X.X.X.X
```

## IP Detection on Railway

Railway uses `X-Forwarded-For` header. The code handles this automatically:

```javascript
const clientIP = req.ip || 
                req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                req.headers['x-real-ip'];
```

## Adding More IPs Later

When you need to add more authorized IPs:

1. Go to Railway Dashboard → Variables
2. Add `ADMIN_IP_4`, `ADMIN_IP_5`, etc.
3. Save (auto-redeploys)

Or via CLI:
```bash
railway variables --set ADMIN_IP_4=new.ip.address
```

## Troubleshooting

### "I'm blocked from my own control room!"

1. Check your current IP: `curl -s https://api.ipify.org`
2. Add it to Railway environment variables
3. Redeploy

### "Seal can still access the control room"

Make sure you've:
- ✅ Merged to `main` branch
- ✅ Deployed to production (Railway)
- ✅ Set environment variables on Railway
- ✅ Checked you're testing the live URL, not localhost

### "Getting 500 errors"

Check Railway logs for issues:
```bash
railway logs
```

Common problems:
- Missing environment variables
- Syntax errors in IP addresses

## Security Notes

- **Localhost IPs** (`127.0.0.1`, `::1`, `::ffff:127.0.0.1`) are automatically allowed
- **Your public IP** must be set in `ADMIN_IP_1` environment variable
- **IP changes**: If you have dynamic IP, you'll need to update Railway env vars when it changes
- **VPN users**: Add your VPN's exit IP as `ADMIN_IP_3`

## Files Changed

- `services/landing/server.js` - IP allowlist middleware
- `services/landing/public/trust.html` - Layout centering fixes

## Next Steps

1. Open PR to `main` branch
2. Wait for CI checks
3. Merge PR  
4. Configure Railway environment variables
5. Verify security with live tests
6. Tell Seal the control room is now locked down! 🔐
