-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-01
-- Optional production persistence for /ask share permalinks (7-day TTL).

CREATE TABLE IF NOT EXISTS intel_share_snapshots (
  token TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  blocks JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS intel_share_snapshots_expires_at_idx
  ON intel_share_snapshots (expires_at);
