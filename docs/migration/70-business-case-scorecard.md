<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-03 -->

# GCP Migration Business Case Scorecard

Last updated: 2026-03-07
Owner: project owner

## Inputs (Current)

- Current monthly hosting spend: `<$50/mo`
- Current deploy/infra troubleshooting time: `>10 hours/week`
- Migration approach: compute-first on GCP (`api + web` in Wave 1)
- Budget mode: hybrid cap, hard stop at `$300` (except rollback/safety)

## Decision Question

Should TiltCheck move from mixed hosting to GCP compute-first now?

## Comparison

| Dimension | Stay Mixed (Current) | Move to GCP (Compute-First) |
| --- | --- | --- |
| Short-term cost (next 30 days) | Likely lowest | Higher during migration setup |
| Ops consistency | Lower (multi-platform) | Higher (single control plane) |
| Deploy reliability | Variable by provider mix | Improves after standardization |
| Secret management | Mixed patterns | Centralized in Secret Manager |
| Solo maintainability | Medium | High once stabilized |
| Migration risk | Low (no change) | Medium (cutover + config risk) |

## Quantitative Targets (60 days)

- Keep cumulative migration spend `<= $300`
- Reduce infra troubleshooting to `<= 2 hours/week`
- Reach one-command deploy path for Wave 1 services
- Validate rollback for at least one production-facing service

## Recommendation (Based on Current Inputs)

Proceed with **Wave 1 compute-first migration** because:

- current spend is already low, so migration is not a cost-cutting play
- current ops burden is high (`>10 hours/week`), so primary ROI is reclaiming founder time
- main expected upside is reduced operational complexity and better solo maintainability
- hard budget controls and phased milestones cap downside risk

## Unknowns to Resolve During Week 1

- Real egress/logging costs once `api + web` run on the target managed runtime
- Whether existing credits apply to managed runtime / infra SKUs

## Go / No-Go Gate

Go to next milestone only if all are true:

- budget trend is inside cap thresholds
- no unresolved high-severity deploy/security blockers
- rollback procedure tested and documented
