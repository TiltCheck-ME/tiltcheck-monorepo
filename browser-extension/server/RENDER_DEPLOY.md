# TiltGuard API Server - Render Deployment

## Quick Deploy to Render.com

### Option 1: Use Render Dashboard (Easiest)

1. **Go to Render Dashboard**
   - Visit: https://dashboard.render.com/
   - Click "New +" → "Web Service"

2. **Connect Repository**
   - Connect your GitHub: `jmenichole/tiltcheck-monorepo`
   - Select branch: `main` or `ci/analyzers-workflow-rebased`

3. **Configure Service**
   ```
   Name: tiltguard-api
   Environment: Node
   Region: Oregon (US West)
   Branch: main (or your current branch)
   Root Directory: browser-extension/server
   Build Command: npm install
   Start Command: npm start
   ```

4. **Set Environment Variables** (in dashboard)
   ```
   PORT=10000
   NODE_ENV=production
   ```
   
   **Optional (for database):**
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your-anon-key
   ```

5. **Deploy**
   - Click "Create Web Service"
   - Wait 2-3 minutes
   - Copy URL: `https://tiltguard-api.onrender.com`

### Option 2: Use render.yaml (Infrastructure as Code)

The `render.yaml` in the repo root should auto-detect, but if you want to deploy just the API:

1. Create `render.yaml` in `browser-extension/server/`:

```yaml
services:
  - type: web
    name: tiltguard-api
    env: node
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        generateValue: true
```

2. Connect repo in Render dashboard
3. It will auto-detect `render.yaml`

## Testing Deployment

Once deployed, test your API:

```bash
# Replace with your actual Render URL
curl https://tiltguard-api.onrender.com/api/health

# Should return:
# {"status":"online","service":"tiltguard-api",...}
```

## Update Extension to Use Production API

1. Edit `browser-extension/src/sidebar.ts`:
   ```typescript
   const API_BASE = 'https://tiltguard-api.onrender.com/api';
   ```

2. Rebuild extension:
   ```bash
   cd browser-extension
   pnpm build
   ```

3. Reload extension in Chrome

## Common Issues

### "Module not found: @supabase/supabase-js"

**Solution**: The dependency is now in `server/package.json`. Render will install it automatically.

### "Port already in use"

**Solution**: Render sets `PORT` env variable automatically (usually 10000). Code now uses `process.env.PORT` first.

### "Supabase not configured"

**Solution**: This is OK! The API falls back to in-memory storage. Add Supabase credentials in environment variables when ready.

## Enable Database (Optional)

1. **Create Supabase Project**
   - Go to supabase.com → New Project
   - Name: `tiltguard-production`
   - Save password

2. **Run SQL Schema**
   - SQL Editor → New Query
   - Copy SQL from `PRODUCTION_DEPLOYMENT.md` section "Create Tables"
   - Run query

3. **Get Credentials**
   - Project Settings → API
   - Copy URL (e.g., `https://abc123.supabase.co`)
   - Copy `anon` `public` key

4. **Add to Render**
   - Dashboard → tiltguard-api → Environment
   - Add:
     - `SUPABASE_URL` = your URL
     - `SUPABASE_KEY` = your anon key
   - Save changes (will auto-redeploy)

## Monitoring

- **Logs**: Dashboard → tiltguard-api → Logs
- **Health**: Visit `https://your-app.onrender.com/api/health`
- **Uptime**: Set up uptimerobot.com to ping every 5 minutes

## Free Tier Limitations

- Sleeps after 15 minutes of inactivity
- Spins up in ~30 seconds on first request
- 750 hours/month free

**To prevent sleeping**:
- Upgrade to paid ($7/month)
- Use cron-job.org to ping every 10 minutes
- Or use Fly.io (3 always-on VMs free)

## Logs & Debugging

```bash
# View logs in real-time
# Go to Render Dashboard → tiltguard-api → Logs

# Or use Render CLI
npm install -g @render-cloud/cli
render login
render logs -s tiltguard-api
```

## Next Steps

1. ✅ Deploy API to Render
2. ✅ Test health endpoint
3. ⬜ Set up Supabase database
4. ⬜ Add Discord OAuth credentials
5. ⬜ Update extension with production URL
6. ⬜ Enable monitoring

---

**Quick Start**: Just push to GitHub, connect in Render dashboard, deploy! 🚀
