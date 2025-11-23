© 2024–2025 TiltCheck Ecosystem (Created by jmenichole). All Rights Reserved.

# 14. Poker Module (Optional Future Expansion)
The Poker Module is an optional future addition to the TiltCheck Arena.  
It is included in this documentation so the architecture supports it later without structural rewrites.

The Poker Module replaces what sucks about existing Discord + casino poker offerings while keeping everything:
- transparent  
- fair  
- fun  
- low-cost  
- scalable  
- degen-friendly  
- non-custodial  

This module is disabled by default but fully spec’d for future implementation.

---

# 14.1 Purpose
Current online poker inside Discord or casino side arenas often suffer from:

- terrible UX  
- slow lobbies  
- predatory rake  
- little transparency  
- impossible-to-verify fairness  
- poor anti-tilt mechanics  
- bots dominating play  
- dead lobbies  
- confusing buy-in systems  
- region/IP gating  

TiltCheck fixes this with:
- non-custodial buy-ins  
- AI-powered fairness verification  
- configurable rakes (including 0 for community events)  
- tilt monitoring  
- real transparency  
- flexible tournament formats  
- Discord-first UX  

---

# 14.2 Structure

The Poker Module is composed of four sub-systems:

1. **Lobby System**  
2. **Match Engine**  
3. **Fairness/Transparency Layer**  
4. **Non-Custodial Transaction Layer**  

Each is independent.

---

# 14.3 Lobby System

## 14.3.1 Discord-Based Lobbies
Users can create or join lobbies via:

/poker create <game-type> <buyin> <max players>
/poker join <lobby-id>
/poker leave
/poker start

### Game Types:
- Hold’em  
- Omaha (future)  
- Community Event Mode (no buy-in, just fun)  

### Lobby Features:
- Auto-seat player list  
- Countdown timer  
- Auto-kick AFK  
- Dynamic fill alerts (“2 seats left”)  

---

# 14.4 Match Engine

The Match Engine runs the game logic:

- shuffling  
- dealing  
- betting rounds  
- blinds  
- showdown  

Messages are **Discord-native**, using:
- embeds  
- buttons  
- menus  

**Bots prohibited by default.**  
TiltCheck Trust Engine can detect and flag suspiciously consistent patterns.

---

# 14.5 Fairness & Transparency Layer

TiltCheck introduces real fairness verification:

## 14.5.1 Client-Seeds (Optional)
Users can:
- contribute their own seed  
- see shuffle seeds  
- verify randomness per round  

## 14.5.2 AI Fairness Watchdog
AI checks:
- improbable patterns  
- repeated anomalies  
- duplicate card sequences  
- impossible river outcomes  
- rigged reshuffles  

If fairness anomalies appear, TiltCheck:
- flags the round  
- alerts mods  
- injects into Casino Trust Engine (if casino-hosted)

---

# 14.6 Non-Custodial Buy-In Flow

Buy-ins are handled through:
- Magic wallets  
- Self-submitted wallets  
- JustTheTip sending to pot contract  

TiltCheck **never** holds funds.  
A minimal on-chain smart-contract pot (or escrow) manages:

Buy-in received
All players confirmed
Game starts
Winner gets payout (minus flat fee)
No middleman custody

This avoids:
- stolen funds  
- bot downtime losses  
- legal exposure  

---

# 14.7 Tournament Structures

## Supported:
- Single-table tournaments  
- Sit’n’Go  
- Weekly challenges  
- Community events  
- Show-up bonuses (via CollectClock integration)  

## Future:
- Multi-table tournaments  
- Leaderboards  
- Seasonal ranks  

---

# 14.8 Anti-Tilt Features In Poker

Poker integrates with Tilt Engine:

- rapid all-ins flagged  
- chat aggression flagged  
- user coached gently (“maybe take 30 seconds”)  
- cooldown recommendation after wipeouts  
- accountability buddy option for large tournaments  

---

# 14.9 Data Models (Poker)

```sql
TABLE poker_lobbies {
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    creator_id      TEXT,
    game_type       TEXT,
    buyin_amount    REAL,
    max_players     INTEGER,
    status          TEXT,    -- 'open', 'running', 'closed'
    created_at      TIMESTAMP
}

TABLE poker_players {
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    lobby_id        INTEGER,
    user_id         TEXT,
    stack_size      REAL,
    joined_at       TIMESTAMP
}

TABLE poker_hands {
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    lobby_id        INTEGER,
    round_number    INTEGER,
    seed_used       TEXT,
    fairness_score  REAL,
    created_at      TIMESTAMP
}

14.10 Future Expansion Ideas

Cross-server poker tournaments
Seasonal NFT trophies
Degen-themed table skins
Wagerless game modes for fun-only servers
On-chain proof-of-fairness publishing
Interactions with Casino Trust Engine for casino-hosted poker

End of 14-poker-module.md