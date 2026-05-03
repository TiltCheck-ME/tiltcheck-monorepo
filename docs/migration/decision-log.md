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

- Decision ID: `DEC-20260503-01`
  - Topic: Self-serve operator portal identity binding
  - Context: ship sandbox key issuance and a per-operator portal without introducing a net-new operator account model mid-PR
  - Options considered: verified contact-email binding on existing user auth, separate operator auth service, dashboard-only portal with no web surface
  - Decision made: bind operator portal access to the verified partner `contact_email` and accept existing Magic/Discord-backed auth on web
  - Rationale: smallest viable diff that preserves explicit auth boundaries, supports self-serve access immediately, and avoids inventing a second auth stack under time pressure
  - Impact: operator portal visibility depends on the signed-in user email matching the verified partner contact email; a richer operator membership model can layer on later without blocking sandbox onboarding
  - Approver: project owner
  - Date: 2026-05-03
  - Revisit trigger: multiple operators need shared access to one partner account or partner org-level RBAC becomes required
  - Status: approved

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
