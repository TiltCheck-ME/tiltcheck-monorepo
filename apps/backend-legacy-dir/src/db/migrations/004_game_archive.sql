-- Game Archive Data Schema
-- Stores personal gambling session data for AI pattern analysis

CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  
  -- Session metadata
  timestamp TIMESTAMPTZ NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Game details
  game_type TEXT NOT NULL,
  casino TEXT,
  stake_bet_id TEXT UNIQUE,
  
  -- Financial data
  bet_amount DECIMAL(20, 8) NOT NULL,
  win_amount DECIMAL(20, 8) NOT NULL DEFAULT 0,
  crypto_type TEXT NOT NULL,
  is_bonus_money BOOLEAN DEFAULT FALSE,
  
  -- Session tracking
  session_duration_minutes INTEGER DEFAULT 0,
  
  -- Indexes for fast pattern queries
  CONSTRAINT positive_amounts CHECK (bet_amount >= 0 AND win_amount >= 0)
);

-- Indexes for pattern analysis queries
CREATE INDEX IF NOT EXISTS idx_game_sessions_user_timestamp 
  ON game_sessions(user_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_game_sessions_game_type 
  ON game_sessions(game_type);

CREATE INDEX IF NOT EXISTS idx_game_sessions_crypto_type 
  ON game_sessions(crypto_type);

CREATE INDEX IF NOT EXISTS idx_game_sessions_bonus 
  ON game_sessions(is_bonus_money);

CREATE INDEX IF NOT EXISTS idx_game_sessions_hour 
  ON game_sessions(EXTRACT(HOUR FROM timestamp));

CREATE INDEX IF NOT EXISTS idx_game_sessions_dow 
  ON game_sessions(EXTRACT(DOW FROM timestamp));

-- RLS policies (admin only)
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view own game sessions" 
  ON game_sessions FOR SELECT 
  USING (auth.uid()::text = user_id OR user_id = 'admin');

CREATE POLICY "Admin can insert game sessions" 
  ON game_sessions FOR INSERT 
  WITH CHECK (auth.uid()::text = user_id OR user_id = 'admin');

CREATE POLICY "Admin can update own game sessions" 
  ON game_sessions FOR UPDATE 
  USING (auth.uid()::text = user_id OR user_id = 'admin');

CREATE POLICY "Admin can delete own game sessions" 
  ON game_sessions FOR DELETE 
  USING (auth.uid()::text = user_id OR user_id = 'admin');

-- Pattern insights cache (optional, for performance)
CREATE TABLE IF NOT EXISTS pattern_insights_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  insights JSONB NOT NULL,
  total_sessions INTEGER NOT NULL,
  date_range_start TIMESTAMPTZ,
  date_range_end TIMESTAMPTZ,
  
  -- Auto-expire after 1 hour
  CONSTRAINT fresh_insights CHECK (generated_at > NOW() - INTERVAL '1 hour')
);

CREATE INDEX IF NOT EXISTS idx_pattern_insights_user 
  ON pattern_insights_cache(user_id, generated_at DESC);
