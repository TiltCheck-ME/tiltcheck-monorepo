# FreeSpinScan Module

This module provides the `FreeSpinScanModule` class for promo code submission and validation in the TiltCheck ecosystem. It is event-driven, modular, and ready for migration and expansion.

## API

### `FreeSpinScanModule`
- `constructor()`
  - Subscribes to `promo.submitted` events and binds the handler.
- `submitPromo({ userId, url, bonusType, notes, casino }): Promise<Submission>`
  - Publishes a `promo.submitted` event with promo details, scans via SusLink, and stores submission.
- `blockDomain(domain: string)` / `unblockDomain(domain: string)`
  - Admin methods to block/unblock domains from promo submissions.
- `blockPattern(pattern: string)` / `unblockPattern(pattern: string)`
  - Admin methods to block/unblock URL patterns from promo submissions.

## Discord Bot Commands
- `/blockdomain <domain>` — Block a domain from promo submissions
- `/unblockdomain <domain>` — Unblock a domain
- `/blockpattern <pattern>` — Block a URL pattern
- `/unblockpattern <pattern>` — Unblock a URL pattern

## Blocklist Logic
- Promo submissions are checked against the blocklist before scanning/approval.
- Blocked links are auto-denied and logged with a reason.
- Blocklist is configurable by admins/mods via Discord commands.

## Event Flow
- On `promo.submitted`, the module logs the event and publishes a `promo.approved` event as a placeholder for future logic.

## Usage
```ts
import { freespinscan } from './src/index';
await freespinscan.submitPromo('userA', 'FS2025', 'stake');
```

## Migration Notes
- All logic is placeholder; replace with real validation and approval flows as code is migrated.
- Non-custodial flow enforced—no funds are held by the module.

## Test Coverage
- Minimal smoke test ensures event subscription and method presence.
- Ready for expansion as real promo logic is added.

---
TiltCheck Ecosystem © 2024–2025. For architecture and migration details, see `/docs/tiltcheck/`.
