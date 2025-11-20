© 2024–2025 TiltCheck Ecosystem (Created by jmenichole). All Rights Reserved.

# 6. Tool Specifications (Part 2)
This document covers two key TiltCheck modules:

1. **FreeSpinScan** — promo submission, validation, prediction  
2. **QualifyFirst** — AI-powered survey routing without screen-outs  

Both modules reduce noise, save time, and prevent user frustration in high-traffic degen communities.

---

# 6.1 FreeSpinScan — Promo & Free Spin Scanner

## 6.1.1 Purpose
Every casino Discord has the same problem:

- Users drop random free spin links  
- Mods yell: “NO TALKING IN THIS CHANNEL”  
- People submit fake or expired links  
- Half the submissions are scams  
- Nobody tags the right casino or bonus type  
- Information gets lost  
- Mods waste hours cleaning it up  

FreeSpinScan **automates the entire flow**.

---

# 6.1.2 Core Functions

### **1. Promo Submission**
User submits a link using:

/submit <url> <bonus-type> <notes>

Examples:
- “10 free spins on Buffalo King — switch GC to SC first”  
- “1SC bonus today, nerfed from 1.5”  
- “Stake promo code WORKING”  

### **2. SusLink Auto-Scan**
Immediately checks:
- redirect chain  
- domain legitimacy  
- TLD level  
- impersonation  
- patterns matching scam sites  

If risky → flagged for mod review.

### **3. Bonus Classification**
Auto-tags:
- casino  
- bonus type (SC, GC, deposit, free spin)  
- region  
- category (promo, drop, claim, event)

### **4. Mod Approval Queue**
Mods get:
- source URL  
- safety score  
- classification  
- user notes  

Commands for mods:

/approve <id>
/deny <id>
/why <id>

### **5. Auto-Posting to Correct Channel**
If approved, it automatically posts to:
- correct casino channel  
- correct bonus category  
- correct region (if applicable)

No more yelling at users.

### **6. Prediction Engine**
Even if bonuses are “random,” patterns exist.

AI models learn:
- promo drops  
- typical times  
- casino rhythms  
- user report density  
- day-of-week patterns  
- holiday spikes  
- historical bonus windows  

The bot can say:
> “High likelihood of free spins in the next 2–4 hours.”

---

# 6.1.3 Discord Commands

/submit <url> <bonus-type> <notes>
/promos
/promos pending
/promos predict
/promos recent

Mods:
/approve
/deny
/purge

---

# 6.1.4 Data Stored

- submission_id  
- url  
- casino_name  
- bonus_type  
- predicted_value  
- region  
- suslink_score  
- user_notes  
- timestamps  
- mod_review_status  

---

# 6.1.5 Integration With Other Modules

- **SusLink** for safety scanning  
- **CollectClock** for bonus value correlation  
- **Casino Trust Engine** for:
  - link reliability
  - promo consistency
  - accuracy of casino claims  

---

---

# 6.2 QualifyFirst — Survey Matching & Screen-Out Avoidance

## 6.2.1 Purpose
Traditional survey platforms waste your time:
- clicking 10–20 questions  
- only to be screened out  
- no clarity on what you’re actually qualified for  
- guessing what survey attributes matter  

QualifyFirst uses AI to **route users only to surveys they’re likely to complete**.

Users save time → platform gets completed surveys → everyone wins.

---

# 6.2.2 What QualifyFirst Is *Not*
It does **not** replace survey platforms.  
It does **not** create surveys yet (future possible).  
It does **not** pay users directly.

It is a **smart router**, not a survey generator.

---

# 6.2.3 Core Functions

### **1. Profile Modeling**
From:
- Discord behavior  
- quick onboarding questions  
- gameplay habits  
- optional demographic inputs  
- previous completions  

Builds:
- “high likelihood of qualifying for X type surveys”
- “avoid this category, too many screen-outs”

### **2. Micro Pop-Up Questions**
Simple, fast, Discord-native:

Are you comfortable with medical surveys?
Do you have pets?
Do you own a car?

These map to common screening criteria.

### **3. Real-Time Survey Matching**
Pulls available surveys from:

- affiliate networks  
- survey partnering APIs  
- offerwalls  
- user-submitted opportunities  

Ranks them by match probability:

High (75%+)
Medium (40–74%)
Low (<40%)

### **4. Screen-Out Avoidance**
Avoids surveys marked as:
- historically bad match  
- repeated screen-outs  
- wasting user time  
- pay-to-never-qualify traps  

### **5. “Smart Retry” System**
If user fails one:
- logs reason  
- recalculates profile  
- avoids similar screeners next time  

---

# 6.2.4 Discord Commands

/qualify
/surveys
/survey profile
/survey improve

---

# 6.2.5 Data Stored

- eligibility traits (opt-in)
- successful survey completions
- failed screeners
- survey payout tiers
- user behavior signals
- match probability scores

---

# 6.2.6 Ethical Guidelines

Because surveys often involve sensitive information:

- No storing anything unnecessary  
- No forcing disclosures  
- No selling data  
- No hidden profiling  
- Full transparency if user asks for data deletion  

---

# 6.2.7 Integration With Trust Engines
Mostly outbound only.

Survey behavior may impact **Degen Trust Score** if:
- user submits fake data  
- user spams low-effort answers  
- user tries to cheat systems  

---

# End of `6-tool-specs-2.md`