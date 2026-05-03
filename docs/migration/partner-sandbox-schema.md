<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-03 -->

# Partner Sandbox Schema Notes

The self-serve RGaaS sandbox flow assumes the `partners` table includes the following columns in addition to the legacy partner fields:

- `contact_email text null`
- `casino_domain text null`
- `intended_use_case text null`
- `mode text not null default 'production'`
- `registered_via text null`
- `email_verified_at timestamptz null`
- `verification_token_jti text null`
- `verification_token_expires_at timestamptz null`
- `verification_token_consumed_at timestamptz null`
- `daily_quota_limit integer null`
- `daily_quota_used integer null`
- `quota_window_started_at timestamptz null`
- `last_production_access_requested_at timestamptz null`

Recommended SQL slice:

```sql
ALTER TABLE partners
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS casino_domain text,
  ADD COLUMN IF NOT EXISTS intended_use_case text,
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'production',
  ADD COLUMN IF NOT EXISTS registered_via text,
  ADD COLUMN IF NOT EXISTS email_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verification_token_jti text,
  ADD COLUMN IF NOT EXISTS verification_token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS verification_token_consumed_at timestamptz,
  ADD COLUMN IF NOT EXISTS daily_quota_limit integer,
  ADD COLUMN IF NOT EXISTS daily_quota_used integer,
  ADD COLUMN IF NOT EXISTS quota_window_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_production_access_requested_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_partners_contact_email ON partners (lower(contact_email));
CREATE UNIQUE INDEX IF NOT EXISTS idx_partners_verification_token_jti ON partners (verification_token_jti)
WHERE verification_token_jti IS NOT NULL;
```

Risk notes:

- Replay protection depends on `verification_token_consumed_at` being persisted and checked atomically.
- Sandbox quota tracking depends on `daily_quota_used` and `quota_window_started_at` living on the partner row.
- If these columns are missing, the sandbox onboarding flow will fail before key issuance instead of silently issuing unsafe credentials.
