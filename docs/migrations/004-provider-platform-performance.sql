-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-06
-- Migration 004: Provider-Platform Performance Table
--
-- Tracks the per-provider, per-game, per-platform RTP configuration so the
-- Casino Trust Engine can calculate a discrepancy_score for each casino
-- relative to the provider's documented maximum RTP setting.
--
-- This is the persistent counterpart to the in-memory ProviderRtpState tracked
-- by CollectClock. A background writer (e.g. apps/api or apps/trust-rollup)
-- upserts rows here whenever an rtp.report.submitted event is processed.
--
-- Key insight: the same provider (e.g. 'Pragmatic Play') and game
-- (e.g. 'Gates of Olympus') can appear on multiple platforms with different
-- advertised_rtp values. This table makes that difference queryable.
--
-- Run in Supabase SQL Editor or apply via migration runner.

-- ============================================================
-- 1. Canonical platform registry (one row per casino domain)
-- ============================================================
CREATE TABLE IF NOT EXISTS platforms (
  id         BIGSERIAL PRIMARY KEY,
  platform_url  TEXT NOT NULL UNIQUE,  -- e.g. 'stake.com'
  platform_name TEXT NOT NULL,         -- e.g. 'Stake'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE platforms IS 'Canonical list of casino/platform domains tracked by TiltCheck.';
COMMENT ON COLUMN platforms.platform_url IS 'Primary domain key used across all RTP and trust tables.';

-- ============================================================
-- 2. Provider-Platform Performance table
-- ============================================================
CREATE TABLE IF NOT EXISTS provider_platform_performance (
  id                      BIGSERIAL PRIMARY KEY,

  -- Provider + game identity
  provider_name           TEXT NOT NULL,  -- e.g. 'Pragmatic Play'
  game_slug               TEXT NOT NULL,  -- URL-safe identifier, e.g. 'gates-of-olympus'
  game_title              TEXT NOT NULL,  -- Display name, e.g. 'Gates of Olympus'

  -- Platform (FK to platforms table)
  platform_id             BIGINT NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,

  -- RTP figures (percentages, e.g. 96.50)
  advertised_rtp          NUMERIC(5, 2) NOT NULL,
    -- The RTP value visible in the game info panel on this specific platform.
    -- Set by the operator from the provider's menu of options.

  observed_rtp_aggregate  NUMERIC(5, 2),
    -- Average actual return computed from aggregated session event data.
    -- NULL until enough sessions have been recorded (see sample_size).

  -- Derived discrepancy (positive = platform paying less than advertised)
  discrepancy_score       NUMERIC(5, 2) GENERATED ALWAYS AS (
    CASE
      WHEN observed_rtp_aggregate IS NOT NULL
        THEN advertised_rtp - observed_rtp_aggregate
      ELSE NULL
    END
  ) STORED,

  -- Provider's documented maximum (fairest) RTP setting for this game.
  -- Used to compute the "nerf delta" vs the platform's current setting.
  provider_max_rtp        NUMERIC(5, 2),

  -- Weighted RTP delta: how many percentage points below provider_max_rtp
  -- this platform is running (NULL until provider_max_rtp is known).
  -- Calculated as: provider_max_rtp - advertised_rtp
  weighted_rtp_delta      NUMERIC(5, 2) GENERATED ALWAYS AS (
    CASE
      WHEN provider_max_rtp IS NOT NULL
        THEN provider_max_rtp - advertised_rtp
      ELSE NULL
    END
  ) STORED,

  -- Metadata
  sample_size             INTEGER NOT NULL DEFAULT 0,
    -- Number of individual session data points feeding observed_rtp_aggregate.

  reported_by_count       INTEGER NOT NULL DEFAULT 0,
    -- Number of community members (or extension runs) that reported advertised_rtp.

  last_reported_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Each provider/game/platform combination is unique
  CONSTRAINT uq_provider_game_platform UNIQUE (provider_name, game_slug, platform_id)
);

COMMENT ON TABLE provider_platform_performance IS
  'Per-provider, per-game, per-platform RTP tracking. '
  'Enables the Casino Trust Engine to compute discrepancy_score and weighted_rtp_delta '
  'showing how a casino''s RTP setting compares to the provider''s maximum.';

COMMENT ON COLUMN provider_platform_performance.provider_name        IS 'Game software provider, e.g. ''Pragmatic Play'', ''Hacksaw''.';
COMMENT ON COLUMN provider_platform_performance.game_slug            IS 'URL-safe game identifier, e.g. ''gates-of-olympus''.';
COMMENT ON COLUMN provider_platform_performance.platform_id          IS 'FK to platforms.id (casino domain).';
COMMENT ON COLUMN provider_platform_performance.advertised_rtp       IS 'RTP shown in game info panel on this platform (operator-set).';
COMMENT ON COLUMN provider_platform_performance.observed_rtp_aggregate IS 'Average real return from aggregated session data.';
COMMENT ON COLUMN provider_platform_performance.discrepancy_score    IS 'advertised_rtp - observed_rtp_aggregate; positive = paying below advertised.';
COMMENT ON COLUMN provider_platform_performance.provider_max_rtp     IS 'Provider''s highest available RTP configuration (the ''fair'' setting).';
COMMENT ON COLUMN provider_platform_performance.weighted_rtp_delta   IS 'provider_max_rtp - advertised_rtp; positive = platform running a nerfed version.';

-- ============================================================
-- 3. Indexes for common query patterns
-- ============================================================

-- Lookup all games from a specific provider on a specific platform
CREATE INDEX IF NOT EXISTS idx_ppp_provider_platform
  ON provider_platform_performance (provider_name, platform_id);

-- Lookup all platforms running a specific game (cross-platform comparison)
CREATE INDEX IF NOT EXISTS idx_ppp_game_slug
  ON provider_platform_performance (game_slug);

-- Sort by worst discrepancy (trust engine ranking)
CREATE INDEX IF NOT EXISTS idx_ppp_discrepancy
  ON provider_platform_performance (discrepancy_score DESC NULLS LAST);

-- Sort by worst weighted_rtp_delta (nerf ranking)
CREATE INDEX IF NOT EXISTS idx_ppp_weighted_rtp_delta
  ON provider_platform_performance (weighted_rtp_delta DESC NULLS LAST);

-- ============================================================
-- 4. updated_at auto-trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_provider_platform_performance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ppp_updated_at
  BEFORE UPDATE ON provider_platform_performance
  FOR EACH ROW
  EXECUTE FUNCTION update_provider_platform_performance_updated_at();

-- ============================================================
-- 5. Row-Level Security
-- ============================================================
ALTER TABLE platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_platform_performance ENABLE ROW LEVEL SECURITY;

-- Public read: any authenticated or anonymous user can read RTP data
CREATE POLICY "Public read access"
  ON provider_platform_performance
  FOR SELECT
  USING (true);

CREATE POLICY "Public read access"
  ON platforms
  FOR SELECT
  USING (true);

-- Write restricted to service role (backend only)
-- INSERT/UPDATE/DELETE require service_role JWT or direct DB connection.

-- ============================================================
-- 6. Seed initial platform records for known casinos
-- ============================================================
INSERT INTO platforms (platform_url, platform_name) VALUES
  ('stake.com',    'Stake'),
  ('roobet.com',   'Roobet'),
  ('rollbit.com',  'Rollbit'),
  ('duelbits.com', 'Duelbits'),
  ('bc.game',      'BC.Game'),
  ('shuffle.com',  'Shuffle')
ON CONFLICT (platform_url) DO UPDATE SET
  platform_name = EXCLUDED.platform_name,
  updated_at    = now();
