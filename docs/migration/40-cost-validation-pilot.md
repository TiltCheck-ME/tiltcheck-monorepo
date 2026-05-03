<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-03 -->

# Cost Validation Pilot (2-4 Weeks)

Last updated: 2026-03-07
Mode: credit-safe (`$300` hybrid cap)

## Objective

Measure real migration operating cost and stability before expanding scope.

## Pilot Scope

- In-scope services:
  - `api`
  - `discord-bot`
  - `web`
  - optional: `trust-rollup`, `comic-generator`
- Out-of-scope:
  - full data-plane migration (Cloud SQL/Memorystore/search move)

## Metrics to Capture

- Managed runtime cost by service
- Build and Artifact Registry cost
- Logging and monitoring cost
- Network egress and load balancer cost
- Service reliability:
  - uptime
  - error rate
  - p95 latency (where available)

## Cadence

- Milestone-only checkpoints (not daily/weekly fixed schedule)
- Log each checkpoint in:
  - `docs/migration/logs/milestone-log.md`
  - `docs/migration/logs/cost-pilot.csv`

## Budget Gates

- `$120`: pause non-essential environments and reduce noisy logs
- `$200`: freeze new migrations, focus on stabilization/cost reduction
- `$260`: go/no-go review before adding scope
- `$300`: hard stop for normal work (safety/rollback exception only)

## Exit Criteria

- At least two milestone checkpoints with stable service health.
- Cost trend is predictable and within approved cap policy.
- Updated monthly ROM estimate with observed values.

## Output

- Pilot summary document with:
  - observed spend by category
  - reliability observations
  - recommendation for next milestone
