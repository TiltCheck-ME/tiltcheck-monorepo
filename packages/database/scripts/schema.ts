/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * Initial Schema for the Five Pillars Trust Engine on Cloud SQL
 */

export const INITIAL_SCHEMA = `
-- Drop existing if any (Safe during initial migration)
-- DROP TABLE IF EXISTS casino_tos_versions;
-- DROP TABLE IF EXISTS casino_metric_snapshots;
-- DROP TABLE IF EXISTS casino_score_history;
-- DROP TABLE IF EXISTS casinos;

-- Pillar 0: The Core Registry
CREATE TABLE IF NOT EXISTS casinos (
    name TEXT PRIMARY KEY,
    domain TEXT UNIQUE NOT NULL,
    license_type TEXT,
    logo_url TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    current_overall_score INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pillar Historicity: Score Tracking
CREATE TABLE IF NOT EXISTS casino_score_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    casino_name TEXT REFERENCES casinos(name) ON DELETE CASCADE,
    overall_score INTEGER NOT NULL,
    financial_score INTEGER,
    fairness_score INTEGER,
    promotional_score INTEGER,
    operational_score INTEGER,
    community_score INTEGER,
    change_reason TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Pillar Evidence: Metric Snapshots
CREATE TABLE IF NOT EXISTS casino_metric_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    casino_name TEXT REFERENCES casinos(name) ON DELETE CASCADE,
    metric_type TEXT NOT NULL, -- 'rtp', 'withdrawal_speed', 'support_latency'
    metric_value NUMERIC NOT NULL,
    source TEXT, -- 'scraper', 'browser_extension', 'degen_intel'
    raw_metadata JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Pillar Protection: Terms of Service Volatility
CREATE TABLE IF NOT EXISTS casino_tos_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    casino_name TEXT REFERENCES casinos(name) ON DELETE CASCADE,
    content_hash TEXT NOT NULL,
    raw_content TEXT,
    change_summary TEXT,
    detected_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_score_history_casino ON casino_score_history(casino_name);
CREATE INDEX IF NOT EXISTS idx_metric_snapshots_casino ON casino_metric_snapshots(casino_name);
CREATE INDEX IF NOT EXISTS idx_tos_versions_casino ON casino_tos_versions(casino_name);
`;
