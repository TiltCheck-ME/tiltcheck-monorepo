# Data consent and complianceBypass policy

© 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-18

## dataSharing flags

Users opt in per category: message contents, financial data, session telemetry. Defaults are conservative.

## complianceBypass

**Purpose:** Staging and compliance testing only — forces all sharing flags on for test accounts.

| Control | Value |
|---------|--------|
| Production default | **Off** (`COMPLIANCE_BYPASS_ALLOWED=false`) |
| Who may enable | `admin` or `compliance_tester` roles only |
| Audit | Every enable/disable writes `COMPLIANCE_BYPASS_CHANGE` to `audit_logs` |
| Client exposure | Non-admins always see `complianceBypass: false` in API responses |

## Related

- [custody-matrix.md](./custody-matrix.md)
- API: `apps/api/src/lib/compliance-bypass.ts`, `apps/api/src/routes/me.ts`
