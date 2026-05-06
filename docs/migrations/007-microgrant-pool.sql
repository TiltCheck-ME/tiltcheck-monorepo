-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-06
-- Ledger mirror for recovery microgrant fund credits (LockVault paid early-unlock routing uses apps/api/src/services/community-pools.ts).

CREATE TABLE IF NOT EXISTS microgrant_pool (
  id text PRIMARY KEY DEFAULT 'main',
  balance double precision NOT NULL DEFAULT 0,
  contributions bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
