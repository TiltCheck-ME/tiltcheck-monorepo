<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-17 -->
# TiltCheck MVP Release Notes (External)

## Highlights

- Improved reliability for core TiltCheck experiences across web, extension, and vault flows.
- Updated site navigation to focus on active MVP pages and onboarding.
- Expanded beta-tool visibility with clearer entry points to core tools.
- Improved release stability through stronger deployment guardrails and health checks.

## What’s New

- **Cleaner web experience**
  - Navigation and footer links now point to current, active pages.
  - Getting-started and beta pages are now easier to find.
  - Login and onboarding paths were simplified for faster access.
- **More stable wallet interactions**
  - Transaction request handling in the extension is more resilient under slow/no-response conditions.
- **Operational hardening**
  - Release process now includes explicit smoke checks for beta and core tool pages.
  - Health-check-first release flow and safer rollback guidance are in place.

## Impact

- Users should see fewer dead-end links and clearer routes into MVP features.
- Beta users get more consistent access to key tools:
  - `/beta-tester`
  - `/tools/justthetip`
  - `/tools/domain-verifier`
  - `/tools/collectclock`
  - `/tools/verify`

## No Action Required

No migration or configuration steps are required for end users in this release.
