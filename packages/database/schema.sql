-- TiltCheck Database Schema for Supabase
-- User stats and game history for cross-platform tracking

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Stats Table
-- Tracks cumulative stats for each Discord user across web and Discord bot platforms
CREATE TABLE IF NOT EXISTS user_stats (
  discord_id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  avatar TEXT,
  
  -- Global stats
  total_games INTEGER DEFAULT 0 NOT NULL,
  total_wins INTEGER DEFAULT 0 NOT NULL,
  total_score INTEGER DEFAULT 0 NOT NULL,
  
  -- Analytics stats
  wagered_amount_sol DECIMAL DEFAULT 0 NOT NULL,
  deposited_amount_sol DECIMAL DEFAULT 0 NOT NULL,
  lost_amount_sol DECIMAL DEFAULT 0 NOT NULL,
  profit_sol DECIMAL DEFAULT 0 NOT NULL,
  
  -- Degens Against Decency stats
  dad_games INTEGER DEFAULT 0 NOT NULL,
  dad_wins INTEGER DEFAULT 0 NOT NULL,
  dad_score INTEGER DEFAULT 0 NOT NULL,
  
  -- Poker stats
  poker_games INTEGER DEFAULT 0 NOT NULL,
  poker_wins INTEGER DEFAULT 0 NOT NULL,
  poker_chips_won INTEGER DEFAULT 0 NOT NULL,
  
  -- Metadata
  last_played_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Wallet Registrations Table
-- Stores user wallet addresses for JustTheTip tipping
CREATE TABLE IF NOT EXISTS wallet_registrations (
  discord_id TEXT PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  wallet_type TEXT DEFAULT 'external' NOT NULL,
  registered_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- User Onboarding Table
-- Tracks user onboarding status and preferences
CREATE TABLE IF NOT EXISTS user_onboarding (
  discord_id TEXT PRIMARY KEY,
  is_onboarded BOOLEAN DEFAULT false NOT NULL,
  has_accepted_terms BOOLEAN DEFAULT false NOT NULL,
  risk_level TEXT DEFAULT 'moderate' CHECK (risk_level IN ('conservative', 'moderate', 'degen')),
  cooldown_enabled BOOLEAN DEFAULT false NOT NULL,
  daily_limit INTEGER,
  notifications_tips BOOLEAN DEFAULT true NOT NULL,
  notifications_trivia BOOLEAN DEFAULT true NOT NULL,
  notifications_promos BOOLEAN DEFAULT false NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Game History Table
-- Records individual completed games for history and analytics
CREATE TABLE IF NOT EXISTS game_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id TEXT NOT NULL,
  game_type TEXT NOT NULL CHECK (game_type IN ('dad', 'poker')),
  platform TEXT NOT NULL CHECK (platform IN ('web', 'discord')),
  channel_id TEXT,
  
  winner_id TEXT REFERENCES user_stats(discord_id) ON DELETE SET NULL,
  player_ids TEXT[] NOT NULL,
  
  duration INTEGER, -- seconds
  completed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for Performance

-- User stats indexes
CREATE INDEX IF NOT EXISTS idx_user_stats_total_score ON user_stats(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_dad_score ON user_stats(dad_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_poker_chips ON user_stats(poker_chips_won DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_last_played ON user_stats(last_played_at DESC);

-- Wallet registrations indexes
CREATE INDEX IF NOT EXISTS idx_wallet_registrations_address ON wallet_registrations(wallet_address);

-- Game history indexes
CREATE INDEX IF NOT EXISTS idx_game_history_winner ON game_history(winner_id);
CREATE INDEX IF NOT EXISTS idx_game_history_type ON game_history(game_type);
CREATE INDEX IF NOT EXISTS idx_game_history_platform ON game_history(platform);
CREATE INDEX IF NOT EXISTS idx_game_history_completed ON game_history(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_history_players ON game_history USING GIN(player_ids);

-- Trust Identities Table (formerly Degen Identities)
-- Links Discord profiles to on-chain actions and Magic wallets
CREATE TABLE IF NOT EXISTS trust_identities (
  discord_id TEXT PRIMARY KEY REFERENCES user_stats(discord_id) ON DELETE CASCADE,
  magic_address TEXT UNIQUE,
  primary_external_address TEXT UNIQUE,
  tos_accepted BOOLEAN DEFAULT false NOT NULL,
  tos_nft_minted BOOLEAN DEFAULT false NOT NULL,
  tos_nft_paid BOOLEAN DEFAULT false NOT NULL,
  tos_nft_signature TEXT,
  nft_savings_sol DECIMAL DEFAULT 0 NOT NULL,
  trust_score FLOAT DEFAULT 50.0 NOT NULL,
  identity_metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for trust_identities
CREATE INDEX IF NOT EXISTS idx_trust_identities_magic_address ON trust_identities(magic_address);
CREATE INDEX IF NOT EXISTS idx_trust_identities_trust_score ON trust_identities(trust_score DESC);

-- Trigger for trust_identities updated_at
CREATE TRIGGER update_trust_identities_updated_at 
  BEFORE UPDATE ON trust_identities 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- RLS for trust_identities
ALTER TABLE trust_identities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for trust_identities" 
  ON trust_identities FOR SELECT 
  USING (true);

CREATE POLICY "Service role can insert trust_identities" 
  ON trust_identities FOR INSERT 
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update trust_identities" 
  ON trust_identities FOR UPDATE 
  USING (auth.role() = 'service_role');

-- Mod Logs Table
-- Tracks disciplinary actions against users (scammers, rain farmers, etc.)
CREATE TABLE IF NOT EXISTS mod_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  target_user_id TEXT NOT NULL,
  moderator_id TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('warn', 'mute', 'kick', 'ban', 'flag_scammer', 'flag_farmer')),
  reason TEXT NOT NULL,
  evidence_url TEXT, -- Link to screenshot or message link
  witness_statement TEXT, -- Optional second opinion or witness
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);CREATE TABLE IF NOT EXISTS user_stats(
  discord_id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  avatar TEXT,
  
  -- Global stats
  total_games INTEGER DEFAULT 0 NOT NULL,
  total_wins INTEGER DEFAULT 0 NOT NULL,
  total_score INTEGER DEFAULT 0 NOT NULL,
  
  -- Analytics stats
  wagered_amount_sol DECIMAL DEFAULT 0 NOT NULL,
  deposited_amount_sol DECIMAL DEFAULT 0 NOT NULL,
  lost_amount_sol DECIMAL DEFAULT 0 NOT NULL,
  profit_sol DECIMAL DEFAULT 0 NOT NULL,
  
  -- Degens Against Decency stats
  dad_games INTEGER DEFAULT 0 NOT NULL,
  dad_wins INTEGER DEFAULT 0 NOT NULL,
  dad_score INTEGER DEFAULT 0 NOT NULL,
  
  -- Poker stats
  poker_games INTEGER DEFAULT 0 NOT NULL,
  poker_wins INTEGER DEFAULT 0 NOT NULL,
  poker_chips_won INTEGER DEFAULT 0 NOT NULL,
  
  -- Metadata
  last_played_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for mod_logs
CREATE INDEX IF NOT EXISTS idx_mod_logs_target ON mod_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_mod_logs_action ON mod_logs(action_type);

-- RLS for mod_logs
ALTER TABLE mod_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for mod_logs" 
  ON mod_logs FOR SELECT 
  USING (true);

CREATE POLICY "Service role can insert mod_logs" 
  ON mod_logs FOR INSERT 
  WITH CHECK (auth.role() = 'service_role');

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_stats_updated_at 
  BEFORE UPDATE ON user_stats 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallet_registrations_updated_at 
  BEFORE UPDATE ON wallet_registrations 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_onboarding_updated_at 
  BEFORE UPDATE ON user_onboarding 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
-- Enable RLS
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_onboarding ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read stats (for leaderboards)
CREATE POLICY "Public read access for user stats" 
  ON user_stats FOR SELECT 
  USING (true);

CREATE POLICY "Public read access for game history" 
  ON game_history FOR SELECT 
  USING (true);

-- Only service role can insert/update (via backend)
CREATE POLICY "Service role can insert user stats" 
  ON user_stats FOR INSERT 
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update user stats" 
  ON user_stats FOR UPDATE 
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can insert game history" 
  ON game_history FOR INSERT 
  WITH CHECK (auth.role() = 'service_role');

-- Wallet registrations policies (service role only for write, public read)
CREATE POLICY "Public read access for wallet registrations" 
  ON wallet_registrations FOR SELECT 
  USING (true);

CREATE POLICY "Service role can insert wallet registrations" 
  ON wallet_registrations FOR INSERT 
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update wallet registrations" 
  ON wallet_registrations FOR UPDATE 
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can delete wallet registrations" 
  ON wallet_registrations FOR DELETE 
  USING (auth.role() = 'service_role');

-- User onboarding policies (service role only for write, public read)
CREATE POLICY "Public read access for user onboarding" 
  ON user_onboarding FOR SELECT 
  USING (true);

CREATE POLICY "Service role can insert user onboarding" 
  ON user_onboarding FOR INSERT 
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update user onboarding" 
  ON user_onboarding FOR UPDATE 
  USING (auth.role() = 'service_role');

-- Views for common queries

-- Top players global leaderboard
CREATE OR REPLACE VIEW leaderboard_global AS
SELECT 
  discord_id,
  username,
  avatar,
  total_games,
  total_wins,
  total_score,
  ROUND((total_wins::DECIMAL / NULLIF(total_games, 0)) * 100, 2) as win_rate,
  last_played_at
FROM user_stats
WHERE total_games > 0
ORDER BY total_score DESC, total_wins DESC
LIMIT 100;

-- Top DA&D players
CREATE OR REPLACE VIEW leaderboard_dad AS
SELECT 
  discord_id,
  username,
  avatar,
  dad_games,
  dad_wins,
  dad_score,
  ROUND((dad_wins::DECIMAL / NULLIF(dad_games, 0)) * 100, 2) as win_rate,
  last_played_at
FROM user_stats
WHERE dad_games > 0
ORDER BY dad_score DESC, dad_wins DESC
LIMIT 100;

-- Top Poker players
CREATE OR REPLACE VIEW leaderboard_poker AS
SELECT 
  discord_id,
  username,
  avatar,
  poker_games,
  poker_wins,
  poker_chips_won,
  ROUND((poker_wins::DECIMAL / NULLIF(poker_games, 0)) * 100, 2) as win_rate,
  last_played_at
FROM user_stats
WHERE poker_games > 0
ORDER BY poker_chips_won DESC, poker_wins DESC
LIMIT 100;

-- Comments for documentation
COMMENT ON TABLE user_stats IS 'Cumulative user statistics across all platforms (web and Discord bot)';
COMMENT ON TABLE game_history IS 'Individual game records for history and analytics';
COMMENT ON COLUMN user_stats.discord_id IS 'Discord user ID - primary key for cross-platform tracking';
COMMENT ON COLUMN user_stats.total_score IS 'Combined score from all games (primarily DA&D points)';
COMMENT ON COLUMN game_history.platform IS 'Platform where game was played: web or discord';
COMMENT ON COLUMN game_history.player_ids IS 'Array of Discord IDs of all players in the game';

-- Newsletter Subscribers Table
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  email_hash TEXT PRIMARY KEY, -- SHA-256 hash of email for privacy
  subscribed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  unsubscribed_at TIMESTAMPTZ
);

-- Stripe Subscriptions Table
CREATE TABLE IF NOT EXISTS subscriptions (
  user_id TEXT PRIMARY KEY, -- Can be Discord ID or other identifier
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  status TEXT NOT NULL, -- active, trialing, cancelled, expired, founder
  trial_end TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_id ON subscriptions(stripe_customer_id);

-- Trigger for subscriptions updated_at
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Beta Signups Table
-- Stores beta program registrations from the web signup form
CREATE TABLE IF NOT EXISTS beta_signups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  discord_username TEXT,
  interests TEXT[],
  experience_level TEXT,
  feedback_preference TEXT,
  referral_source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for beta_signups
CREATE INDEX IF NOT EXISTS idx_beta_signups_created ON beta_signups(created_at DESC);

-- RLS for beta_signups
ALTER TABLE beta_signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can insert beta_signups"
  ON beta_signups FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can read beta_signups"
  ON beta_signups FOR SELECT
  USING (auth.role() = 'service_role');

-- Vault Analytics Table
-- Lightweight anonymous usage analytics for the Auto-Vault userscript (opt-in only)
CREATE TABLE IF NOT EXISTS vault_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event TEXT NOT NULL CHECK (event IN ('start', 'stop')),
  script_version TEXT NOT NULL,
  site_domain TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for vault_analytics
CREATE INDEX IF NOT EXISTS idx_vault_analytics_event ON vault_analytics(event);
CREATE INDEX IF NOT EXISTS idx_vault_analytics_created ON vault_analytics(created_at DESC);

-- RLS for vault_analytics
ALTER TABLE vault_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can insert vault_analytics"
  ON vault_analytics FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can read vault_analytics"
  ON vault_analytics FOR SELECT
  USING (auth.role() = 'service_role');

-- ============================================================
-- JustTheTip Credit System Tables
-- Custodial credit balance model for low-friction tipping
-- ============================================================

-- Credit Balances — one row per user
CREATE TABLE IF NOT EXISTS credit_balances (
  discord_id TEXT PRIMARY KEY,
  balance_lamports BIGINT DEFAULT 0 NOT NULL CHECK (balance_lamports >= 0),
  wallet_address TEXT,
  last_activity_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  refund_mode TEXT DEFAULT 'reset-on-activity' NOT NULL CHECK (refund_mode IN ('reset-on-activity', 'hard-expiry')),
  hard_expiry_at TIMESTAMPTZ,
  inactivity_days INTEGER DEFAULT 7 NOT NULL,
  total_deposited_lamports BIGINT DEFAULT 0 NOT NULL,
  total_withdrawn_lamports BIGINT DEFAULT 0 NOT NULL,
  total_tipped_lamports BIGINT DEFAULT 0 NOT NULL,
  total_fees_lamports BIGINT DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for credit_balances
CREATE INDEX IF NOT EXISTS idx_credit_balances_last_activity ON credit_balances(last_activity_at);
CREATE INDEX IF NOT EXISTS idx_credit_balances_wallet ON credit_balances(wallet_address);

-- Trigger for credit_balances updated_at
CREATE TRIGGER update_credit_balances_updated_at
  BEFORE UPDATE ON credit_balances
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS for credit_balances
ALTER TABLE credit_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for credit_balances"
  ON credit_balances FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert credit_balances"
  ON credit_balances FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update credit_balances"
  ON credit_balances FOR UPDATE
  USING (auth.role() = 'service_role');

-- Credit Transactions — immutable audit log
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  discord_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'deposit', 'tip_send', 'tip_receive', 'airdrop_send', 'airdrop_receive',
    'withdraw', 'refund', 'fee', 'pending_hold', 'pending_release', 'pending_refund'
  )),
  amount_lamports BIGINT NOT NULL,
  balance_after_lamports BIGINT NOT NULL,
  counterparty_id TEXT,
  on_chain_signature TEXT,
  memo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for credit_transactions
CREATE INDEX IF NOT EXISTS idx_credit_tx_discord_id ON credit_transactions(discord_id);
CREATE INDEX IF NOT EXISTS idx_credit_tx_type ON credit_transactions(type);
CREATE INDEX IF NOT EXISTS idx_credit_tx_created ON credit_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_tx_signature ON credit_transactions(on_chain_signature);

-- RLS for credit_transactions
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for credit_transactions"
  ON credit_transactions FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert credit_transactions"
  ON credit_transactions FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Pending Tips — tips held for walletless recipients
CREATE TABLE IF NOT EXISTS pending_tips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  amount_lamports BIGINT NOT NULL,
  fee_lamports BIGINT DEFAULT 0 NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'claimed', 'refunded', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for pending_tips
CREATE INDEX IF NOT EXISTS idx_pending_tips_recipient ON pending_tips(recipient_id);
CREATE INDEX IF NOT EXISTS idx_pending_tips_sender ON pending_tips(sender_id);
CREATE INDEX IF NOT EXISTS idx_pending_tips_status ON pending_tips(status);
CREATE INDEX IF NOT EXISTS idx_pending_tips_expires ON pending_tips(expires_at);

-- RLS for pending_tips
ALTER TABLE pending_tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for pending_tips"
  ON pending_tips FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert pending_tips"
  ON pending_tips FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update pending_tips"
  ON pending_tips FOR UPDATE
  USING (auth.role() = 'service_role');

-- ============================================================
-- Atomic RPC Functions for Credit System
-- ============================================================

-- credit_balance: atomically upsert balance and log transaction
CREATE OR REPLACE FUNCTION credit_balance(
  p_discord_id TEXT,
  p_amount BIGINT,
  p_type TEXT,
  p_memo TEXT DEFAULT NULL,
  p_counterparty_id TEXT DEFAULT NULL,
  p_signature TEXT DEFAULT NULL
) RETURNS TABLE (new_balance BIGINT, tx_id UUID) AS $$
DECLARE
  v_balance BIGINT;
  v_tx_id UUID;
BEGIN
  -- Upsert credit balance with row lock
  INSERT INTO credit_balances (discord_id, balance_lamports, last_activity_at)
  VALUES (p_discord_id, p_amount, NOW())
  ON CONFLICT (discord_id) DO UPDATE SET
    balance_lamports = credit_balances.balance_lamports + p_amount,
    last_activity_at = NOW()
  RETURNING balance_lamports INTO v_balance;

  -- Update lifetime stats based on type
  IF p_type = 'deposit' THEN
    UPDATE credit_balances SET total_deposited_lamports = total_deposited_lamports + p_amount WHERE discord_id = p_discord_id;
  ELSIF p_type = 'tip_receive' OR p_type = 'airdrop_receive' OR p_type = 'pending_release' THEN
    -- No lifetime stat for receives (tracked on sender side)
    NULL;
  END IF;

  -- Log the transaction
  INSERT INTO credit_transactions (discord_id, type, amount_lamports, balance_after_lamports, counterparty_id, on_chain_signature, memo)
  VALUES (p_discord_id, p_type, p_amount, v_balance, p_counterparty_id, p_signature, p_memo)
  RETURNING id INTO v_tx_id;

  RETURN QUERY SELECT v_balance, v_tx_id;
END;
$$ LANGUAGE plpgsql;

-- debit_balance: atomically deduct balance with sufficient-funds check
CREATE OR REPLACE FUNCTION debit_balance(
  p_discord_id TEXT,
  p_amount BIGINT,
  p_type TEXT,
  p_memo TEXT DEFAULT NULL,
  p_counterparty_id TEXT DEFAULT NULL,
  p_signature TEXT DEFAULT NULL
) RETURNS TABLE (new_balance BIGINT, tx_id UUID) AS $$
DECLARE
  v_balance BIGINT;
  v_tx_id UUID;
BEGIN
  -- Lock the row and check balance
  SELECT balance_lamports INTO v_balance
  FROM credit_balances
  WHERE discord_id = p_discord_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No credit balance found for user %', p_discord_id;
  END IF;

  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance: have % lamports, need %', v_balance, p_amount;
  END IF;

  -- Deduct
  v_balance := v_balance - p_amount;
  UPDATE credit_balances SET
    balance_lamports = v_balance,
    last_activity_at = NOW()
  WHERE discord_id = p_discord_id;

  -- Update lifetime stats based on type
  IF p_type = 'tip_send' OR p_type = 'airdrop_send' THEN
    UPDATE credit_balances SET total_tipped_lamports = total_tipped_lamports + p_amount WHERE discord_id = p_discord_id;
  ELSIF p_type = 'withdraw' OR p_type = 'refund' THEN
    UPDATE credit_balances SET total_withdrawn_lamports = total_withdrawn_lamports + p_amount WHERE discord_id = p_discord_id;
  ELSIF p_type = 'fee' THEN
    UPDATE credit_balances SET total_fees_lamports = total_fees_lamports + p_amount WHERE discord_id = p_discord_id;
  END IF;

  -- Log the transaction (negative amount for debits)
  INSERT INTO credit_transactions (discord_id, type, amount_lamports, balance_after_lamports, counterparty_id, on_chain_signature, memo)
  VALUES (p_discord_id, p_type, -p_amount, v_balance, p_counterparty_id, p_signature, p_memo)
  RETURNING id INTO v_tx_id;

  RETURN QUERY SELECT v_balance, v_tx_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Safety & Accountability System
-- ============================================================

-- User Buddies (Phone a Friend System)
-- Allows a user to link a "buddy" who is notified during high-risk activity
CREATE TABLE IF NOT EXISTS user_buddies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT REFERENCES user_stats(discord_id) ON DELETE CASCADE,
  buddy_id TEXT REFERENCES user_stats(discord_id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'removed')),
  alert_thresholds JSONB DEFAULT '{"tilt_score_exceeds": 80, "losses_in_24h_sol": 5.0, "zero_balance_reached": true}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, buddy_id)
);

-- Indexes for user_buddies
CREATE INDEX IF NOT EXISTS idx_user_buddies_user ON user_buddies(user_id);
CREATE INDEX IF NOT EXISTS idx_user_buddies_buddy ON user_buddies(buddy_id);

-- Trigger for user_buddies updated_at
CREATE TRIGGER update_user_buddies_updated_at 
  BEFORE UPDATE ON user_buddies 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- RLS for user_buddies
ALTER TABLE user_buddies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own buddy links"
  ON user_buddies FOR SELECT
  USING (auth.uid()::text = user_id OR auth.uid()::text = buddy_id);

CREATE POLICY "Service role can manage user_buddies"
  ON user_buddies FOR ALL
  USING (auth.role() = 'service_role');

-- Zero Balance Tasks
-- Tracks cooling off tasks prompts when a user hits zero balance
CREATE TABLE IF NOT EXISTS zero_balance_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  discord_id TEXT REFERENCES user_stats(discord_id) ON DELETE CASCADE,
  task_type TEXT NOT NULL CHECK (task_type IN ('cooling_period', 'tutorial_quiz', 'responsible_gaming_read')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'bypassed')),
  expires_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for zero_balance_tasks
CREATE INDEX IF NOT EXISTS idx_zero_balance_tasks_user ON zero_balance_tasks(discord_id);
CREATE INDEX IF NOT EXISTS idx_zero_balance_tasks_status ON zero_balance_tasks(status);

-- RLS for zero_balance_tasks
ALTER TABLE zero_balance_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for zero_balance_tasks"
  ON zero_balance_tasks FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage zero_balance_tasks"
  ON zero_balance_tasks FOR ALL
  USING (auth.role() = 'service_role');
