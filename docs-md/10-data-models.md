© 2024–2025 TiltCheck Ecosystem (Created by jmenichole). All Rights Reserved.

# 10. Data Models
TiltCheck’s data layer is intentionally minimal, low-cost, and modular.  
Every model is designed so it can live in:

- SQLite (local or LibSQL/D1)
- Supabase Postgres (recommended for production)
- Cloudflare KV / Durable Objects
- or a hybrid depending on cost + scale

This document defines the **canonical schema** for every TiltCheck module.

---

# 10.1 User Model

Users are identified primarily by Discord ID.  
Wallets, trust scores, and session data attach to this identity.

```sql
TABLE users {
    id                  TEXT PRIMARY KEY,   -- Discord ID
    wallet_address      TEXT,
    created_at          TIMESTAMP,
    updated_at          TIMESTAMP,
    trust_score         INTEGER DEFAULT 75, -- 0–100
    nft_id              TEXT,               -- optional trust identity NFT
    notes               TEXT                -- internal system notes
}
10.2 Wallet Mapping
TiltCheck never stores private keys — only wallet addresses.
TABLE wallets {
    discord_id          TEXT PRIMARY KEY,
    wallet_address      TEXT NOT NULL,
    provider            TEXT,      -- 'magic', 'user-supplied'
    created_at          TIMESTAMP
}
10.3 Trust Engine Models
10.3.1 Degen Trust Logs
Each event that affects trust score gets logged.
TABLE degen_trust_events {
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    discord_id          TEXT,
    event_type          TEXT,        -- 'tilt', 'cooldown', 'scam_confirmed', etc.
    delta               INTEGER,     -- + or -
    reason              TEXT,
    created_at          TIMESTAMP
}
10.3.2 Casino Trust Logs
Models all casino behavior patterns.
TABLE casino_trust_events {
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    casino_name         TEXT,
    event_type          TEXT,      -- 'nerf', 'payout_delay', 'seed_mismatch'
    severity            INTEGER,   -- 1–5
    details             TEXT,
    created_at          TIMESTAMP
}
10.4 CollectClock Models
10.4.1 Bonus Log
TABLE bonuses {
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    casino_name         TEXT,
    user_id             TEXT,
    amount              REAL,          -- SC/GC/FS value
    timestamp           TIMESTAMP,
    nerfed              BOOLEAN,
    notes               TEXT
}
10.4.2 Prediction Metadata
TABLE bonus_predictions {
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    casino_name         TEXT,
    predicted_timestamp TIMESTAMP,
    confidence          REAL,
    created_at          TIMESTAMP
}
10.5 FreeSpinScan Models
10.5.1 Submissions
TABLE promo_submissions {
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    url                 TEXT,
    user_id             TEXT,
    casino_name         TEXT,
    bonus_type          TEXT,
    notes               TEXT,
    suslink_score       REAL,
    status              TEXT,        -- 'pending', 'approved', 'denied'
    created_at          TIMESTAMP,
    reviewed_at         TIMESTAMP,
    reviewed_by         TEXT         -- moderator Discord ID
}
10.6 SusLink Models
10.6.1 Scan Results
TABLE link_scans {
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    url                 TEXT,
    risk_level          TEXT,        -- 'safe', 'suspicious', 'high', 'critical'
    redirect_chain      TEXT,
    domain_age_days     INTEGER,
    reason              TEXT,        -- key pattern match
    scanned_at          TIMESTAMP
}
10.7 JustTheTip Models
10.7.1 Tip Log
TABLE tips {
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    from_user           TEXT,
    to_user             TEXT,
    amount              REAL,
    token               TEXT,
    fee_amount          REAL,
    tx_signature        TEXT,
    created_at          TIMESTAMP
}
10.7.2 Swap Log
TABLE swaps {
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id             TEXT,
    amount_in           REAL,
    token_in            TEXT,
    token_out           TEXT,
    rate                REAL,
    fee_amount          REAL,
    tx_signature        TEXT,
    created_at          TIMESTAMP
}
10.8 QualifyFirst Models
10.8.1 Survey Profile
TABLE survey_profiles {
    user_id             TEXT PRIMARY KEY,
    traits              TEXT,   -- JSON encoded
    success_rate        REAL,
    last_updated        TIMESTAMP
}
10.8.2 Survey Opportunities
TABLE surveys {
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    source              TEXT,
    payout              REAL,
    eligibility         TEXT,   -- JSON encoded criteria
    created_at          TIMESTAMP
}
10.9 Tilt Engine Models
10.9.1 Tilt Log
TABLE tilt_events {
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    discord_id          TEXT,
    signal_type         TEXT,     -- 'speed', 'rage', 'loan_request', etc.
    severity            INTEGER,  -- 1-5
    created_at          TIMESTAMP
}
10.9.2 Cooldown Logs
TABLE cooldowns {
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id             TEXT,
    reason              TEXT,
    started_at          TIMESTAMP,
    ends_at             TIMESTAMP
}
10.10 Accountability Wallet Models
TABLE accountability_pairs {
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id             TEXT,
    buddy_id            TEXT,
    created_at          TIMESTAMP
}

TABLE co_approved_withdrawals {
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id             TEXT,
    buddy_id            TEXT,
    amount              REAL,
    token               TEXT,
    approved            BOOLEAN,
    created_at          TIMESTAMP
}
10.11 Identity & NFT Models
TABLE identity_nft {
    user_id             TEXT PRIMARY KEY,
    nft_mint            TEXT,
    created_at          TIMESTAMP
}
10.12 Agent Funding Intelligence Models
TABLE funding_opportunities {
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    name                TEXT,
    type                TEXT,      -- 'grant', 'hackathon', etc.
    link                TEXT,
    deadline            TIMESTAMP,
    difficulty          TEXT,
    relevance_score     REAL,
    created_at          TIMESTAMP
}

TABLE funding_history {
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    opportunity_id      INTEGER,
    status              TEXT,      -- 'applied', 'won', 'lost'
    notes               TEXT,
    updated_at          TIMESTAMP
}
End of 10-data-models.md