© 2024–2025 TiltCheck Ecosystem (Created by jmenichole). All Rights Reserved.

# 16. System Diagrams
This file contains simplified architecture diagrams, module relationships, trust engine flows, and high-level overviews of system pathways.  
All diagrams are ASCII-based to ensure compatibility across editors and GitHub previews.

---

# 16.1 Full Ecosystem Diagram

                                    ┌───────────────────────────────┐
                                    │            Discord            │
                                    │ Slash Commands + Mod Actions  │
                                    └───────────┬───────────────────┘
                                                │
                                        (Verifies Requests)
                                                │
                                  ┌─────────────▼─────────────┐
                                  │       Command Hub          │
                                  │    (Cloudflare Worker)     │
                                  └─────────────┬─────────────┘
                                                │
                                    ┌───────────┼───────────┬───────────┐
                                    ▼           ▼           ▼           ▼
                            ┌────────────┐┌──────────┐┌──────────┐┌───────────────┐
                            │ JustTheTip ││ SusLink  ││CollectClk││ FreeSpinScan   │
                            └─────┬──────┘└────┬─────┘└────┬─────┘└──────┬────────┘
                                  │            │           │            │
                                  └────────────┼───────────┼────────────┘
                                               ▼
                                  ┌──────────────────────────┐
                                  │      Trust Engines       │
                                  │ Casino + Degen + Tilt AI │
                                  └───────┬──────────┬──────┘
                                          ▼          ▼
                              ┌────────────────┐ ┌───────────────┐
                              │ Storage Layer  │ │ Prediction AI  │
                              │ SQLite/KV/Postg│ │ Models         │
                              └────────────────┘ └───────────────┘

---

# 16.2 Trust Flow Diagram

User Action ──► Module ──► Trust Engine ──► Score Update ──► Discord Feedback
│
▼
Explanation Log

### Case Example:  
User rage-spams → Tilt Engine flags → Degen Trust Engine adjusts score → User sees `/trust explain`.

---

# 16.3 Casino Trust Engine Diagram

                    ┌───────────────────────┐
                    │ RTP / Fairness Checks │
                    └───────────┬───────────┘
                                ▼
                    ┌───────────────────────┐
                    │ Bonus/Nerf Patterns   │
                    └───────────┬───────────┘
                                ▼
                    ┌───────────────────────┐
                    │ FreeSpinScan Signals  │
                    └───────────┬───────────┘
                                ▼
             ┌──────────────────────────────────┐
             │      Casino Trust Engine AI       │
             │  Score = weighted blend of inputs │
             └─────────────────┬────────────────┘
                               ▼
                      Trust Score Output

---

# 16.4 Degen Trust Engine Diagram

  ┌────────────────┬────────────────┬─────────────────┐
  │ Tilt Signals   │ Scam Reports   │ Chat Behavior   │
  └────────┬───────┴─────┬─────────┴───────────┬────┘
           ▼             ▼                     ▼
   ┌──────────────────────────────────────────────────┐
   │               Degen Trust AI Engine              │
   │ - Calculates deltas                              │
   │ - Prevents abuse                                 │
   │ - Explains decisions                             │
   └──────────────────┬───────────────────────────────┘
                      ▼
            Trust Score + Explanation

---

# 16.5 Module Dependency Diagram

JustTheTip ─────┐
SusLink ─────────┤──► Trust Engines ◄─── CollectClock
FreeSpinScan ────┘ ▲
│
QualifyFirst │
DA&D │
Tilt Engine ──────┘

Modules do NOT depend on each other — only on the Trust Engines.

---

# 16.6 Data Flow Through TiltCheck (Full Example)

### Example: Submitting a free spins link.

User ──/submit──► Bot
│
▼
Command Hub
│
▼
FreeSpinScan
│
(calls SusLink)
│
▼
Risk Evaluated
│
▼
Mod Approval Queue
│
▼
Approved → Posted to correct channel
│
▼
Casino Trust Engine logs reliability event

---

# 16.7 Poker Module Architecture

(poker commands)
│
▼
Lobby System
│
▼
Match Engine ───► Fairness Watchdog AI
│
▼
Non-Custodial Escrow
│
▼
Winner Payout

---

# 16.8 Funding Intelligence Agent Flow

Startup Grants →───────────────────────────┐
Hackathons →───────────────────────────────┤
Credits →──────────────────────────────────┤
Accelerators →─────────────────────────────┤
Community Bounties →───────────────────────┘
▼
Funding Intelligence Agent
▼
Prioritized Output List
▼
Application Steps + Deadline

---

# 16.9 Developer Workflow Diagram

edit → commit → push → GitHub Actions → deploy (Cloudflare/Supabase)

---

# End of `16-diagrams.md`
