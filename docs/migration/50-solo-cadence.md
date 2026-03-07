# Solo Operator Cadence

Last updated: 2026-03-07
Cadence mode: milestone-only

## Rules

- No fixed daily or weekly schedule.
- Create a checkpoint only after a meaningful migration slice.
- Keep each checkpoint short and objective.

## Required Checkpoint Artifacts

- `docs/migration/logs/milestone-log.md`
- `docs/migration/logs/cost-pilot.csv` (cost note per milestone)
- `docs/migration/decision-log.md` (if a new decision is made)

## Definition of Meaningful Slice

Any one of:

- one service deployed and verified
- one policy control implemented and validated
- one budget/risk gate action completed
- one migration blocker resolved with documented outcome

## Fast Workflow

1. Run work for one slice.
2. Add `MS-*` entry to milestone log.
3. Add cost note row.
4. Add/update `DEC-*` entry if a new decision was required.
