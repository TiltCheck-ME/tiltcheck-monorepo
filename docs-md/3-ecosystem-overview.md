© 2024–2025 TiltCheck Ecosystem (Created by jmenichole). All Rights Reserved.

# 3. TiltCheck Ecosystem Overview

TiltCheck is a modular suite of degen-focused tools designed to make online casino communities safer, smarter, and more transparent without killing the fun.  
Each module is independent but interoperable through shared trust engines, Discord integrations, and lightweight APIs.

The ecosystem is intentionally **non-custodial**, **serverless-friendly**, and **founder-friendly**, optimized for small incremental development and extremely low operational cost.

---

# 3.1 Core Design Principles

### **1. Modularity**
Every tool works on its own.  
No module depends on all others.  
Everything communicates through events, not rigid dependencies.

### **2. Predictive Intelligence**
TiltCheck uses AI to detect:

- bonus patterns  
- fairness mismatches  
- tilt indicators  
- scam behaviors  
- community sentiment  
- casino stability trends  

Modules feed signals into trust engines.

### **3. Non-Custodial Financial Handling**
No user funds ever touch TiltCheck.

Wallets are external, initialized via Magic or user-submitted addresses.  
Fees are flat, transparent, and always taken before execution.

### **4. Free-Tier + Serverless Friendly**
The ecosystem prefers:

- Supabase free tier  
- Cloudflare Workers  
- SQLite  
- KV stores  
- Static hosting  
- API-only logic  

TiltCheck stays lean to protect the founder pace and avoid unexpected costs.

### **5. Built for Real Degen Behavior**
The tools reflect how degens *actually behave*, not theoretical ideal users.

This includes:

- rage spins  
- bonus-chasing  
- scam link exposure  
- swapping tiny amounts  
- tipping impulsively  
- misreading bonus cycles  
- trusting the wrong casinos  
- acting shady (sometimes)

TiltCheck does not try to “fix” degens — it tries to make them safer and smarter.

---

# 3.2 Major Modules in the Ecosystem

The ecosystem consists of eight major tools and two trust engines:

1. **JustTheTip**  
   → non-custodial tipping + optional swapping via Jupiter

2. **SusLink**  
   → link scanning, risk scoring, scam detection

3. **CollectClock**  
   → daily bonus tracking, countdown timers, nerf detection

4. **FreeSpinScan**  
   → free spin / promo submission & validation, mod approval, prediction

5. **QualifyFirst**  
   → survey routing, screening, profile-based matching

6. **DA&D – Degens Against Decency**  
   → AI-powered card game for Discord

7. **TiltCheck Core**  
   → tilt detection, vault locks, accountabilibuddy support

8. **Funding Intelligence Layer** (Agent-only)  
   → detects grants, hackathons, credits, startup programs

Plus the two central scoring engines:

9. **Casino Trust Engine**  
   → fairness, payout delays, user reports, bonus reliability

10. **Degen Trust Engine**  
   → behavior-based reputation for users across the ecosystem

---

# 3.3 How Modules Interact (High-Level)

© 2024–2025 TiltCheck Ecosystem (Created by jmenichole). All Rights Reserved.

# 3. TiltCheck Ecosystem Overview

TiltCheck is a modular suite of degen-focused tools designed to make online casino communities safer, smarter, and more transparent without killing the fun.  
Each module is independent but interoperable through shared trust engines, Discord integrations, and lightweight APIs.

The ecosystem is intentionally **non-custodial**, **serverless-friendly**, and **founder-friendly**, optimized for small incremental development and extremely low operational cost.

---

# 3.1 Core Design Principles

### **1. Modularity**
Every tool works on its own.  
No module depends on all others.  
Everything communicates through events, not rigid dependencies.

### **2. Predictive Intelligence**
TiltCheck uses AI to detect:

- bonus patterns  
- fairness mismatches  
- tilt indicators  
- scam behaviors  
- community sentiment  
- casino stability trends  

Modules feed signals into trust engines.

### **3. Non-Custodial Financial Handling**
No user funds ever touch TiltCheck.

Wallets are external, initialized via Magic or user-submitted addresses.  
Fees are flat, transparent, and always taken before execution.

### **4. Free-Tier + Serverless Friendly**
The ecosystem prefers:

- Supabase free tier  
- Cloudflare Workers  
- SQLite  
- KV stores  
- Static hosting  
- API-only logic  

TiltCheck stays lean to protect the founder pace and avoid unexpected costs.

### **5. Built for Real Degen Behavior**
The tools reflect how degens *actually behave*, not theoretical ideal users.

This includes:

- rage spins  
- bonus-chasing  
- scam link exposure  
- swapping tiny amounts  
- tipping impulsively  
- misreading bonus cycles  
- trusting the wrong casinos  
- acting shady (sometimes)

TiltCheck does not try to “fix” degens — it tries to make them safer and smarter.

---

# 3.2 Major Modules in the Ecosystem

The ecosystem consists of eight major tools and two trust engines:

1. **JustTheTip**  
   → non-custodial tipping + optional swapping via Jupiter

2. **SusLink**  
   → link scanning, risk scoring, scam detection

3. **CollectClock**  
   → daily bonus tracking, countdown timers, nerf detection

4. **FreeSpinScan**  
   → free spin / promo submission & validation, mod approval, prediction

5. **QualifyFirst**  
   → survey routing, screening, profile-based matching

6. **DA&D – Degens Against Decency**  
   → AI-powered card game for Discord

7. **TiltCheck Core**  
   → tilt detection, vault locks, accountabilibuddy support

8. **Funding Intelligence Layer** (Agent-only)  
   → detects grants, hackathons, credits, startup programs

Plus the two central scoring engines:

9. **Casino Trust Engine**  
   → fairness, payout delays, user reports, bonus reliability

10. **Degen Trust Engine**  
   → behavior-based reputation for users across the ecosystem

---

# 3.3 How Modules Interact (High-Level)

┌─────────────────────┐
│ Discord UI │
└───────────┬─────────┘
▼
┌─────────────────────┐
│ Command Router │
└───────────┬─────────┘
┌───┼──────────┬───────┐
▼ ▼ ▼ ▼
JustTheTip SusLink CollectClock FreeSpinScan
│ │ │ │
▼ ▼ ▼ ▼
Swap API | Bonus Cycles Promo DB
│ │ │ │
▼ ▼ ▼ ▼
┌────────────── Trust Engines ──────────────┐
│ Casino Trust + Degen Trust │
└───────────────────────────────────────────┘


Each module reports signals to the trust engines, which then inform:

- user warnings  
- cooldown actions  
- casino reliability  
- bonus predictions  
- mod tools  
- transparency dashboards  

---

# 3.4 The Role of Discord in the Ecosystem

Discord is the **primary UI layer**.

All tools are accessible through:

- slash commands  
- buttons  
- ephemeral confirmations  
- mod-only channels  
- public community channels  

This eliminates the need for expensive web UIs early on.

Eventually, a dashboard can be layered on top — but Discord remains the command hub.

---

# 3.5 The Role of the Copilot Agent

The agent functions as your:

- co-founder  
- technical strategist  
- reasoning engine  
- architecture advisor  
- brainstorming partner  
- grant finder  
- project assistant  

It uses this documentation as a **mental map** of everything TiltCheck includes.

It must always be able to:

- reference modules  
- understand interactions  
- ask clarifying questions  
- reason about constraints  
- propose upgrades  
- draft missing components  
- avoid hallucinating unsupported features  

---

# 3.6 Ecosystem Goals

TiltCheck aims to create:

- safer casino participation  
- transparent promotional ecosystems  
- smarter degen behavior  
- fairer tools  
- honest casino scoring  
- community accountability  
- fun gamified experiences  
- AI-driven insights  
- minimal financial risk  
- low-cost infrastructure  
- free-tier survivability  

In short:

> Make degen life easier, safer, and more fun — without lying about what the culture actually is.

---

# End of `3-ecosystem-overview.md`
