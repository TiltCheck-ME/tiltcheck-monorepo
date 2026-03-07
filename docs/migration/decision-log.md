# Migration Decision Log

Use this file to record approved decisions and avoid assumption drift between sessions/tools.

## Template

- Decision ID: `DEC-YYYYMMDD-XX`
- Topic:
- Context:
- Options considered:
  - A:
  - B:
  - C:
- Decision made:
- Rationale:
- Impact:
- Approver:
- Date:
- Revisit trigger:
- Status: proposed | approved | superseded

---

## Approved Decisions

- Decision ID: `DEC-20260307-01`
  - Topic: Primary GCP region
  - Context: pick low-cost region for migration start
  - Options considered: us-central1, us-east1, us-west1, multi-region
  - Decision made: us-central1
  - Rationale: lowest baseline cost with acceptable tradeoff
  - Impact: lowest-cost starting point for Cloud Run migration
  - Approver: project owner
  - Date: 2026-03-07
  - Revisit trigger: sustained latency/SLO issues or compliance constraints
  - Status: approved

- Decision ID: `DEC-20260307-02`
  - Topic: Data strategy
  - Context: choose initial migration sequence
  - Options considered: compute-first hybrid, full-GCP immediate
  - Decision made: compute-first hybrid, then full-GCP by milestones
  - Rationale: lower risk for solo execution
  - Impact: phased migration with deferred data-plane move
  - Approver: project owner + tech lead
  - Date: 2026-03-07
  - Revisit trigger: stalled milestones, SLO regression, or budget pressure
  - Status: approved

- Decision ID: `DEC-20260307-03`
  - Topic: Budget cap policy
  - Context: migration funded by limited credit + capped overage tolerance
  - Options considered: hard cap, soft cap, hybrid cap
  - Decision made: hybrid cap, hard stop at $300 except safety/rollback emergencies
  - Rationale: balance cost control with operational safety
  - Impact: explicit threshold gates and constrained scope changes
  - Approver: project owner
  - Date: 2026-03-07
  - Revisit trigger: additional confirmed credits
  - Status: approved
