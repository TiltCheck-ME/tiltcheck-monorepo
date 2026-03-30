-- TiltCheck Ecosystem - Initial Database Schema
-- Last Updated: 2026-03-30
-- Target: Neon PostgreSQL (Serverless)

-- Enable UUID extension if not already present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Users Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    discord_id VARCHAR(255) UNIQUE,
    discord_username VARCHAR(255),
    discord_avatar TEXT,
    wallet_address VARCHAR(255) UNIQUE,
    email VARCHAR(255) UNIQUE,
    hashed_password TEXT,
    roles TEXT[] DEFAULT '{user}',
    tier VARCHAR(20) DEFAULT 'free', -- free, elite, admin
    redeem_threshold DECIMAL(20, 8) DEFAULT 500.0,
    redeem_wins INTEGER DEFAULT 0,
    total_redeemed DECIMAL(30, 8) DEFAULT 0.0,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- User Onboarding & Preferences
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_onboarding (
    discord_id VARCHAR(255) PRIMARY KEY REFERENCES users(discord_id) ON DELETE CASCADE,
    is_onboarded BOOLEAN DEFAULT FALSE,
    has_accepted_terms BOOLEAN DEFAULT FALSE,
    risk_level VARCHAR(20) DEFAULT 'moderate', -- conservative, moderate, degen
    cooldown_enabled BOOLEAN DEFAULT TRUE,
    daily_limit DECIMAL(20, 8),
    quiz_scores TEXT, -- JSON or string representation of quiz results
    tutorial_completed BOOLEAN DEFAULT FALSE,
    notifications_tips BOOLEAN DEFAULT TRUE,
    notifications_trivia BOOLEAN DEFAULT TRUE,
    notifications_promos BOOLEAN DEFAULT FALSE,
    compliance_bypass BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- JustTheTip - Tipping Logs
-- ============================================================================
CREATE TABLE IF NOT EXISTS tips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    recipient_discord_id VARCHAR(255),
    recipient_wallet VARCHAR(255),
    amount DECIMAL(30, 8) NOT NULL,
    currency VARCHAR(10) DEFAULT 'SOL',
    status VARCHAR(20) DEFAULT 'pending', -- pending, completed, failed, cancelled
    tx_signature TEXT UNIQUE,
    message TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- Trust Layer - Signals & Ratings
-- ============================================================================
CREATE TABLE IF NOT EXISTS trust_signals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    discord_id VARCHAR(255),
    origin_id VARCHAR(255), -- Discord Guild ID or Partner App Domain
    origin_type VARCHAR(20), -- discord_guild, partner_app, manual
    signal_type VARCHAR(50), -- tip_sent, promo_shared, bad_link_reported, etc.
    delta DECIMAL(10, 4) DEFAULT 1.0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- LockVault - Pillar 3 P2P Lockdown
-- ============================================================================
CREATE TABLE IF NOT EXISTS vault_locks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount_sol DECIMAL(30, 8) NOT NULL,
    locked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    unlock_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'locked', -- locked, released, early_access
    transaction_hash TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- Buddy System
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_buddies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    buddy_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, declined, removed
    alert_thresholds JSONB DEFAULT '{"tilt_score_exceeds": 80}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, buddy_id)
);

-- ============================================================================
-- Casino Audit Bureau
-- ============================================================================
CREATE TABLE IF NOT EXISTS casinos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    domain VARCHAR(255) UNIQUE NOT NULL,
    trust_score DECIMAL(5, 2),
    grade VARCHAR(2) DEFAULT 'C', -- A to F
    is_verified BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS casino_grades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    casino_id UUID REFERENCES casinos(id) ON DELETE CASCADE,
    admin_id UUID, -- References internal admin/auditor
    grade VARCHAR(2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- Blog & News
-- ============================================================================
CREATE TABLE IF NOT EXISTS blog_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    excerpt TEXT,
    content TEXT NOT NULL,
    author VARCHAR(255) DEFAULT 'TiltCheck AI',
    status VARCHAR(20) DEFAULT 'draft', -- draft, published, archived
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- Sessions & Admin
-- ============================================================================
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    roles TEXT[] DEFAULT '{moderator}',
    permissions TEXT[],
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- Initial Data / Seed (Optional)
-- ============================================================================
-- INSERT INTO casinos (name, slug, domain, trust_score, grade) VALUES 
-- ('Stake', 'stake', 'stake.com', 85.0, 'B'),
-- ('Shuffle', 'shuffle', 'shuffle.com', 92.0, 'A');
