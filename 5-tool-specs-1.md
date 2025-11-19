© 2024–2025 TiltCheck Ecosystem (Created by jmenichole). All Rights Reserved.

# 5. Tool Specifications (Part 1)
This document covers the detailed specifications for the first three TiltCheck modules:

1. **JustTheTip** – non-custodial tipping & airdrops  
2. **SusLink** – link scanning & risk detection  
3. **CollectClock** – daily bonus tracking & nerf analysis  

Each tool is modular, Discord-driven, and built to operate independently while sharing optional insights with the trust engines.

---

# 5.1 JustTheTip — Non-Custodial Tipping & Airdrops

## 5.1.1 Purpose & Philosophy
JustTheTip exists because custodial bots are unreliable, legally risky, and frequently lose user funds.  
TiltCheck solves this by staying **fully non-custodial**:

- The platform NEVER holds balances  
- Users tip directly wallet-to-wallet  
- Fees are flat, predictable, and taken *before* the action  
- Crypto remains under user ownership at all times  

This eliminates the “bot ate my money” chaos that plagues most tipping systems.

---

## 5.1.2 Core Functions

### **1. Tip → Direct Send**
User tips another user by providing:
- target wallet (or Discord user → mapped wallet)
- asset type
- amount

Flow:
User → /tip @user <amount> <token>
System → calculates flat fee
System → deducts fee
System → user approves wallet transaction
Blockchain processes send
Discord → confirmation


### **2. Airdrop → Multi-Send**
Mass sends with flat fee per action (not per user).

### **3. Optional Swap → Jupiter Integration**
After fee deduction, user may perform an on-chain swap.

Swap is:
- optional  
- available only when liquidity is healthy  
- always non-custodial (contract handles balances)  

**No swapping fees except the base flat fee for the action.**

---

## 5.1.3 Fee Structure

### **Flat Fee Only**
No percentages.  
No dynamic scaling.  
No special tiers.

Default recommended:
- **$0.07** per tip/airdrop/withdraw (USD equivalent)
- Gas is separate and unavoidable (fractions of a cent on Solana)

### **Legal Reason:**  
Flat fees avoid triggering “money transmitter” classifications.

---

## 5.1.4 Wallet System

TiltCheck must NEVER store user keys.

Supported:
- Magic.link non-custodial wallets tied to Discord ID  
- User-submitted existing wallets  
- No custodial balances held by TiltCheck  

Mapping:

### **2. Airdrop → Multi-Send**
Mass sends with flat fee per action (not per user).

### **3. Optional Swap → Jupiter Integration**
After fee deduction, user may perform an on-chain swap.

Swap is:
- optional  
- available only when liquidity is healthy  
- always non-custodial (contract handles balances)  

**No swapping fees except the base flat fee for the action.**

---

## 5.1.3 Fee Structure

### **Flat Fee Only**
No percentages.  
No dynamic scaling.  
No special tiers.

Default recommended:
- **$0.07** per tip/airdrop/withdraw (USD equivalent)
- Gas is separate and unavoidable (fractions of a cent on Solana)

### **Legal Reason:**  
Flat fees avoid triggering “money transmitter” classifications.

---

## 5.1.4 Wallet System

TiltCheck must NEVER store user keys.

Supported:
- Magic.link non-custodial wallets tied to Discord ID  
- User-submitted existing wallets  
- No custodial balances held by TiltCheck  

Mapping:
- Discord ID ↔ Magic wallet address


Stored metadata:

discord_id
wallet_address
created_at
updated_at
trust_score_linked (optional)


---

## 5.1.5 Discord Commands

/tip @user <amount> <token>
/airdrop <amount> <token> <list or role>
/swap <amount> <from-token> <to-token>
/setwallet <address>
/mywallet


---

## 5.1.6 Integration With Trust Engines  
(Two-way optional)

- Reports high-risk user behavior  
- Receives warnings about users with low trust score  
- Can warn users if a casino token is involved in a swap with suspicious metrics  

---

# 5.2 SusLink — Link Scanning & Scam Detection

## 5.2.1 Purpose
Degen servers are full of:

- fake promos  
- phishing links  
- malware redirects  
- impersonation domains  
- throwaway scam URLs  

SusLink scans and scores links automatically.

---

## 5.2.2 Inputs

Users submit:
- raw URL  
- optional context (“free spins”, “casino login”, etc.)

Bots may auto-scan messages containing URLs.

---

## 5.2.3 Data Pipeline

SusLink performs:

### 1. **Domain Reputation Check**
- Newly registered domain flag  
- Blacklist checks  
- TLD risk analysis  
- Subdomain spoof detection  

### 2. **Redirect Chain Walk**
Follows link until final destination, checks for:
- mismatched content type  
- malicious JS  
- tracker payloads  
- invisible redirects  

### 3. **Heuristic Pattern Scoring**
Flags:
- repeated scam keywords  
- casino impersonations  
- misleading paths (e.g. “/bonus-free-spins/claim-now”)  
- crypto drainers  
- wallet connect spoofers  

### 4. **AI Context Evaluation**
Assesses:
- relevance  
- safety  
- predicted user intent  
- likelihood of abuse  

---

## 5.2.4 Risk Levels
Risk is returned as:

- **Safe**  
- **Suspicious**  
- **High Risk**  
- **Critical**  

Used by:
- FreeSpinScan  
- Moderation tools  
- Casino Trust Engine (if casino URL involved)  

---

## 5.2.5 Discord Commands


---

## 5.1.6 Integration With Trust Engines  
(Two-way optional)

- Reports high-risk user behavior  
- Receives warnings about users with low trust score  
- Can warn users if a casino token is involved in a swap with suspicious metrics  

---

# 5.2 SusLink — Link Scanning & Scam Detection

## 5.2.1 Purpose
Degen servers are full of:

- fake promos  
- phishing links  
- malware redirects  
- impersonation domains  
- throwaway scam URLs  

SusLink scans and scores links automatically.

---

## 5.2.2 Inputs

Users submit:
- raw URL  
- optional context (“free spins”, “casino login”, etc.)

Bots may auto-scan messages containing URLs.

---

## 5.2.3 Data Pipeline

SusLink performs:

### 1. **Domain Reputation Check**
- Newly registered domain flag  
- Blacklist checks  
- TLD risk analysis  
- Subdomain spoof detection  

### 2. **Redirect Chain Walk**
Follows link until final destination, checks for:
- mismatched content type  
- malicious JS  
- tracker payloads  
- invisible redirects  

### 3. **Heuristic Pattern Scoring**
Flags:
- repeated scam keywords  
- casino impersonations  
- misleading paths (e.g. “/bonus-free-spins/claim-now”)  
- crypto drainers  
- wallet connect spoofers  

### 4. **AI Context Evaluation**
Assesses:
- relevance  
- safety  
- predicted user intent  
- likelihood of abuse  

---

## 5.2.4 Risk Levels
Risk is returned as:

- **Safe**  
- **Suspicious**  
- **High Risk**  
- **Critical**  

Used by:
- FreeSpinScan  
- Moderation tools  
- Casino Trust Engine (if casino URL involved)  

---

## 5.2.5 Discord Commands


---

## 5.1.6 Integration With Trust Engines  
(Two-way optional)

- Reports high-risk user behavior  
- Receives warnings about users with low trust score  
- Can warn users if a casino token is involved in a swap with suspicious metrics  

---

# 5.2 SusLink — Link Scanning & Scam Detection

## 5.2.1 Purpose
Degen servers are full of:

- fake promos  
- phishing links  
- malware redirects  
- impersonation domains  
- throwaway scam URLs  

SusLink scans and scores links automatically.

---

## 5.2.2 Inputs

Users submit:
- raw URL  
- optional context (“free spins”, “casino login”, etc.)

Bots may auto-scan messages containing URLs.

---

## 5.2.3 Data Pipeline

SusLink performs:

### 1. **Domain Reputation Check**
- Newly registered domain flag  
- Blacklist checks  
- TLD risk analysis  
- Subdomain spoof detection  

### 2. **Redirect Chain Walk**
Follows link until final destination, checks for:
- mismatched content type  
- malicious JS  
- tracker payloads  
- invisible redirects  

### 3. **Heuristic Pattern Scoring**
Flags:
- repeated scam keywords  
- casino impersonations  
- misleading paths (e.g. “/bonus-free-spins/claim-now”)  
- crypto drainers  
- wallet connect spoofers  

### 4. **AI Context Evaluation**
Assesses:
- relevance  
- safety  
- predicted user intent  
- likelihood of abuse  

---

## 5.2.4 Risk Levels
Risk is returned as:

- **Safe**  
- **Suspicious**  
- **High Risk**  
- **Critical**  

Used by:
- FreeSpinScan  
- Moderation tools  
- Casino Trust Engine (if casino URL involved)  

---

## 5.2.5 Discord Commands


---

## 5.1.6 Integration With Trust Engines  
(Two-way optional)

- Reports high-risk user behavior  
- Receives warnings about users with low trust score  
- Can warn users if a casino token is involved in a swap with suspicious metrics  

---

# 5.2 SusLink — Link Scanning & Scam Detection

## 5.2.1 Purpose
Degen servers are full of:

- fake promos  
- phishing links  
- malware redirects  
- impersonation domains  
- throwaway scam URLs  

SusLink scans and scores links automatically.

---

## 5.2.2 Inputs

Users submit:
- raw URL  
- optional context (“free spins”, “casino login”, etc.)

Bots may auto-scan messages containing URLs.

---

## 5.2.3 Data Pipeline

SusLink performs:

### 1. **Domain Reputation Check**
- Newly registered domain flag  
- Blacklist checks  
- TLD risk analysis  
- Subdomain spoof detection  

### 2. **Redirect Chain Walk**
Follows link until final destination, checks for:
- mismatched content type  
- malicious JS  
- tracker payloads  
- invisible redirects  

### 3. **Heuristic Pattern Scoring**
Flags:
- repeated scam keywords  
- casino impersonations  
- misleading paths (e.g. “/bonus-free-spins/claim-now”)  
- crypto drainers  
- wallet connect spoofers  

### 4. **AI Context Evaluation**
Assesses:
- relevance  
- safety  
- predicted user intent  
- likelihood of abuse  

---

## 5.2.4 Risk Levels
Risk is returned as:

- **Safe**  
- **Suspicious**  
- **High Risk**  
- **Critical**  

Used by:
- FreeSpinScan  
- Moderation tools  
- Casino Trust Engine (if casino URL involved)  

---

## 5.2.5 Discord Commands

/scan <url>
/risk <url>
/linkinfo <url>



Bot can optionally auto-scan all links.

---

# 5.3 CollectClock — Bonus Tracking & Nerf Analysis

## 5.3.1 Purpose
Casinos change bonuses without transparency:

- daily bonus amounts  
- cooldown windows  
- region rules  
- spin value  
- minimum wager  
- total payout  

CollectClock provides clear, predictable bonus visibility.

---

## 5.3.2 Core Features

### **1. Countdown Timers**
User gets timers for:
- next bonus  
- streak bonuses  
- deposit bonuses  
- regional promos  

### **2. Nerf Detection**
Detects when casinos silently reduce:

- daily SC amounts  
- free spin values  
- eligibility scores  
- min deposits  

Example:
- “1.00 SC daily bonus → 0.10 SC today”  
→ flagged and logged

### **3. Bonus Pattern Prediction**
Uses:
- user reports  
- collected timestamps  
- casino behavior trends  
- machine learning pattern detection  

Predicts:
- frequency  
- typical time window  
- cycles (e.g., peak days)  
- probability of reversion after a nerf  

### **4. User-Customizable Bonus Categories**
Supports:
- casinos without APIs  
- user-defined bonus timers  
- manual verification (if autoscan unsupported)

---

## 5.3.3 Inputs

Users may submit:
- bonus timestamp  
- bonus amount  
- notes (“nerfed today from 1.0 → 0.2”)  

Bot may scrape:
- casino daily bonus pages  
- timestamped user reports  

---

## 5.3.4 Discord Commands


Bot can optionally auto-scan all links.

---

# 5.3 CollectClock — Bonus Tracking & Nerf Analysis

## 5.3.1 Purpose
Casinos change bonuses without transparency:

- daily bonus amounts  
- cooldown windows  
- region rules  
- spin value  
- minimum wager  
- total payout  

CollectClock provides clear, predictable bonus visibility.

---

## 5.3.2 Core Features

### **1. Countdown Timers**
User gets timers for:
- next bonus  
- streak bonuses  
- deposit bonuses  
- regional promos  

### **2. Nerf Detection**
Detects when casinos silently reduce:

- daily SC amounts  
- free spin values  
- eligibility scores  
- min deposits  

Example:
- “1.00 SC daily bonus → 0.10 SC today”  
→ flagged and logged

### **3. Bonus Pattern Prediction**
Uses:
- user reports  
- collected timestamps  
- casino behavior trends  
- machine learning pattern detection  

Predicts:
- frequency  
- typical time window  
- cycles (e.g., peak days)  
- probability of reversion after a nerf  

### **4. User-Customizable Bonus Categories**
Supports:
- casinos without APIs  
- user-defined bonus timers  
- manual verification (if autoscan unsupported)

---

## 5.3.3 Inputs

Users may submit:
- bonus timestamp  
- bonus amount  
- notes (“nerfed today from 1.0 → 0.2”)  

Bot may scrape:
- casino daily bonus pages  
- timestamped user reports  

---

## 5.3.4 Discord Commands


Bot can optionally auto-scan all links.

---

# 5.3 CollectClock — Bonus Tracking & Nerf Analysis

## 5.3.1 Purpose
Casinos change bonuses without transparency:

- daily bonus amounts  
- cooldown windows  
- region rules  
- spin value  
- minimum wager  
- total payout  

CollectClock provides clear, predictable bonus visibility.

---

## 5.3.2 Core Features

### **1. Countdown Timers**
User gets timers for:
- next bonus  
- streak bonuses  
- deposit bonuses  
- regional promos  

### **2. Nerf Detection**
Detects when casinos silently reduce:

- daily SC amounts  
- free spin values  
- eligibility scores  
- min deposits  

Example:
- “1.00 SC daily bonus → 0.10 SC today”  
→ flagged and logged

### **3. Bonus Pattern Prediction**
Uses:
- user reports  
- collected timestamps  
- casino behavior trends  
- machine learning pattern detection  

Predicts:
- frequency  
- typical time window  
- cycles (e.g., peak days)  
- probability of reversion after a nerf  

### **4. User-Customizable Bonus Categories**
Supports:
- casinos without APIs  
- user-defined bonus timers  
- manual verification (if autoscan unsupported)

---

## 5.3.3 Inputs

Users may submit:
- bonus timestamp  
- bonus amount  
- notes (“nerfed today from 1.0 → 0.2”)  

Bot may scrape:
- casino daily bonus pages  
- timestamped user reports  

---

## 5.3.4 Discord Commands

bonus
/bonus set <casino> <amount>
/bonus history <casino>
/bonus predict <casino>
/bonus nerfs


---

## 5.3.5 Integration With Trust Engines

CollectClock feeds:

- **bonus reliability**
- **nerf frequency**
- **payout irregularities**
- **user frustration patterns**
- **missed claims due to server failures**

This heavily influences **Casino Trust Score**.

---

# End of `5-tool-specs-1.md`
