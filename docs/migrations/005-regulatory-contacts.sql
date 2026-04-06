-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-06
-- Migration 005: Regulatory Contacts Table
--
-- Maps casino license numbers to the correct licensing authority and complaint URLs.
-- A complaint filed with the wrong body (e.g. MGA for a Curacao-licensed casino) is
-- a waste of time. This table ensures the LegalTrigger always points to the right regulator.
--
-- Source of truth: MGA Licensee Register (https://www.mga.org.mt/licensee-hub/licensee-register/)
-- and Curacao eGaming public license list.

CREATE TABLE IF NOT EXISTS regulatory_bodies (
  id             BIGSERIAL PRIMARY KEY,
  authority_key  TEXT NOT NULL UNIQUE,  -- normalized key (e.g. 'curacao', 'mga')
  display_name   TEXT NOT NULL,
  jurisdiction   TEXT NOT NULL,         -- e.g. 'Curacao', 'Malta', 'United Kingdom'
  player_hub_url TEXT NOT NULL,
  complaint_url  TEXT NOT NULL,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE regulatory_bodies IS 'Canonical list of gambling regulatory bodies with complaint contact URLs.';

INSERT INTO regulatory_bodies (authority_key, display_name, jurisdiction, player_hub_url, complaint_url) VALUES
  ('mga',       'Malta Gaming Authority',                   'Malta',          'https://www.mga.org.mt/player-hub/',                   'https://www.mga.org.mt/player-hub/submit-a-complaint/'),
  ('ukgc',      'UK Gambling Commission',                   'United Kingdom', 'https://www.gamblingcommission.gov.uk/contact-us',      'https://www.gamblingcommission.gov.uk/consumers/how-to-complain-about-a-gambling-business'),
  ('curacao',   'Curacao eGaming',                          'Curacao',        'https://www.curacao-egaming.com/contact',               'https://www.curacao-egaming.com/dispute-resolution'),
  ('antillephone', 'Antillephone N.V.',                     'Curacao',        'https://antillephone.com/contact/',                     'https://antillephone.com/dispute-resolution/'),
  ('kahnawake', 'Kahnawake Gaming Commission',              'Canada',         'https://www.kahnawake.com/gambling/dispute.asp',        'https://www.kahnawake.com/gambling/dispute.asp'),
  ('gibraltar', 'Gibraltar Regulatory Authority',           'Gibraltar',      'https://www.gra.gi/gambling/contact',                  'https://www.gra.gi/gambling/complaints'),
  ('iom',       'Isle of Man Gambling Supervision Commission', 'Isle of Man', 'https://www.iomgsc.im/contact',                         'https://www.iomgsc.im/players/make-complaint'),
  ('agcc',      'Alderney Gambling Control Commission',     'Alderney',       'https://www.agcc.gg/contact-us',                       'https://www.agcc.gg/player-protection')
ON CONFLICT (authority_key) DO UPDATE SET
  display_name   = EXCLUDED.display_name,
  complaint_url  = EXCLUDED.complaint_url,
  player_hub_url = EXCLUDED.player_hub_url;

-- ============================================================
-- License registry: maps license_number -> regulatory body
-- ============================================================
CREATE TABLE IF NOT EXISTS regulatory_contacts (
  id               BIGSERIAL PRIMARY KEY,
  license_number   TEXT NOT NULL UNIQUE,  -- e.g. '8048/JAZ', 'MGA/B2C/196/2010'
  authority_key    TEXT NOT NULL REFERENCES regulatory_bodies(authority_key),
  casino_name      TEXT,
  platform_url     TEXT,
  notes            TEXT,
  verified_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rc_platform_url ON regulatory_contacts (platform_url);
CREATE INDEX IF NOT EXISTS idx_rc_authority    ON regulatory_contacts (authority_key);

COMMENT ON TABLE regulatory_contacts IS
  'Maps casino license numbers to their regulatory body. '
  'Used by LegalTrigger to route complaints to the correct authority.';

-- Seed known casino licenses (sourced from casino footer disclosures)
INSERT INTO regulatory_contacts (license_number, authority_key, casino_name, platform_url) VALUES
  ('8048/JAZ',              'curacao',   'Stake',     'stake.com'),
  ('8048/JAZ2016-065',      'curacao',   'Roobet',    'roobet.com'),
  ('365/JAZ',               'curacao',   'Rollbit',   'rollbit.com'),
  ('365/JAZ',               'curacao',   'Duelbits',  'duelbits.com'),
  ('5536/JAZ',              'curacao',   'BC.Game',   'bc.game'),
  ('8048/JAZ',              'curacao',   'Shuffle',   'shuffle.com'),
  ('MGA/B2C/196/2010',      'mga',       'LeoVegas',  'leovegas.com'),
  ('MGA/B2C/213/2011',      'mga',       'Casumo',    'casumo.com'),
  ('39430',                 'ukgc',      'Bet365',    'bet365.com'),
  ('MGA/CRP/148/2007',      'mga',       '888casino', '888casino.com')
ON CONFLICT (license_number) DO NOTHING;

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_regulatory_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rc_updated_at
  BEFORE UPDATE ON regulatory_contacts
  FOR EACH ROW EXECUTE FUNCTION update_regulatory_contacts_updated_at();

ALTER TABLE regulatory_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_bodies   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read" ON regulatory_contacts FOR SELECT USING (true);
CREATE POLICY "Public read" ON regulatory_bodies   FOR SELECT USING (true);
