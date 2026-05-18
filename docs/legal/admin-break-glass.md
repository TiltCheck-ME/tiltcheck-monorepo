# Admin break-glass (wallet lock)

© 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-18

## Policy

- Admin wallet unlock approval is **rare** break-glass — not routine support.
- Every approval writes `WALLET_LOCK_ADMIN_APPROVE` to `audit_logs` and a user-visible `admin_wallet_unlock_approved` power event.
- Users who chose **timer-only** (`hardLock`) locks have **no** admin or paid early exit until the timer ends.

## User visibility

- Hub LockVault and dashboard vault lane show **Power activity** from `GET /vault/:userId/power-events`.
- Discord: `/walletlock status` links to the dashboard for live state.

## Notification (future)

In-app banner or email when admin break-glass is used against a user's lock is planned; not required for v1 audit remediation.
