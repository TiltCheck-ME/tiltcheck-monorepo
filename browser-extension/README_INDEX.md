# TiltCheck Extension - Documentation Index

Welcome! This is your central hub for all TiltCheck browser extension documentation.

---

## 🚀 Quick Start (Pick One)

**New to the project?** → Start with **STATUS_SUMMARY.md**  
**Need to fix something?** → Jump to **TROUBLESHOOTING.md**  
**Ready to deploy?** → Follow **PRODUCTION_DEPLOYMENT.md**  
**Want to understand the system?** → Read **ARCHITECTURE.md**  
**Planning next features?** → See **DEMO_PLACEHOLDERS.md**

---

## 📚 All Documentation

### 1. **STATUS_SUMMARY.md** ⭐ Start Here
**What**: High-level overview of current state  
**When to use**: First time setup, status check, team onboarding  
**Key info**:
- ✅ What's working now (backend, UI, docs)
- ❌ What's still demo/placeholder (53 items)
- 📂 Key files reference
- 🚀 Daily workflow commands
- 📊 Completion status (40% functional)

**Quick links inside**:
- Quick diagnosis checklist
- Daily commands
- Recent UI changes
- Next steps priority

---

### 2. **ARCHITECTURE.md** 🏗️ System Design
**What**: Complete system architecture and integration guide  
**When to use**: Understanding how services connect, finding where code lives, onboarding new developers  
**Key info**:
- 📁 Repository structure (apps, services, modules, packages)
- 🔌 Backend services map (ports, purposes, status)
- 🎯 Browser extension architecture (components, data flow)
- 🔐 Authentication flow (guest, Discord OAuth)
- 💾 Data persistence strategy (in-memory → database)
- 🔄 Demo placeholders overview
- 📝 Common issues & solutions

**Sections**:
1. Repository Structure
2. Backend Services Table
3. Service Communication (Event Router)
4. Browser Extension Architecture
5. Data Flow Diagram
6. API Endpoints Reference
7. Authentication Flow
8. Data Persistence (current vs. production)
9. Demo Placeholders Summary
10. Production Deployment Steps
11. Development Workflow
12. Common Issues & Solutions
13. Documentation Locations
14. Next Steps Priority

---

### 3. **PRODUCTION_DEPLOYMENT.md** 🚢 Deploy Guide
**What**: Step-by-step production deployment for continuous running  
**When to use**: Deploying to Render/Fly.io/VPS, setting up database, configuring Discord OAuth, enabling always-on server  
**Key info**:
- 🚀 3 deployment options (Render, Fly.io, VPS)
- 💾 Supabase database setup with SQL schema
- 🔐 Discord OAuth configuration
- 🔄 Continuous running with PM2
- 🧪 Production testing checklist
- 💰 Cost comparison table

**Deployment Options**:
- **Option A: Render.com** (easiest, free tier sleeps)
- **Option B: Fly.io** (best performance, 3 free VMs)
- **Option C: VPS with PM2** (full control, cheapest long-term)

**Includes**:
- Database schema (SQL)
- Environment variables
- Discord app setup
- Nginx reverse proxy config
- SSL with Certbot
- Monitoring setup
- Auto-restart configuration

---

### 4. **DEMO_PLACEHOLDERS.md** 📋 Replacement Roadmap
**What**: Complete inventory of 53 demo features to replace with production code  
**When to use**: Planning sprints, prioritizing work, tracking progress, understanding what's fake vs. real  
**Key info**:
- 📊 Summary table (53 total, 6 complete, 47 remaining)
- 🔌 18 browser extension placeholders
- 🖥️ 12 backend API placeholders
- 🧩 8 service placeholders
- 💾 5 database migration items
- 🔐 6 auth/security items
- 🤖 4 AI integration items

**8-Week Roadmap**:
- **Phase 1** (Week 1-2): Critical Infrastructure (database, auth)
- **Phase 2** (Week 3-4): Core Features (scoring, sessions)
- **Phase 3** (Week 5-6): Premium & Payments (Stripe, wallet)
- **Phase 4** (Week 7-8): Polish & Security (encryption, CORS)
- **Phase 5** (Week 9+): Advanced Features (WebSocket, AI)

**Priority Levels**:
- 🔴 HIGH: Blocks production deployment (19 items)
- 🟡 MEDIUM: Improves functionality (20 items)
- 🟢 LOW: Nice to have (8 items)

---

### 5. **TROUBLESHOOTING.md** 🔧 Debug Guide
**What**: Solutions for "domain doesn't work" and other common issues  
**When to use**: Server not responding, extension errors, port conflicts, CORS issues, production domain problems  
**Key info**:
- 🔍 Quick diagnosis checklist (4 steps)
- 🛠️ 9 common issues with fixes
- 🧪 Testing workflow
- 📊 Diagnostic commands
- 🆘 Reset everything (nuclear option)

**Common Issues Covered**:
1. Server not running
2. Port already in use
3. Server crashed
4. Wrong API base URL
5. CORS error
6. Extension not loading
7. Extension errors
8. Firewall blocking port
9. Production domain not working

**Quick Diagnosis**:
```bash
# Copy-paste status check
lsof -i :3333  # Server running?
curl http://localhost:3333/api/health  # API responding?
grep "API_BASE" browser-extension/src/sidebar.ts  # Correct URL?
```

---

### 6. **API_INTEGRATION.md** 📡 API Reference
**What**: Complete API endpoint documentation  
**When to use**: Making API calls, understanding request/response formats, debugging integration  
**Key info**:
- 🔗 Base URL: `http://localhost:3333/api`
- 🔐 Authentication endpoints
- 💰 Vault endpoints
- 📊 Dashboard/wallet endpoints
- ⭐ Premium endpoints
- 🔍 Session endpoints

**All Endpoints**:
- POST `/api/auth/guest` - Create guest session
- POST `/api/auth/discord` - Discord OAuth login
- GET `/api/vault/:userId` - Get vault balance
- POST `/api/vault/:userId/deposit` - Deposit to vault
- POST `/api/vault/:userId/withdraw` - Withdraw from vault
- POST `/api/vault/:userId/lock` - Lock vault
- GET `/api/dashboard/:userId` - Get user stats
- GET `/api/wallet/:userId` - Get wallet info
- GET `/api/premium/plans` - List premium plans
- POST `/api/premium/upgrade` - Upgrade tier
- POST `/api/session` - Create session
- GET `/api/session/:sessionId` - Get session data
- GET `/api/health` - Server health

---

### 7. **QUICK_REFERENCE.md** ⚡ Command Cheatsheet
**What**: Daily commands for development  
**When to use**: Starting work, building, testing, deploying  
**Key info**:
- 🏗️ Build commands
- 🚀 Server commands
- 🧪 Testing commands
- 🔍 Debug commands
- 📦 Deployment commands

**Daily Workflow**:
```bash
# Start development
cd browser-extension
node server/api.js  # Terminal 1
pnpm watch          # Terminal 2

# Test changes
pnpm build
curl http://localhost:3333/api/health

# Deploy
# (See PRODUCTION_DEPLOYMENT.md)
```

---

### 8. **SETUP_COMPLETE.md** ✅ Setup Summary
**What**: Extension setup completion checklist  
**When to use**: Verifying initial setup, confirming backend integration  
**Key info**:
- ✅ Backend API running
- ✅ Extension making real API calls
- ✅ Authentication working
- ✅ Vault deposits functional
- ✅ Dashboard/wallet/premium integrated

---

## 🗺️ Documentation Map

```
START HERE
    ↓
STATUS_SUMMARY.md (What's working? What's next?)
    ├─→ ARCHITECTURE.md (How does it work?)
    │       ├─→ Service communication
    │       ├─→ Data flow
    │       └─→ File structure
    │
    ├─→ PRODUCTION_DEPLOYMENT.md (How to deploy?)
    │       ├─→ Render.com setup
    │       ├─→ Fly.io setup
    │       ├─→ VPS + PM2 setup
    │       ├─→ Supabase database
    │       └─→ Discord OAuth
    │
    ├─→ DEMO_PLACEHOLDERS.md (What to build next?)
    │       ├─→ 53-item inventory
    │       ├─→ 8-week roadmap
    │       └─→ Priority levels
    │
    └─→ TROUBLESHOOTING.md (Something broken?)
            ├─→ Quick diagnosis
            ├─→ 9 common issues
            └─→ Testing workflow

REFERENCE DOCS
    ├─→ API_INTEGRATION.md (API endpoints)
    ├─→ QUICK_REFERENCE.md (Daily commands)
    └─→ SETUP_COMPLETE.md (Setup checklist)
```

---

## 📂 File Locations

```
tiltcheck-monorepo/
├── ARCHITECTURE.md                    # Root-level system architecture
├── DEMO_PLACEHOLDERS.md               # Root-level placeholder inventory
│
└── browser-extension/
    ├── STATUS_SUMMARY.md              # Quick status overview ⭐
    ├── PRODUCTION_DEPLOYMENT.md       # Deploy guide
    ├── TROUBLESHOOTING.md             # Debug guide
    ├── API_INTEGRATION.md             # API reference
    ├── QUICK_REFERENCE.md             # Command cheatsheet
    ├── SETUP_COMPLETE.md              # Setup summary
    │
    ├── src/
    │   ├── sidebar.ts                 # Main UI (redesigned)
    │   ├── content.ts                 # Casino page injection
    │   └── manifest.json              # Extension config
    │
    ├── server/
    │   └── api.js                     # Backend API (port 3333)
    │
    └── dist/                          # Built extension (load in Chrome)
```

---

## 🎯 Use Cases

### "I'm new to this project"
1. Read **STATUS_SUMMARY.md** (5 min)
2. Skim **ARCHITECTURE.md** (10 min)
3. Follow **Quick Start** in STATUS_SUMMARY.md
4. Reference **TROUBLESHOOTING.md** if stuck

### "I need to fix an issue"
1. **TROUBLESHOOTING.md** → Quick Diagnosis Checklist
2. Find your issue in "Common Issues & Fixes"
3. Run diagnostic commands
4. Test with workflow section

### "I want to deploy to production"
1. **PRODUCTION_DEPLOYMENT.md** → Choose deployment option
2. Follow step-by-step guide (Render/Fly.io/VPS)
3. Set up Supabase database
4. Configure Discord OAuth
5. Test with Production Checklist
6. Monitor with Uptime Robot

### "I'm planning next sprint"
1. **DEMO_PLACEHOLDERS.md** → Summary table
2. Review 8-week roadmap
3. Pick items from Phase 1 (Critical Infrastructure)
4. Check priority levels (🔴 HIGH first)
5. Update progress as you complete items

### "I need to understand the architecture"
1. **ARCHITECTURE.md** → Repository Structure
2. Review Backend Services table
3. Trace data flow diagram
4. Check service communication (Event Router)
5. Understand current vs. production storage

### "I'm making API calls"
1. **API_INTEGRATION.md** → Find endpoint
2. Copy request format
3. Check response schema
4. Test with `curl` examples
5. Reference **TROUBLESHOOTING.md** for CORS issues

### "I need a quick command"
1. **QUICK_REFERENCE.md** → Find command category
2. Copy-paste command
3. Modify parameters as needed

---

## 🔄 Documentation Updates

### When to Update

**Update STATUS_SUMMARY.md** when:
- Major features complete
- Deployment status changes
- Placeholder percentage changes

**Update ARCHITECTURE.md** when:
- New services added
- Integration points change
- File structure reorganized

**Update DEMO_PLACEHOLDERS.md** when:
- Placeholder replaced with live code
- New placeholder identified
- Roadmap phases shift

**Update TROUBLESHOOTING.md** when:
- New common issue discovered
- New diagnostic command created
- Fix solution validated

**Update API_INTEGRATION.md** when:
- New endpoint added
- Request/response format changes
- Authentication method changes

**Keep docs in sync** to avoid confusion!

---

## 📞 Support Flow

```
Issue?
  ↓
Check TROUBLESHOOTING.md
  ↓ (not found)
Check ARCHITECTURE.md for component
  ↓ (still stuck)
Check API_INTEGRATION.md for endpoint docs
  ↓ (still stuck)
Review DEMO_PLACEHOLDERS.md (is it fake data?)
  ↓ (still stuck)
Collect debug info (TROUBLESHOOTING.md → Debug Info section)
  ↓
Ask for help with context
```

---

## ✅ Documentation Checklist

Before considering docs "complete":

- [x] STATUS_SUMMARY.md - Quick overview ✅
- [x] ARCHITECTURE.md - System design ✅
- [x] PRODUCTION_DEPLOYMENT.md - Deploy guide ✅
- [x] DEMO_PLACEHOLDERS.md - Placeholder inventory ✅
- [x] TROUBLESHOOTING.md - Debug guide ✅
- [x] API_INTEGRATION.md - API reference ✅
- [x] QUICK_REFERENCE.md - Command cheatsheet ✅
- [x] SETUP_COMPLETE.md - Setup summary ✅
- [x] README_INDEX.md - This file ✅

**All docs complete!** 🎉

---

## 🎓 Learning Path

**Beginner** (Never seen this before):
1. STATUS_SUMMARY.md → "What's Working Now"
2. QUICK_REFERENCE.md → "Daily Workflow Commands"
3. TROUBLESHOOTING.md → Run Quick Diagnosis

**Intermediate** (Want to contribute):
1. ARCHITECTURE.md → Full read-through
2. DEMO_PLACEHOLDERS.md → Pick items from Phase 1
3. API_INTEGRATION.md → Understand endpoints

**Advanced** (Ready to deploy):
1. PRODUCTION_DEPLOYMENT.md → Choose platform
2. ARCHITECTURE.md → Production sections
3. TROUBLESHOOTING.md → Production issues

---

## 🚀 Ready to Start?

**Choose your path**:

- 🆕 **New user?** → Read **STATUS_SUMMARY.md** first
- 🔧 **Fixing a bug?** → Go to **TROUBLESHOOTING.md**
- 🚢 **Deploying?** → Follow **PRODUCTION_DEPLOYMENT.md**
- 🏗️ **Building features?** → Review **DEMO_PLACEHOLDERS.md**
- 📚 **Learning the system?** → Study **ARCHITECTURE.md**

---

**Last Updated**: 2025-01-15  
**Maintained by**: jmenichole  
**Questions?** All answers are in the docs above. 📖
