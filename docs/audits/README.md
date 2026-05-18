# TiltCheck audit program

© 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-12

This folder tracks **who runs which audits**, **how often**, and **where artifacts land**. It turns the audit-type list into an operating program.

| Document | Purpose |
|----------|---------|
| [delegation-matrix.md](./delegation-matrix.md) | Owners, cadence, triggers, deliverables per audit type |
| [linear-title-catalog.md](./linear-title-catalog.md) | Copy-paste Linear titles per audit type |
| [../ethics/mission-alignment-audit-2026-05-12.md](../ethics/mission-alignment-audit-2026-05-12.md) | Ethics / mission alignment baseline (completed snapshot) |

**GitHub:** New issue — choose template **Scheduled audit (program)** (`.github/ISSUE_TEMPLATE/scheduled_audit.yml`).

**Artifact convention:** Store dated outputs under `docs/audits/artifacts/YYYY-MM-DD/<audit-type>/` (markdown or PDF exports). Do not commit raw pentest payloads or secrets.

**Escalation:** Any **Critical** finding blocks release until owner + security review sign off in the PR or incident channel.
