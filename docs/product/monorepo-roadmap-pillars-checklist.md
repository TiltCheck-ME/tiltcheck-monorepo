---
title: Monorepo roadmap pillars checklist
category: Product
description: Pillar backlog mapped to TiltCheck apps and packages. Checkboxes are planning aids; track owners in Linear or issues.
date: 2026-05-20
---

<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-20 -->

# Monorepo roadmap pillars checklist

Maps the [player sovereignty strategy](./player-sovereignty-category-strategy.md) to concrete surfaces in this repository.  
**Convention:** `pnpm --filter <name>` uses package names from each `package.json` (e.g. `web`, `@tiltcheck/api`).

---

## Pillar A — Live guardrails (velocity, tilt, session friction)

| Status | Task | Primary owner |
| :---: | :--- | :--- |
| [ ] | Single injected / MV3 behavior spec: no fork between userscript and extension logic for vault + tilt (align with `@tiltcheck/chrome-extension`). | `apps/chrome-extension` |
| [ ] | Dashboard durable rules + extension handoff URLs for safety and AutoVault review. | `apps/user-dashboard` |
| [ ] | Optional Discord reinforcement (buddy pings, ack flows) without storing sensitive config in threads. | `apps/discord-bot` |
| [ ] | API routes for settings sync and events **only** with explicit auth and minimal payloads. | `apps/api`, `packages/*` contracts |
| [ ] | RG copy and limits: no medical claims; escalation paths documented. | `apps/web` (legal + product pages), `docs/legal/*` |

**Risk / validation:** False-positive rate for pacing signals; ToS alignment for automated nudges; rate limits on Discord alerts.

**Rollback:** Feature-flag injected friction; revert detection thresholds per cohort.

---

## Pillar B — Session forensics & RTP-adjacent transparency

| Status | Task | Primary owner |
| :---: | :--- | :--- |
| [ ] | Session export and forensic views (user-owned history) on dashboard. | `apps/user-dashboard` |
| [ ] | Public education and “what we can / cannot infer” pages; link from intel routes. | `apps/web` (`/intel/*`, `/tools/*`) |
| [ ] | Trust rollup inputs: define which forensic aggregates may enter reputation (consent, aggregation windows). | `apps/trust-rollup`, `packages/trust-engines` (`@tiltcheck/trust-engines`) |
| [ ] | Methodology doc: sample size, variance, game identity—avoid lab RTP claims without full pipeline. | `docs/product/*` |

**Risk / validation:** Misleading drift badges; statistical review before public leaderboard use.

**Rollback:** Display “experimental” or disable public aggregation for raw session RTP proxies.

---

## Pillar C — Independent trust economy

| Status | Task | Primary owner |
| :---: | :--- | :--- |
| [ ] | Casino directory and trust signals with abuse-resistant inputs. | `apps/web`, `apps/api`, data scripts (`scripts/*`) |
| [ ] | Rollup pruning / sliding windows (operational). | `apps/trust-rollup` (see [ROADMAP_2026](../ROADMAP_2026.md)) |
| [ ] | Operator-facing verification flows without captive affiliate incentives. | `apps/web` (`/operators/*`), `apps/api` |
| [ ] | Transparency: published scoring inputs and change logs where applicable. | `docs/`, public changelog |

**Risk / validation:** Sybil and brigading; economic disclosure for any future monetization.

**Rollback:** Score freeze; manual review queue for contested deltas.

---

## Pillar D — Creator provenance (hash / registry)

| Status | Task | Primary owner |
| :---: | :--- | :--- |
| [ ] | CLI or web flow: hash asset bundles pre-submission; store metadata + timestamp. | `apps/web` or `packages/*` tooling |
| [ ] | Optional public registry API and audit trail. | `apps/api`, `packages/database` |
| [ ] | Legal playbook: hashes as evidence step, not automatic title. | `docs/legal/*` |

**Risk / validation:** PII in bundles; secure upload paths.

**Rollback:** Per-creator private manifests only.

---

## Cross-cutting platform inventory (quick reference)

| Area | Packages / apps |
| :--- | :--- |
| Public acquisition & SEO pillars | `apps/web` |
| In-session enforcement | `apps/chrome-extension` |
| Durable user settings & history | `apps/user-dashboard` |
| Gateway & trust APIs | `apps/api` |
| Aggregation & signals | `apps/trust-rollup` |
| Community & alerts | `apps/discord-bot`, `apps/justthetip-bot` (as needed) |
| Internal ops | `apps/control-room` |
| Edge / hub | `apps/hub` |
| Shared types and DB | `packages/types`, `packages/database`, `@tiltcheck/shared` |
| Deep logic modules | `modules/*` (e.g. tiltcheck-core, trust-engines) |

---

## Links

- Engineering phases and security work: [ROADMAP_2026.md](../ROADMAP_2026.md)  
- RG surface ownership: [RG Tools v1 plan](./rg-tools-v1-plan.md)  
- Competitive JTBD: [Stake Cruncher / Stats / RipGuard](../competitive/stake-cruncher-stake-stats-tiltcheck-positioning.md)

---

**Note:** Checkboxes are planning aids only; assign owners and tickets outside this file when execution starts.
