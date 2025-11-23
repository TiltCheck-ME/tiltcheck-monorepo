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

-- Game history indexes
CREATE INDEX IF NOT EXISTS idx_game_history_winner ON game_history(winner_id);
CREATE INDEX IF NOT EXISTS idx_game_history_type ON game_history(game_type);
CREATE INDEX IF NOT EXISTS idx_game_history_platform ON game_history(platform);
CREATE INDEX IF NOT EXISTS idx_game_history_completed ON game_history(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_history_players ON game_history USING GIN(player_ids);

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

-- Row Level Security (RLS) Policies
-- Enable RLS
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_history ENABLE ROW LEVEL SECURITY;

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
