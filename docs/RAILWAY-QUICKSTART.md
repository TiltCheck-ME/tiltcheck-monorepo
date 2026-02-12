# Quick Start: Deploy to Railway

## What You Have Now

✅ **Fixed dashboard** - Runs locally without errors  
✅ **Static file serving** - Dashboard PWA served at `/dashboard/`  
✅ **All tests passing** - Ready for deployment  

## Deployment: Railway (One Method, Simple)

### Cost
- **Free Tier**: $0 for testing (~21 days uptime/month)
- **Pro Tier**: $20/month for 24/7 production

### Steps to Deploy

#### 1. Install Railway CLI
```bash
npm install -g @railway/cli
```

#### 2. Login to Railway
```bash
railway login
```

#### 3. Create New Project (First Time)
```bash
cd /home/runner/work/tiltcheck-monorepo/tiltcheck-monorepo
railway init
# Follow prompts to create project
```

Or link to existing project:
```bash
railway link
```

#### 4. Deploy
```bash
railway up
```

That's it! Your app will deploy to Railway.

#### 5. Configure Custom Domain (Optional)

In Railway dashboard:
1. Go to your project
2. Click "Settings" → "Domains"
3. Add custom domain: `tiltcheck.me`
4. Railway will give you DNS records
5. Add DNS records to your domain registrar

### What Gets Deployed

```
Your Railway Service:
├── Backend API (Node.js/Express)
│   └── Port 5055 (or Railway's PORT env var)
├── Dashboard PWA
│   └── Served at /dashboard/
├── Control Room PWA
│   └── Served at /control-room/
└── Other services as needed
```

### Access Your App

After deployment:
- **Without custom domain**: `https://your-project.railway.app/dashboard/`
- **With custom domain**: `https://tiltcheck.me/dashboard/`

### Environment Variables

Set in Railway dashboard or via CLI:

```bash
railway variables set NODE_ENV=production
railway variables set PORT=5055
# Add any other env vars your app needs
```

### Auto-Deploy from GitHub

Link Railway to your GitHub repo for automatic deployments:

1. In Railway dashboard → Settings → GitHub
2. Connect your repo
3. Select branch (main)
4. Enable auto-deploy

Now every push to `main` automatically deploys!

### Check Deployment Status

```bash
# View logs
railway logs

# Check deployment status
railway status

# Open in browser
railway open
```

## That's It!

**Simple. One deployment. Everything together. 🚀**

No complex GitHub Pages setup, no CORS configuration, no separate deployments to manage.

## Troubleshooting

### Build Fails
- Check Railway logs: `railway logs`
- Ensure `package.json` scripts are correct
- Verify dependencies install: `pnpm install`

### App Not Starting
- Check PORT environment variable is set
- Verify start command in `package.json` or Railway config
- Check logs for errors

### Dashboard Not Loading
- Visit `/dashboard/` with trailing slash
- Check that `public` directory is being served
- Verify paths in `server.ts` are correct

### Need Help?
- Railway docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Your deployment docs are in this repo

## Cost Estimate

**For production (24/7):**
- Railway Pro: **$20/month**
- Includes $20 usage credits
- Your usage: ~$10/month
- Leftover: $10 credits

**Start free, upgrade when ready!**
