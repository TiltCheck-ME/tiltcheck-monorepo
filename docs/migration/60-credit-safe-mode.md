# Credit-Safe Migration Mode

Last updated: 2026-03-07
Policy: hybrid cap, max `$300` for normal migration activity

## Budget Control Model

- Hard stop for normal migration activity at `$300`.
- Exception: emergency rollback/safety operations.
- Threshold actions:
  - `$120`: pause non-essential environments
  - `$200`: freeze new scope
  - `$260`: run go/no-go review
  - `$300`: hard stop

## Required Setup

- Budget alerts at 40/60/80/90/100%
- Label all resources for service-level visibility
- Keep `min-instances=0` where possible
- Record milestone cost note on each checkpoint

## Scripts

- `scripts/gcp/create-budget-alerts.sh`
- `scripts/gcp/create-budget-alerts.ps1`

## Overage Rule

- Any change expected to increase monthly run-rate by more than 20% requires a new `DEC-*` approval entry before execution.
