# Data Strategy Decision (Compute-First)

Last updated: 2026-03-07
Status: approved

## Decision

- Start with compute-first migration on GCP Cloud Run.
- Keep existing managed data vendors initially.
- Move to full GCP data plane in milestone-based phases (no fixed day count).

## Why This Strategy

- Lowest immediate migration risk for a solo operator.
- Keeps service cutover focused on compute, routing, and secrets first.
- Preserves optionality while collecting real cost and reliability data.

## Current vs Target by Phase

- Phase A (compute-first):
  - Compute -> GCP Cloud Run
  - Data -> existing providers (temporary)
- Phase B (data migration milestones):
  - Postgres -> Cloud SQL (if selected after pilot)
  - Redis -> Memorystore (if scaling requires it)
  - Search -> GCP-hosted/managed search option

## Milestone Exit Criteria (to start full data migration)

- Cloud Run services stable for at least one milestone cycle.
- Budget trend remains within credit-safe thresholds.
- Error rates and latency meet operational baseline.
- Rollback path verified for at least one service.

## Revisit Triggers

- Cost trends exceed approved budget thresholds.
- Reliability degrades after compute migration.
- New compliance/security requirement mandates faster data consolidation.
