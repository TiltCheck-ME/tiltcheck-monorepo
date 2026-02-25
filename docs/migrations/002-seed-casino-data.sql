-- Seed data for casino_data table
-- Run this in Supabase SQL Editor

INSERT INTO casino_data (domain, name, license_info, claimed_rtp, verified_rtp, status)
VALUES
  ('stake.com', 'Stake', '{"authority": "Curacao", "license_number": "8048/JAZ"}', 99.0, 98.5, 'active'),
  ('rollbit.com', 'Rollbit', '{"authority": "Curacao", "license_number": "365/JAZ"}', 98.0, 97.5, 'active'),
  ('duelbits.com', 'Duelbits', '{"authority": "Curacao", "license_number": "365/JAZ"}', 97.0, 96.5, 'active'),
  ('roobet.com', 'Roobet', '{"authority": "Curacao", "license_number": "8048/JAZ"}', 97.5, 96.0, 'active'),
  ('bc.game', 'BC.Game', '{"authority": "Curacao", "license_number": "5536/JAZ"}', 98.0, 97.0, 'active'),
  ('shuffle.com', 'Shuffle', '{"authority": "Curacao", "license_number": "8048/JAZ"}', 99.0, 98.0, 'active')
ON CONFLICT (domain) DO UPDATE SET
  name = EXCLUDED.name,
  license_info = EXCLUDED.license_info,
  claimed_rtp = EXCLUDED.claimed_rtp,
  verified_rtp = EXCLUDED.verified_rtp,
  status = EXCLUDED.status,
  updated_at = now();