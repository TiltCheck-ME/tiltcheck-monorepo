-- TiltCheck Identity Schema
CREATE TABLE IF NOT EXISTS users (
  discord_id TEXT PRIMARY KEY,
  tiltcheck_id TEXT NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_tiltcheck_id ON users(tiltcheck_id);
