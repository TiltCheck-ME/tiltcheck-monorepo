<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-17 -->

# MVP launch doc sync

Copy these files from v1 monorepo (`TiltCheck-ME/tiltcheck-monorepo`) into this MVP repo after merging the launch PR on v1.

## Files to copy

| Source (v1 monorepo) | Destination (MVP repo) |
|----------------------|------------------------|
| `docs/LAUNCH-CHECKLIST.md` | `docs/LAUNCH-CHECKLIST.md` |
| `docs/metrics-weekly.md` | `docs/metrics-weekly.md` |
| `docs/superpowers/specs/2026-06-17-launch-cutover-plan.md` | `docs/superpowers/specs/2026-06-17-launch-cutover-plan.md` |
| `docs/superpowers/plans/2026-06-17-launch-cutover-execution.md` | `docs/superpowers/plans/2026-06-17-launch-cutover-execution.md` |

## Path adjustments in copied spec

When copying `2026-06-17-launch-cutover-plan.md` into MVP, replace cross-repo links:

- `../../../tiltcheckmvp/docs/` → `./` or relative MVP paths
- `../../LAUNCH-CHECKLIST.md` → `../LAUNCH-CHECKLIST.md` (from `docs/superpowers/specs/`)

Or use the pre-adjusted copies in this folder's subdirectories.

## Operator entry point

**Start at:** [LAUNCH-CHECKLIST.md](./LAUNCH-CHECKLIST.md) (after sync)

Existing MVP ops detail remains in [manual-tasks.md](./manual-tasks.md) and [cutover-checklist.md](./cutover-checklist.md).
