© 2024–2025 TiltCheck Ecosystem (Created by jmenichole). All Rights Reserved.

# 9. System Architecture Overview
TiltCheck is intentionally modular, low-cost, and founder-friendly.  
The architecture emphasizes:

- non-custodial financial flows  
- serverless compute where possible  
- predictable free-tier usage  
- simple integrations  
- clean Discord-first UI  
- lightweight data storage  
- easy scaling  
- clear trust engine interactions  

This document provides a complete overview of the system’s high-level architecture, module interactions, event flow, storage layers, and safety boundaries.

---

# 9.1 High-Level Architecture Diagram

┌────────────────────────────────────────────────────────────┐
│ Discord UI │
│ (Slash Commands, Buttons, Mod Tools, Ephemeral Messages) │
└───────────┬───────────────────────────┬────────────────────┘
▼ ▼
┌──────────────┐ ┌──────────────┐
│ Command Hub │ │ Event Router │
│ (Cloudflare) │ │ (Cloudflare) │
└───────┬──────┘ └──────┬───────┘
┌───────┼──────────────────────────┼───────────────────┐
▼ ▼ ▼ ▼
JustTheTip SusLink CollectClock FreeSpinScan
│ │ │ │
▼ ▼ ▼ ▼
Non-Custody Risk Analysis Bonus Engine Promo Validation
Wallet API Engine + Prediction + Prediction
│ │ │ │
└────────┴──────────────┬────────┴──────────────┬──────┘
▼ ▼
┌────────────────────────────────────────┐
│ Trust Engines │
│ Casino Trust + Degen Trust │
└───────────┬─────────────────────────────┘
▼
┌─────────────────────────────┐
│ Data Models + Storage │
│ SQLite / Supabase / KV Store │
└─────────────────────────────┘

---

# 9.2 Layer Breakdown (Top → Bottom)

## Layer 1: **User Interface Layer**
TiltCheck uses Discord as the primary UI:

- slash commands  
- mod tools  
- ephemeral confirmations  
- buttons  
- multi-step flows  
- DM or channel-based interactions  

Benefits:
- no frontend to maintain  
- free  
- no hosting cost  
- instant user familiarity  
- frictionless deployment  

---

## Layer 2: **Command Hub** (Cloudflare Worker Recommended)

The Command Hub handles:

- parsing slash commands  
- routing actions to modules  
- catching invalid inputs  
- rate limiting  
- permissions  
- module delegation  

It also handles outbound Discord interactions:

- ephemeral replies  
- follow-up messages  
- mod-only alerts  

---

## Layer 3: **Event Router**
A lightweight event dispatcher sending tasks to:

- JustTheTip  
- SusLink  
- CollectClock  
- FreeSpinScan  
- Tilt Engine  
- Trust Engines  
- funding intelligence agent (internal)  

Event router handles asynchronous operations like:

- scanning links  
- fetching casino pages  
- running predictions  
- checking wallet balances  
- performing swaps  
- verifying URLs  
- updating trust scores  

Cloudflare Workers + queues are ideal for this.

---

## Layer 4: **Modules (Independent Micro-Tools)**

Each module exposes:

- its own API endpoints  
- its own Discord commands  
- optional event listeners  
- optional trust engine integration  

Modules never call each other directly — only via events.  
This prevents entanglement and keeps the system modular.

---

## Layer 5: **Trust Engines**

Shared global insight layer:

1. **Casino Trust Engine**  
2. **Degen Trust Engine**

Modules feed these engines with signals; engines return:

- risk warnings  
- score summaries  
- trend patterns  
- cooldown recommendations  
- mod tools  

Trust engines unify the entire ecosystem.

---

## Layer 6: **Storage Layer**

TiltCheck supports hybrid free-tier storage:

### **Primary Options:**
- Supabase Postgres (free tier)  
- SQLite (local, Worker-compatible with D1 or LibSQL)  
- Cloudflare KV / Durable Objects  
- JSON-based snapshots (for prototypes)  

### **Storage Decisions:**

| Data Type | Storage |
|-----------|---------|
| URLs, scans | KV / SQLite |
| Casino bonus logs | Postgres or SQLite |
| User trust signals | Postgres |
| NFT identity links | SQLite |
| Promo submissions | Postgres |
| Swap attempts | KV |
| Agent funding intelligence | JSON or KV |

---

# 9.3 Financial Architecture (Non-Custodial)

**TiltCheck NEVER holds funds.**

Flow:

User Wallet → (fee deduction) → Target Wallet or Jupiter Swap

No custody means:
- no legal exposure  
- no withdrawal queues  
- no banking requirements  
- no custody risk  
- no regulatory headaches  

Fees (flat only) always go:

`fee amount → founder wallet`

before anything else happens.

---

# 9.4 Discord Architecture

### Key Channels:
- #free-spins  
- #bonus-drops  
- #collectclock  
- #casino-reviews  
- #mod-approvals  
- #bot-logs  
- #trust-signals  

### Key Permission Roles:
- Admin  
- Moderator  
- Trusted  
- Regular User  
- New User  
- High-Risk User (optional)  

---

# 9.5 Module Interaction Examples

## Example A: **User submits free spins link**

/submit <url> <bonus-type>
↓
SusLink scans
↓
FreeSpinScan classifies + queues for mod review
↓
Casino Trust Engine logs casino promo reliability
↓
Mod approves
↓
Bot posts to correct channel

---

## Example B: **User tips someone via JustTheTip**

/tip @user 1 SOL
↓
Calculate flat fee
↓
User approves transaction
↓
Blockchain processes
↓
Bot posts confirmation
↓
Degen Trust Engine logs behavioral context

---

## Example C: **User rage spins → TiltCheck detects tilt**

Aggressive chat + rapid timestamps
↓
Tilt Engine flags tilt likelihood
↓
User receives soft nudge
↓
If continued → cooldown suggestion
↓
If chosen → vault lock triggered

---

# 9.6 Security Architecture

TiltCheck ensures:

- no custody of user funds  
- no storing private keys  
- no storing sensitive data  
- minimal PII  
- NFT identity is optional  
- only hashed identifiers stored  
- all trust scores are explainable  

---

# 9.7 Scaling Model

TiltCheck is scalable because:

- workers are stateless  
- most operations are event-driven  
- storage is minimal  
- modules are independent  
- Discord handles the load  
- AI is used sparingly and cheaply  

The system expands only when needed — not preemptively.

---

# 9.8 Future Web UI (Optional)

Eventually, TiltCheck Arena can host:

- DA&D games  
- Casino dashboards  
- Trust transparency displays  
- User profiles  
- NFT minting  
- Bonus prediction graphs  

But Discord remains the primary interface until scaling demands a UI.

---

# End of `9-architecture.md`