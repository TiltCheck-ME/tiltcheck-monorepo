© 2024–2025 TiltCheck Ecosystem (Created by jmenichole). All Rights Reserved.

# 4. TiltCheck Tools Overview

TiltCheck is composed of eight primary user-facing tools and two global trust engines.  
Each tool solves a specific frustration in the degen ecosystem: tipping, swapping, scam links, bonus cycles, free spins, survey screening, community games, and tilt management.

This document provides a top-level overview of each tool — what it does, why it exists, and how it fits into the overall architecture.

---

# 4.1 JustTheTip
**Non-custodial tipping, airdrops, and micro-sends with optional swapping.**

### Purpose:
Solve the problems of:
- custodial bots losing user funds  
- swap bots running out of liquidity  
- tip bots failing to deliver  
- inconsistent fees  
- confusion about gas + platform fees  

### Core Features:
- Non-custodial wallet via Magic or user-supplied address  
- Tip users directly  
- Airdrops to many users  
- Flat fee system (founder-set)  
- Optional swap via Jupiter after fee deduction  
- No balance custody (no legal exposure)  
- Discord-first UI  
 - Real-time pricing via in-memory oracle (event driven)  
 - Hardened swap quoting: slippage & fee breakdown  
 - Failure path detection (swap.failed)  

### Why It Exists:
Degen tipping bots fail constantly.  
JustTheTip fixes the liquidity and custody problems without becoming a custodial service.

### Pricing & Swap Hardening Additions:
The module now integrates a lightweight in-memory Pricing Oracle that:
- Publishes `price.updated` events on every price change (payload includes token, oldPrice, newPrice, updatedAt, stale flag)
- Tracks update timestamps and exposes `isStale(token)`
- Applies a default TTL of 5 minutes; prices older than this are considered stale
- Supports `refreshPrice(token, fetcher)` for external integration hooks (fetcher returns Promise<number>)

Swap quotes now include:
- `slippageBps`: Maximum tolerated slippage (basis points)
- `minOutputAmount`: Minimum acceptable output after slippage tolerance
- `platformFeeBps`: Founder/platform fee applied to output
- `networkFeeLamports`: Simulated network fee (converted to SOL)
- `finalOutputAfterFees`: Output after deducting platform + network fees
- Centralized defaults provided via `swapDefaults` (`slippageBps`, `platformFeeBps`, `networkFeeLamports`) and overrideable per tip.

Events emitted by JustTheTip:
- `tip.initiated`, `tip.completed`, `tip.pending.resolved`
- `wallet.registered`, `wallet.disconnected`
- `swap.quote`, `swap.completed`, `swap.failed`
- `price.updated` (oracle service)

Failure Handling:
During execution the realized output is compared to `minOutputAmount`. If it falls below tolerance, a `swap.failed` event is published with reason `Slippage exceeded tolerance`.

These enhancements provide clearer transparency on pricing, fees, and swap reliability while enabling downstream listeners to react to stale pricing conditions or failed executions.

---

# 4.2 SusLink
**AI-powered link scanning + reputation scoring.**

### Purpose:
Protect degens from:
- scam links  
- fake promo sites  
- malicious redirects  
- phishing attempts  
- burner domains  
- impersonation  

### Core Features:
- URL pattern analysis  
- Domain reputation checks  
- Redirect chain inspection  
- Active prediction scoring  
- Optional integration with FreeSpinScan & CollectClock  

### Why It Exists:
Degen Discord servers are full of bad links.  
SusLink reduces mod overhead and protects users automatically.

---

# 4.3 CollectClock
**Daily bonus tracking, countdown timers, nerf detection, and casino reliability signals.**

### Purpose:
Fix:
- inconsistent daily bonus timers  
- hidden bonus nerfs  
- users forgetting claims  
- missing data on casino promo behavior  

### Core Features:
- Bonus countdown timers  
- User-customizable tracking  
- Network-wide bonus DB  
- Automatic nerf flagging (e.g., 1SC → 0.10SC)  
- Predictive bonus cycle modeling  
- Casino Trust Engine integration  

### Why It Exists:
Bonus cycles are chaotic.  
CollectClock brings clarity and predictive intelligence to daily claims.

---

# 4.4 FreeSpinScan
**Free spin & promo submission, validation, mod approval, prediction.**

### Purpose:
Replace:
- chaotic promo channels  
- constant “don’t chat here” mod spam  
- mismatched links  
- nonsense submissions  

### Core Features:
- `/submit <link> <bonus type> <notes>`  
- Automatic SusLink scan  
- Casino/bonus category tagging  
- Mod approval workflow  
- Auto-posting to correct channel  
- Prediction engine for future drops  

### Why It Exists:
Every casino community has a messy bonus channel.  
FreeSpinScan fixes it with structure + AI validation.

---

# 4.5 QualifyFirst
**AI-powered user targeting for paid survey routing and screen-out avoidance.**

### Purpose:
Help users reach surveys they will *actually qualify for*.  
Avoid screen-outs.  
Avoid time waste.

### Core Features:
- Behavioral profile building  
- Quick popup questions  
- Routing to high-match surveys  
- Optional integration with external survey platforms  
- Optional in-house survey creation (future)  

### Why It Exists:
Survey sites waste users’ time with screen-outs.  
QualifyFirst predicts matches before users click.

---

# 4.6 DA&D — Degens Against Decency
**An AI-powered Cards Against Humanity-style game.**

### Purpose:
Give degens a fun, social, chaotic game to play within:

- Discord  
- TiltCheck Arena  
- future web UI  

### Core Features:
- Dynamic card generation  
- Community packs  
- Voting  
- Scoring  
- Seasonal pack rotation  
- Optional casino-themed expansion  

### Why It Exists:
Every degen community needs fun between tilts.

---

# 4.7 TiltCheck Core (Tilt Detection)
**Behavior analysis + cooldown nudges + accountability tools.**

### Purpose:
Detect:
- aggressive betting patterns  
- rapid spin behavior  
- Discord chat signs of tilt  
- risky user decisions  

### Core Features:
- Vault locking  
- Cooldown suggestions  
- “Phone-a-friend” notifications  
- Accountabilibuddy double-wallet withdrawals  
- Discord-based trust score signals  

### Why It Exists:
Nobody thinks clearly on tilt.  
TiltCheck helps users slow down *without policing them*.

---

# 4.8 Funding Intelligence Layer (Agent-Only)
**The brain that finds money, support, and resources for the founder.**

### Purpose:
Support founder survival by detecting:

- grants  
- startup credits  
- cloud credits  
- accelerator applications  
- hackathons  
- dev competitions  
- bounties  
- sponsorships  

### Core Features:
- Query free tools  
- Match by project type  
- Evaluate eligibility  
- Track deadlines  
- Surface best options  
- Keep everything free-tier whenever possible  

### Why It Exists:
Solo founders need support.  
TiltCheck’s agent should constantly look for funding paths.

---

# End of `4-tools-overview.md`
