# Production Deployment Guide - TiltGuard Extension

## 🎯 Goal

Set up TiltGuard so you can **start the server and sit back** - it runs continuously without manual intervention.

---

## 📋 Prerequisites

Before deploying, ensure you have:
- [ ] A domain name (optional but recommended)
- [ ] A cloud hosting account (Render.com, Fly.io, Railway.app, or DigitalOcean)
- [ ] Supabase account (free tier works)
- [ ] Discord Developer Application created
- [ ] Git repository access

---

## 🚀 Deployment Options

### Option A: Render.com (Recommended - Easiest)

**Pros**: Free tier, auto-deploy from git, zero config
**Cons**: Sleeps after 15min inactivity on free tier

#### Steps

1. **Create Render Account**
   - Go to [render.com](https://render.com)
   - Sign up with GitHub

2. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repo
   - Select `tiltcheck-monorepo`

3. **Configure Service**
   ```yaml
   Name: tiltguard-api
   Environment: Node
   Region: Oregon (US West)
   Branch: main
   Root Directory: browser-extension/server
   Build Command: npm install
   Start Command: node api.js
   ```

4. **Set Environment Variables**
   ```
   PORT=3333
   NODE_ENV=production
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_key
   DISCORD_CLIENT_ID=your_discord_client_id
   DISCORD_CLIENT_SECRET=your_discord_secret
   ```

5. **Deploy**
   - Click "Create Web Service"
   - Wait 2-3 minutes for build
   - Copy your service URL: `https://tiltguard-api.onrender.com`

6. **Upgrade to Keep Alive (Optional)**
   - Free tier sleeps after 15min inactivity
   - $7/month for always-on
   - Or use [cron-job.org](https://cron-job.org) to ping every 10min

---

### Option B: Fly.io (Advanced - Best Performance)

**Pros**: Always-on, global edge deployment, 3 free VMs
**Cons**: Requires CLI setup

#### Steps

1. **Install Fly CLI**
   ```bash
   brew install flyctl
   # or
   curl -L https://fly.io/install.sh | sh
   ```

2. **Login & Launch**
   ```bash
   cd browser-extension/server
   fly auth login
   fly launch
   ```

3. **Configure fly.toml**
   ```toml
   app = "tiltguard-api"
   primary_region = "sjc"

   [build]
     builder = "heroku/buildpacks:20"

   [env]
     PORT = "8080"
     NODE_ENV = "production"

   [[services]]
     internal_port = 8080
     protocol = "tcp"

     [[services.ports]]
       port = 80
       handlers = ["http"]

     [[services.ports]]
       port = 443
       handlers = ["tls", "http"]
   ```

4. **Set Secrets**
   ```bash
   fly secrets set SUPABASE_URL=your_url
   fly secrets set SUPABASE_KEY=your_key
   fly secrets set DISCORD_CLIENT_ID=your_id
   fly secrets set DISCORD_CLIENT_SECRET=your_secret
   ```

5. **Deploy**
   ```bash
   fly deploy
   ```

6. **Get URL**
   ```bash
   fly status
   # Your app: https://tiltguard-api.fly.dev
   ```

---

### Option C: VPS with PM2 (Full Control)

**Pros**: Cheapest long-term, full control
**Cons**: Manual server management

#### Steps

1. **Provision Server**
   - DigitalOcean Droplet ($6/mo)
   - Linode VPS ($5/mo)
   - AWS Lightsail ($3.50/mo)

2. **SSH into Server**
   ```bash
   ssh root@your_server_ip
   ```

3. **Install Node.js**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

4. **Install PM2**
   ```bash
   npm install -g pm2
   ```

5. **Clone Repo**
   ```bash
   git clone https://github.com/yourusername/tiltcheck-monorepo.git
   cd tiltcheck-monorepo/browser-extension/server
   npm install
   ```

6. **Create Environment File**
   ```bash
   nano .env
   ```
   ```env
   PORT=3333
   NODE_ENV=production
   SUPABASE_URL=your_url
   SUPABASE_KEY=your_key
   DISCORD_CLIENT_ID=your_id
   DISCORD_CLIENT_SECRET=your_secret
   ```

7. **Start with PM2**
   ```bash
   pm2 start api.js --name tiltguard-api
   pm2 save
   pm2 startup
   # Copy and run the command it outputs
   ```

8. **Set Up Nginx Reverse Proxy**
   ```bash
   sudo apt install nginx
   sudo nano /etc/nginx/sites-available/tiltguard
   ```
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3333;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
   ```bash
   sudo ln -s /etc/nginx/sites-available/tiltguard /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

9. **Enable SSL**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

10. **Verify**
   ```bash
   curl https://your-domain.com/api/health
   ```

---

## 💾 Database Setup (Supabase)

### 1. Create Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Name: `tiltguard-production`
4. Database Password: (save securely)
5. Region: closest to your server

### 2. Create Tables

Run this SQL in Supabase SQL Editor:

```sql
-- Users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT,
  discord_id TEXT UNIQUE,
  tier TEXT DEFAULT 'free',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Vaults table
CREATE TABLE vaults (
  id SERIAL PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  balance DECIMAL(18, 8) DEFAULT 0,
  locked BOOLEAN DEFAULT FALSE,
  unlock_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Vault transactions
CREATE TABLE vault_transactions (
  id SERIAL PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  amount DECIMAL(18, 8),
  type TEXT, -- 'deposit', 'withdraw', 'lock', 'unlock'
  created_at TIMESTAMP DEFAULT NOW()
);

-- Sessions table
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  start_time TIMESTAMP DEFAULT NOW(),
  end_time TIMESTAMP,
  total_bets INTEGER DEFAULT 0,
  total_wagered DECIMAL(18, 8) DEFAULT 0,
  total_wins DECIMAL(18, 8) DEFAULT 0,
  events JSONB DEFAULT '[]'::jsonb
);

-- API keys table (encrypted)
CREATE TABLE api_keys (
  id SERIAL PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  service TEXT, -- 'openai', 'anthropic', 'custom'
  key_encrypted TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, service)
);

-- Indexes for performance
CREATE INDEX idx_users_discord ON users(discord_id);
CREATE INDEX idx_vaults_user ON vaults(user_id);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_vault_tx_user ON vault_transactions(user_id);
```

### 3. Get Connection Info

1. Go to Project Settings → API
2. Copy **URL** (e.g., `https://abc123.supabase.co`)
3. Copy **anon public** key
4. Add to your environment variables

### 4. Update Server Code

Replace in-memory storage with Supabase:

```javascript
// browser-extension/server/api.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Example: Guest auth
app.post('/api/auth/guest', async (req, res) => {
  const userId = `guest_${Date.now()}`;
  
  const { data, error } = await supabase
    .from('users')
    .insert({ id: userId, username: 'Guest', tier: 'free' })
    .select()
    .single();
  
  if (error) return res.status(500).json({ error: error.message });
  
  res.json({ 
    token: userId, 
    user: data 
  });
});
```

---

## 🔐 Discord OAuth Setup

### 1. Create Discord Application

1. Go to [discord.com/developers/applications](https://discord.com/developers/applications)
2. Click "New Application"
3. Name: `TiltGuard`
4. Click "Create"

### 2. Configure OAuth2

1. Go to OAuth2 → General
2. Add Redirect URL:
   ```
   https://your-api.render.com/api/auth/discord/callback
   ```
   or
   ```
   http://localhost:3333/api/auth/discord/callback (for testing)
   ```
3. Copy **Client ID**
4. Copy **Client Secret**

### 3. Set Scopes

- OAuth2 → URL Generator
- Scopes: `identify`, `guilds`

### 4. Update Server Code

```javascript
// Add to server/api.js
app.get('/api/auth/discord', (req, res) => {
  const redirectUri = `${process.env.API_BASE_URL}/api/auth/discord/callback`;
  const scope = 'identify guilds';
  const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}`;
  
  res.redirect(discordAuthUrl);
});

app.get('/api/auth/discord/callback', async (req, res) => {
  const { code } = req.query;
  
  // Exchange code for token
  const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID,
      client_secret: process.env.DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${process.env.API_BASE_URL}/api/auth/discord/callback`
    })
  });
  
  const tokens = await tokenResponse.json();
  
  // Get user info
  const userResponse = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${tokens.access_token}` }
  });
  
  const discordUser = await userResponse.json();
  
  // Save to database
  const { data } = await supabase
    .from('users')
    .upsert({ 
      id: `discord_${discordUser.id}`,
      discord_id: discordUser.id,
      username: discordUser.username 
    })
    .select()
    .single();
  
  // Redirect back to extension with token
  res.send(`<script>window.close(); window.opener.postMessage({ token: '${data.id}' }, '*');</script>`);
});
```

---

## 🔄 Continuous Running Checklist

### Monitoring

- [ ] Set up Uptime Robot (free pings every 5min)
  - Add monitor: `https://your-api.com/api/health`
  - Email alerts on downtime

- [ ] Enable service logs
  ```bash
  # Render: View logs in dashboard
  # Fly.io: fly logs
  # PM2: pm2 logs tiltguard-api
  ```

### Auto-Restart

- [ ] Render: Auto-restarts on crash (built-in)
- [ ] Fly.io: Auto-restarts on crash (built-in)
- [ ] PM2: `pm2 startup` ensures restart on server reboot

### Backups

- [ ] Supabase: Automatic daily backups (free tier: 7 days retention)
- [ ] Manual backup script:
  ```bash
  # Add to cron (daily at 2am)
  0 2 * * * pg_dump $SUPABASE_CONNECTION_STRING > ~/backups/tiltguard-$(date +\%Y\%m\%d).sql
  ```

---

## 🧪 Testing Production Setup

### 1. Health Check

```bash
curl https://your-api.com/api/health
# Should return: {"status":"online",...}
```

### 2. Auth Flow

```bash
# Guest login
curl -X POST https://your-api.com/api/auth/guest
# Should return: {"token":"guest_...", "user":{...}}
```

### 3. Database Connection

```bash
# Check Supabase logs in dashboard
# Run test query
SELECT COUNT(*) FROM users;
```

### 4. Extension Integration

1. Update `browser-extension/src/sidebar.ts`:
   ```typescript
   const API_BASE = 'https://your-api.com/api';
   ```
2. Rebuild extension: `pnpm build`
3. Reload in Chrome
4. Click "Continue as Guest"
5. Should see main UI load

---

## 🆘 Troubleshooting

### Server won't start

```bash
# Check logs
# Render: View in dashboard
# Fly: fly logs
# PM2: pm2 logs tiltguard-api

# Common issues:
# - Missing environment variables
# - Port already in use
# - Database connection failed
```

### CORS errors

```javascript
// Add to server/api.js
app.use(cors({
  origin: ['chrome-extension://YOUR_EXTENSION_ID', 'https://your-domain.com'],
  credentials: true
}));
```

### Database connection timeout

```javascript
// Add connection pooling
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  db: { schema: 'public' },
  auth: { persistSession: false },
  global: { 
    fetch: (...args) => fetch(...args)
  }
});
```

### Discord OAuth fails

- Check redirect URI matches exactly (no trailing slash)
- Verify Client ID/Secret are correct
- Test callback URL: `curl https://your-api.com/api/auth/discord/callback?code=test`

---

## 📊 Deployment Costs

| Option | Free Tier | Paid Tier | Best For |
|--------|-----------|-----------|----------|
| **Render** | 750hr/mo (sleeps) | $7/mo always-on | Quick start |
| **Fly.io** | 3 VMs, 3GB RAM | $1.94/mo for more | Best value |
| **Railway** | $5 credit/mo | $5/mo after | Simple billing |
| **DigitalOcean** | $200 credit (60d) | $6/mo droplet | Full control |
| **Supabase** | 500MB DB, 2GB bandwidth | $25/mo Pro | Database only |

**Recommended Setup**: Fly.io (free tier) + Supabase (free tier) = **$0/month** for moderate usage

---

## ✅ Final Checklist

Before going live:

- [ ] API deployed and responding
- [ ] Database tables created
- [ ] Environment variables set
- [ ] Discord OAuth configured
- [ ] Extension updated with production URL
- [ ] Health monitoring enabled
- [ ] Backup strategy in place
- [ ] SSL certificate active (HTTPS)
- [ ] CORS configured correctly
- [ ] Error logging enabled
- [ ] Performance tested under load
- [ ] Documentation updated

---

## 🎯 Next Steps After Deployment

1. **Monitor Performance**
   - Check response times
   - Watch database query performance
   - Monitor error rates

2. **Iterate on Features**
   - Replace remaining demo placeholders
   - Add real-time WebSocket updates
   - Integrate AI services

3. **Scale as Needed**
   - Upgrade Render to paid tier if sleeping is an issue
   - Add caching layer (Redis)
   - Implement rate limiting

4. **Security Hardening**
   - Add API key authentication
   - Implement rate limiting
   - Enable request validation
   - Add SQL injection protection

---

**You're all set!** Your server should now run continuously without manual intervention. 🚀
