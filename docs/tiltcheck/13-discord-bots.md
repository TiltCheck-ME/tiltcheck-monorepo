© 2024–2025 TiltCheck Ecosystem (Created by jmenichole). All Rights Reserved.

# 13. Discord Bot Architecture & Command Design
This document defines Discord bot logic for the TiltCheck ecosystem, including:

- command structure  
- permissions  
- moderation flows  
- multi-module routing  
- events  
- error handling  
- rate limits  
- UX guidelines  

---

# 13.1 Overview

The TiltCheck ecosystem is **Discord-first** but delivered through **JustTheTip bot**, which integrates TiltCheck's core functionality:

**JustTheTip Bot** (powered by TiltCheck) provides:
- Non-custodial tipping, airdrops, and swaps
- Trust scoring and analytics
- Link scanning and security
- Bonus tracking and predictions
- Community engagement features

TiltCheck's core analytics and trust engines run as backend services that power the bot's intelligence, but are also available via web dashboards and APIs for broader ecosystem access beyond Discord.

---

# 13.2 Bot Permissions

Recommended permissions:

Read Messages
Send Messages
Use Slash Commands
Embed Links
Attach Files
Add Reactions
Manage Messages (mod-only commands)
Read Message History

The bot must **not** require:
- ADMINISTRATOR  
- MANAGE GUILD  

unless absolutely necessary.

---

# 13.3 Command Groups

TiltCheck organizes slash commands by category:

/tip
/airdrop
/swap
/wallet
/scan
/promo
/bonus
/predict
/tilt
/trust
/surveys
/friend
/play
/help

Each group maps to a module.

---

# 13.4 Full Command List

Below are all commands in canonical form.

---

## 13.4.1 JustTheTip Commands

### `/tip @user <amount> <token>`
Send a non-custodial tip.

### `/airdrop <amount> <token> <role or list>`
Mass send.

### `/swap <amount> <from> <to>`
Perform Jupiter swap (post-fee).

### `/mywallet`
Display wallet.

### `/setwallet <address>`
Bind wallet.

---

## 13.4.2 SusLink Commands

### `/scan <url>`
Scan URL for risk.

### `/risk <url>`
Short summary.

### `/linkinfo <url>`
Full redirect-chain + domain metadata.

---

## 13.4.3 FreeSpinScan Commands

### `/submit <url> <bonus-type> <notes>`
Submit free spins / promo.

### `/promos`
List latest approved promos.

### `/promos pending` *(mods only)*
View pending queue.

### `/approve <id>` *(mods only)*
Approve a promo.

### `/deny <id>` *(mods only)*
Reject a promo.

---

## 13.4.4 CollectClock Commands

### `/bonus`
Show current bonus expected value.

### `/bonus set <casino> <amount>`
User-submitted value.

### `/bonus history <casino>`
Show historical values.

### `/bonus predict <casino>`
Forecast next likely bonus drop.

### `/bonus nerfs`
List recent nerfs across casinos.

---

## 13.4.5 QualifyFirst Commands

### `/qualify`
Show best-match surveys.

### `/survey profile`
Show trait profile.

### `/survey improve`
Micro-questions to refine traits.

---

## 13.4.6 DA&D (Degens Against Decency) Commands

### `/play`
Start a game.

### `/play join`
Join active lobby.

### `/play card <option>`
Submit card.

### `/play vote`
Vote on cards.

### `/play end`
End game (mods/host only).

---

## 13.4.7 Tilt Engine Commands

### `/tilt`
Show your tilt signals summary.

### `/tilt cooldown`
Enable cooldown.

### `/tilt lock`
Vault lock activation.

---

## 13.4.8 Degen Trust Commands

### `/trust me`
Show your trust score.

### `/trust explain`
Explain your trust score changes.

### `/trust report @user <reason>`
Submit a community signal.

Mods:
/trust modlog @user
/trust reset @user

---

## 13.4.9 Accountabilibuddy Commands

### `/friend add @user`
Link accountability buddy.

### `/friend ping`
Ping accountability buddy.

### `/friend remove`
Unlink.

---

# 13.5 Bot Event Listeners

TiltCheck listens to several Discord events:

### **MessageCreate**
- detect tilt signals  
- detect scam links  
- detect promo chatter in wrong channel  
- soft enforcement messages  

### **InteractionCreate**
- slash commands  
- button clicks  
- mod approvals  

### **GuildMemberAdd**
- trust initialization  
- optional onboarding  

### **GuildMemberRemove**
- clean trust associations  
- preserve logs for safety  

---

# 13.6 Moderation Tools

Moderators get:

### Inline Shortcuts:
- approve/deny promo  
- view user trust logs  
- mark scam confirmations  
- restrict a user from posting promos  
- override bonus entries  

### Anti-Spam:
- message rate detection  
- automatic soft warnings  

### Scam Enforcement:
- log scam claims  
- require proof  
- penalize weaponized reports  

---

# 13.7 User Experience Philosophy

TiltCheck bots must always:

- keep messages short  
- use ephemeral messages for confirmations  
- avoid clutter  
- never shame users  
- use humor when appropriate  
- avoid “gotcha” prompts  
- simplify everything  

Discord UX is the heart of the product.

---

# 13.8 Rate Limits

User-level:
- 3 scans/min  
- 2 submissions/min  
- 1 tip/10 seconds  
- 1 swap/interval (to avoid spam)

Channel-level:
- promo channels locked via approvals  
- tilt signals limited to avoid noise  

Bot-level:
- retry logic  
- exponential backoff  
- cooldown after Discord rate-limit warning  

---

# 13.9 Error Handling Rules

Errors must be:

- helpful  
- short  
- actionable  

Example:

Error: Wallet missing.
Use /setwallet <address> to continue.

Never output stack traces.

---

# 13.10 Logging

Bot logs include:

- command usage  
- scan events  
- trust signals  
- errors  
- cooldown activations  
- mod actions  

Logs must remain **private** and **non-PII**.

---

# End of `13-discord-bots.md`