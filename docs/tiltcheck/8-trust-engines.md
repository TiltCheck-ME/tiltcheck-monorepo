© 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-12

# 8. Trust Engines Overview
The TiltCheck ecosystem relies on two global trust engines that power safety, fairness, community transparency, and predictive insights:

1. **Casino Trust Engine**  
2. **Degen Trust Engine**

These engines are not moral systems — they’re **signal processors**.  
They take messy degen behavior and messy casino behavior and translate it into:

- risk signals  
- trust scores  
- warnings  
- nudges  
- moderator insights  
- predictive modeling  

Every module in TiltCheck can *report to* or *pull from* the trust engines.

---

# 8.1 Casino Trust Engine

## 8.1.1 Purpose
Casinos can behave badly — silently.  
Users are left to guess if:

- payouts are delayed  
- RTP is inconsistent  
- bonuses are nerfed  
- free spins stop  
- support becomes hostile  
- verification gets weaponized  
- seeds mismatch expected fairness  

The Casino Trust Engine turns these patterns into measurable, explainable signals.

---

# 8.1.2 Inputs Into the Casino Trust Engine

### **1. RTP/Fairness Mismatch (Live Monitoring)**
When users use TiltCheck’s pop-out browser or screen-sharing view:

- AI observes spin results  
- compares them to stated RTP or house edge  
- catches mismatches  
- logs when casino refuses to unhash seeds  
- detects “pump then rig” patterns  

### **2. Payout Delays**
Users can report:
- time since cashout  
- promised time vs actual  
- support responses  
- payout blocks without reason  

### **3. Bonus Reliability**
Collected from CollectClock:
- bonus nerfs  
- day-of-week patterns  
- region inconsistencies  
- false advertising  
- “1SC → 0.10SC for no reason” cycles  

### **4. FreeSpinScan Signals**
- invalid links  
- mismatched bonuses  
- repeated expired promos  
- casinos posting misleading values  

### **5. User-Based Casino Reviews (Weighted)**
Users can leave reviews, weighted by relevance:
- **Good reviews:**  
  - “Payout stuck 7 days past promised window.”  
  - “Support refused fairness audit.”  
  - “Region ban not respected.”  

- **Bad reviews:**  
  - “I never win here.”  
  - “Slots are rigged.”  
  - “They didn’t give me random bonus.”  
  - “Host didn’t give me an extra tip.”  

Noise is filtered out.

### **6. Regulatory Compliance Signals**
TiltCheck optionally integrates:
- banned states  
- restricted regions  
- known penalties  
- compliance requirements  
- jurisdiction issues  

Casinos can *improve their score* by:
- offering transparency  
- providing public API access  
- respecting local rules  
- reducing user complaints  

### **7. Support Behavior**
Patterns like:
- blocking users  
- refusing audits  
- abusive support staff  
- inconsistent enforcement  
- ignoring payout tickets  

All influence trust.

---

# 8.1.3 Casino Trust Scoring Model (High-Level)

Score components:

30% – Fairness consistency (AI-verified)
20% – Payout reliability
15% – Bonus stability
15% – User weighted reports
10% – FreeSpinScan validation accuracy
5% – Regulatory compliance
5% – Support quality patterns

The score is *explained*, not hidden.

Casino dashboards may show:

- “Frequent bonus nerfs detected”
- “Unverified fairness seeds on 12 sessions”
- “Payout delays increasing last 30 days”
- “Users report aggressive KYC behavior”

---

---

# 8.2 Degen Trust Engine

## 8.2.1 Purpose
Degens are… degens.  
Some are great.  
Some are chaos.  
Some are scammers.  
Some are annoying but harmless.

TiltCheck builds a **fair, understandable, non-punitive** user reputation system.

Trust score does **not** judge character — it tracks behavior patterns.

---

# 8.2.2 What Degen Trust Score Is *Not*
- Not a moral score  
- Not an addiction assessment  
- Not a ban meter  
- Not a surveillance system  

It exists to make servers safer and reduce scams.

---

# 8.2.3 Inputs Into Degen Trust Engine

### **1. Tilt Indicators**
From TiltCheck Core:
- rapid aggressive messages  
- cooldown usage  
- vault locks  
- phone-a-friend usage  
- rage spins (user-submitted signals)  

These lower trust *temporarily*.

---

### **2. Behavior & Chat Patterns**
Signals:
- repeated begging for loans  
- excessive tagging  
- insults  
- spam  
- misinformation  
- ignoring rules repeatedly  

These are weighted lightly.

---

### **3. Verified Scams**
If mods confirm:
- crypto loan scams  
- fake giveaways  
- doxxing  
- impersonation  

User trust drops sharply.

Note:  
If a user falsely accuses someone of scamming → both lose points to discourage weaponized reporting.

---

### **4. Accountabilibuddy Data**
Positive:
- uses accountability wallets  
- accepts cooldowns  
- does smart withdrawals  

Negative:
- bypass attempts  
- risky withdrawal timing  

---

### **5. Community Reports (Weighted)**
TiltCheck filters noise:
- “They’re annoying” → ignored  
- “They scammed me” → requires evidence  
- “They ghosted a loan” → both lose some trust  

Reason:  
Loaning degens crypto is inherently risky — both participants share responsibility.

---

### **6. NFT-Based Identity Link**
User mints a TiltCheck NFT:
- binds Discord → wallet → trust profile  
- enables cross-server reputation  
- portable identity  

No personal data needed.

---

# 8.2.4 Trust Score Output

Users are rated on a simple scale:

- **Very High (95–100)**  
- **High (80–94)**  
- **Neutral (60–79)**  
- **Low (40–59)**  
- **High Risk (<40)**  

Trust score affects:
- warnings  
- cooldown recommendations  
- access to certain features  
- swapping limits  
- moderator visibility  

---

# 8.2.5 Example Trust Engine Logic

If: rapid chat + known tilt session + cooldown ignored
Then: surface soft warning
If: scam confirmed + verified logs
Then: lower trust sharply

If: steady behavior + good reports + accountability use
Then: raise trust over time

If: bonus scamming or fake links
Then: restrict promo posting privileges


---

# 8.2.6 Privacy & Safety Rules

- No storing sensitive personal information  
- No diagnosing users  
- No weaponizing trust scores  
- No mod access to private data  
- Users can request trust score explanation  
- Scores recover naturally over time  

---

# 8.3 Implementation Status

## Current Implementation (v0.1.0)

The Trust Engines service is now live with the following features:

### Casino Trust Engine ✅
- **Weighted 7-category scoring** (0-100 scale)
  - Fairness (30%), Payout Speed (20%), Bonus Terms (15%), User Reports (15%)
  - Freespin Value (10%), Compliance (5%), Support Quality (5%)
- **Event handlers**:
  - `link.flagged` → Reduces fairness/compliance based on severity
  - `bonus.nerf.detected` → Reduces bonusTerms proportional to drop %
  - `casino.rollup.completed` → Updates fairness/payout from Trust Rollup
  - `domain.rollup.completed` → Updates compliance/support from external data
- **APIs**: `getCasinoScore()`, `getCasinoBreakdown()`, `explainCasinoScore()`
- **Persistence**: JSON storage at `data/casino-trust.json`

### Degen Trust Engine ✅
- **5-level classification** (very-high → high-risk)
  - Base score starts at 70
  - Tilt indicators: -5 each (max -25)
  - Scam flags: -20 each (max -40)
  - Accountability bonus: +10 each (max +15)
  - Community reports: variable impact
- **Event handlers**:
  - `tip.completed` → Tracks healthy social behavior
  - `tilt.detected` → Records tilt episodes
  - `cooldown.violated` → Penalizes impulsive behavior
  - `scam.reported` → Hard penalty for malicious activity
  - `accountability.success` → Rewards recovery/transparency
- **Recovery mechanism**: Tilt indicators decay 0.5 points per hour
- **APIs**: `getDegenScore()`, `getDegenBreakdown()`, `explainDegenScore()`
- **Persistence**: JSON storage at `data/degen-trust.json`

### Discord Integration ✅
Users interact with trust outputs through the live TiltCheck bot surface:
- `/casino <name>` - Casino trust and fairness lookup
- `/reputation [@user or platform]` - User/platform reputation read
- `/scan <url>` - Scam and trust-adjacent link risk check

### Future Enhancements 🚧
- RTP/Fairness live monitoring (requires screen-sharing integration)
- Payout speed tracking (requires payment processor integration)
- Advanced scam detection patterns
- Cross-server reputation portability
- Web dashboard for casino comparisons
- Trust score appeals process
- Community-driven weight adjustments

See `services/trust-engines/README.md` for usage documentation.

---

# End of `8-trust-engines.md`
