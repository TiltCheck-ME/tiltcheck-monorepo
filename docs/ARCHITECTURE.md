# TiltCheck Monorepo - Architecture & Integration Guide

## 📁 Repository Structure

```
tiltcheck-monorepo/
├── apps/                    # User-facing applications
│   ├── discord-bot/        # Discord bot for tipping, trust, and commands
│   ├── analyzer-dashboard/ # Web-based analytics dashboard
│   └── gameplay-dashboard/ # Gameplay analysis UI
│
├── browser-extension/       # TiltGuard Chrome extension
│   ├── src/                # Extension source code
│   ├── server/             # Backend API server (port 3333)
│   └── dist/               # Built extension (load in Chrome)
│
├── services/               # Backend microservices
│   ├── dashboard/         # Trust metrics dashboard (port TBD)
│   ├── user-dashboard/    # User profile & stats (port 6001)
│   ├── casino-data-api/   # Casino data collection (port 6002)
│   ├── event-router/      # Event bus for module communication
│   ├── trust-engines/     # Trust score calculation
│   ├── trust-rollup/      # Trust score aggregation
│   ├── collectclock/      # Fee collection service
│   ├── landing/           # Landing page (public docs)
│   └── qualifyfirst-api/  # Survey integration
│
├── modules/                # Core business logic modules
│   ├── justthetip/        # Tipping system
│   ├── lockvault/         # Vault management
│   ├── linkguard/         # Link safety
│   ├── freespinscan/      # Free spin detection
│   ├── tiltcheck-core/    # Core tilt detection
│   └── natural-language-parser/  # NLP utilities
│
├── packages/               # Shared libraries
│   ├── ai-service/        # AI/LLM integration
│   ├── database/          # DB clients
│   ├── discord-utils/     # Discord helpers
│   ├── email-service/     # Email sending
│   ├── grading-engine/    # Trust scoring
│   ├── identity-core/     # User identity
│   └── types/             # TypeScript types
│
└── data/                  # JSON data files (file-based DB)
    ├── casinos.json
    ├── trust-rollups.json
    ├── domain-trust-scores.json
    ├── justthetip-user-trust.json
    └── lockvault.json
```

## 🔌 Backend Services

### Active Services

| Service | Port | Purpose | Status |
|---------|------|---------|--------|
| **TiltGuard API** | 3333 | Browser extension backend | ✅ Running |
| **User Dashboard** | 6001 | User profiles & stats | 📦 Available |
| **Casino Data API** | 6002 | Casino data collection | 📦 Available |
| **Landing Page** | TBD | Public docs & landing | 📦 Available |
| **Dashboard** | TBD | Trust metrics dashboard | 📦 Available |

### Service Communication

Services use **Event Router** for inter-module communication:
- Modules publish events (e.g., `trust.score.updated`)
- Event Router distributes to subscribers
- Modules never call each other directly

## 🎯 Browser Extension Architecture

### Extension Components

```
browser-extension/
├── src/
│   ├── content.ts       # Main content script
│   ├── sidebar.ts       # UI sidebar component
│   ├── popup.ts         # Extension popup
│   └── manifest.json    # Chrome extension manifest
│
├── server/
│   └── api.js           # Backend REST API (port 3333)
│
└── dist/                # Built extension
```

### Data Flow

```
Casino Website
    ↓ (DOM monitoring)
Extension Content Script
    ↓ (creates)
Sidebar UI
    ↓ (HTTP requests)
Backend API (localhost:3333)
    ↓ (in-memory storage)
Maps: users, vaults, sessions
```

### API Endpoints

```
POST   /api/auth/guest          # Create guest session
POST   /api/auth/discord        # Discord OAuth (demo)
GET    /api/vault/:userId       # Get vault balance
POST   /api/vault/:userId/deposit  # Deposit to vault
GET    /api/dashboard/:userId   # Get user stats
GET    /api/wallet/:userId      # Get wallet info
GET    /api/premium/plans       # List premium plans
POST   /api/premium/upgrade     # Upgrade tier
GET    /api/health              # Server health
```

## 🔐 Authentication Flow

### Current State: Demo Mode

1. **Guest Mode**:
   - Click "Continue as Guest"
   - POST `/api/auth/guest`
   - Server creates `guest_TIMESTAMP` user
   - Returns token
   - Sidebar shows main content

2. **Discord OAuth (Demo)**:
   - Click "Discord Login"
   - Prompt for username
   - POST `/api/auth/discord`
   - Server creates `discord_CODE` user
   - Returns token
   - Sidebar shows main content

### Production Requirements

- [ ] Set up Discord application
- [ ] Add OAuth redirect URL
- [ ] Store tokens securely
- [ ] Implement token refresh
- [ ] Add Supabase auth integration

## 💾 Data Persistence

### Current: In-Memory

```javascript
// browser-extension/server/api.js
let users = new Map();      // Lost on restart
let vaults = new Map();
let sessions = new Map();
```

### Production: Database

**Recommended**: Supabase (PostgreSQL)

```sql
-- Tables needed
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT,
  discord_id TEXT,
  tier TEXT,
  created_at TIMESTAMP
);

CREATE TABLE vaults (
  user_id TEXT REFERENCES users(id),
  balance DECIMAL,
  locked BOOLEAN,
  unlock_at TIMESTAMP,
  transactions JSONB
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  start_time TIMESTAMP,
  total_bets INTEGER,
  total_wagered DECIMAL,
  total_wins DECIMAL,
  events JSONB
);
```

## 🔄 Demo Placeholders to Replace

###  Extension Placeholders

| Feature | Current | Production Needed |
|---------|---------|-------------------|
| Discord OAuth | Prompt for username | Real OAuth flow with Discord app |
| API Keys | LocalStorage | Encrypted storage + key management |
| Vault API | In-memory Map | Supabase/PostgreSQL table |
| Dashboard | JSON popup | Real dashboard service integration |
| Wallet | Demo data | Magic.link or Phantom integration |
| License Verification | Hardcoded domains | Real license API lookup |
| Tilt Score | Static value | Trust-rollup service integration |
| P/L Graph | Canvas placeholder | Real-time data from sessions |

### Backend Placeholders

| Service | Current | Production Needed |
|---------|---------|-------------------|
| Data storage | JSON files in `/data/` | PostgreSQL/Supabase |
| Authentication | Simple tokens | JWT + refresh tokens |
| Session management | In-memory | Redis or database |
| Event Router | In-process | Redis Pub/Sub or RabbitMQ |
| Trust scoring | File-based | Real-time calculation service |
| Fee collection | Not integrated | CollectClock service live |

## 🚀 Production Deployment Steps

### 1. Deploy Backend API

```bash
# Option A: Render.com
1. Create new Web Service
2. Connect GitHub repo
3. Set build command: cd browser-extension/server && npm install
4. Set start command: node api.js
5. Set environment: PORT=3333

# Option B: Fly.io
1. Install flyctl
2. fly launch
3. Edit fly.toml
4. fly deploy
```

### 2. Update Extension API URL

```typescript
// browser-extension/src/sidebar.ts
const API_BASE = 'https://your-api.render.com/api';
// or
const API_BASE = 'https://your-api.fly.dev/api';
```

### 3. Set Up Database

```bash
# Supabase
1. Create project at supabase.com
2. Run SQL schema from above
3. Get connection string
4. Update server/api.js to use Supabase client
```

### 4. Configure Discord OAuth

```bash
1. Go to discord.com/developers
2. Create New Application
3. OAuth2 → Add redirect: https://your-api.com/auth/discord/callback
4. Copy Client ID & Secret
5. Add to environment variables
```

### 5. Continuous Running

```bash
# Use process manager (production)
npm install -g pm2
pm2 start server/api.js --name tiltguard-api
pm2 save
pm2 startup

# Or use systemd (Linux)
sudo nano /etc/systemd/system/tiltguard.service
sudo systemctl enable tiltguard
sudo systemctl start tiltguard
```

## 🛠️ Development Workflow

### Start All Services

```bash
# Terminal 1: Extension API
cd browser-extension
nohup node server/api.js > server.log 2>&1 &

# Terminal 2: User Dashboard (optional)
cd services/user-dashboard
pnpm dev

# Terminal 3: Extension build (watch mode)
cd browser-extension
pnpm watch
```

### Check Service Status

```bash
# Check running services
lsof -i :3333   # TiltGuard API
lsof -i :6001   # User Dashboard
lsof -i :6002   # Casino Data API

# Test APIs
curl http://localhost:3333/api/health
curl http://localhost:6001/api/health
```

## 📝 Common Issues & Solutions

### "Domain doesn't work"

**Issue**: Extension buttons show "endpoint not found"

**Solution**:
1. Check API server is running: `curl http://localhost:3333/api/health`
2. If not running: `cd browser-extension && node server/api.js`
3. Check API_BASE in sidebar.ts matches server port
4. Rebuild extension: `pnpm build`
5. Reload extension in Chrome

### "Cannot find module"

**Issue**: Server fails to start

**Solution**:
```bash
cd browser-extension
pnpm install
node server/api.js
```

### "Port already in use"

**Issue**: Can't start server on port 3333

**Solution**:
```bash
# Kill existing process
lsof -ti:3333 | xargs kill -9

# Or change port
# Edit server/api.js: const PORT = 3334
# Edit sidebar.ts: const API_BASE = 'http://localhost:3334/api'
```

### "Extension not updating"

**Issue**: Changes not appearing

**Solution**:
```bash
# Full rebuild
cd browser-extension
rm -rf dist
pnpm build

# In Chrome
1. Go to chrome://extensions/
2. Remove TiltGuard
3. Click "Load unpacked"
4. Select dist/ folder again
```

## 📚 Documentation Locations

- **This File**: Architecture & integration overview
- **SETUP_COMPLETE.md**: Extension setup summary
- **API_INTEGRATION.md**: API endpoints reference
- **BACKEND_TESTING.md**: Testing checklist
- **QUICK_REFERENCE.md**: Quick commands
- **docs/tiltcheck/**: Core TiltCheck documentation
  - `12-apis.md`: API specifications
  - `18-dashboard-design.md`: Dashboard architecture
  - `11-integration-points.md`: Module integration

## 🎯 Next Steps Priority

1. ✅ **Extension UI Redesigned** - Professional, metrics-first layout
2. 📝 **Documentation Complete** - This file + architecture guides
3. 🔄 **Production Backend** - Deploy API server to Render/Fly.io
4. 💾 **Database Integration** - Replace in-memory with Supabase
5. 🔐 **Real Discord OAuth** - Set up OAuth app and flow
6. 🔌 **Service Integration** - Connect to trust-rollup, dashboard services
7. 📊 **Real-time Data** - WebSocket for live updates
8. 🤖 **AI Integration** - Connect OpenAI/Anthropic with saved API keys

## 🆘 Getting Help

**Can't find something?**
- Use file search: `grep -r "keyword" services/`
- Check service README: `cat services/SERVICE_NAME/README.md`
- Review docs: `ls docs/tiltcheck/`

**Service not working?**
- Check logs: `tail -f browser-extension/server.log`
- Verify port: `lsof -i :PORT`
- Test endpoint: `curl http://localhost:PORT/api/health`

**Need to trace a feature?**
- Extension → `browser-extension/src/sidebar.ts`
- API → `browser-extension/server/api.js`
- Service → `services/SERVICE_NAME/src/index.ts`
- Module → `modules/MODULE_NAME/`
