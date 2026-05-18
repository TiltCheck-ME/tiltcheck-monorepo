# Audit delegation matrix

© 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-12

**How to read this table**

- **Owner:** DRI role (human); may pull GitHub Copilot agents or Cursor agents as *executors* for drafts, not as legal sign-off.
- **Cadence:** minimum frequency; also run on **trigger** when applicable.
- **Trigger:** events that force an out-of-cycle run.
- **Deliverable:** what “done” looks like; file under `docs/audits/artifacts/<date>/<slug>/` unless noted.

Automation references point at in-repo agents/workflows where they exist today; gaps are explicit.

---

## Tier A — ship blockers (minimum annual + on major auth/money changes)

| Audit type | Owner (DRI) | Cadence | Trigger | Deliverable | Automation / support |
|------------|-------------|---------|---------|-------------|------------------------|
| Application security (auth, IDOR, APIs) | Backend lead + Security DRI | Quarterly | New `/vault`, `/auth`, payments, or OAuth surface; large dependency bump | Written report + tracked issues with severities; retest checklist | `.github/agents/production-standards-auditor` for readiness; manual OWASP-style pass |
| Dependency / supply chain | DevOps lead | Monthly | Renovate/major version bumps; incident in upstream | `pnpm audit` summary + decision log for accepted risk | CI should surface audit output; `pnpm approve-builds` policy reviewed quarterly |
| Secrets & CI hygiene | DevOps lead | Quarterly | New workflows, new third-party actions, fork PRs | Secret scan report; GITHUB_TOKEN permissions review | `pnpm audit:history-secrets` (root script); branch protection rules audit |
| Extension + injected runtime threat model | Fullstack lead (extension + mobile-wrapper) | Quarterly | New injection bridge, new host allowlist, CSP changes | STRIDE-lite doc + test gaps for XSS/bridge abuse | Manual + unit tests; consider dedicated security review before store submission |
| Crypto / wallet flows (signing, fees) | Backend lead + Solana-knowledgeable engineer | On change | JustTheTip, LockVault fee, new chain integration | Transaction preview checklist + abuse cases | Code review gate on `modules/justthetip`, `modules/lockvault`, `packages/auth` |

---

## Tier B — compliance, privacy, truth-in-labeling (semi-annual unless triggered)

| Audit type | Owner (DRI) | Cadence | Trigger | Deliverable | Automation / support |
|------------|-------------|---------|---------|-------------|------------------------|
| Privacy & data map (retention, deletion) | Platform / product + eng | Semi-annual | New telemetry, new PII fields, new vendor | Data map delta + retention table | Manual; align with `apps/api` user/me routes |
| Consent & `dataSharing` / `complianceBypass` | Backend lead + product | Semi-annual | Any change to onboarding schema | Matrix: flag → who can set → prod allowed? + audit log requirement | Extend ethics audit section; block prod bypass without role guard |
| Gambling-adjacent marketing & RG claims | Product + legal counsel (external) | Annual | Major rebrand, new geo pages, paid ads | Copy review with “claim vs mechanism” table | `.cursor/agents/brand-law-enforcer` + human legal for final sign-off |
| Payments / MT risk (credits, pools) | Product + legal + backend | On change | JTT credits, pool routing, new “hold” behavior | Updated custody matrix + external memo if needed | Reconcile with `docs/ethics/mission-alignment-audit-2026-05-12.md` P0 |

---

## Tier C — reliability and correctness (continuous + quarterly)

| Audit type | Owner (DRI) | Cadence | Trigger | Deliverable | Automation / support |
|------------|-------------|---------|---------|-------------|------------------------|
| SRE / production readiness | DevOps lead | Quarterly | New Railway service, new DB dependency | Runbook gaps, SLO table, incident drill notes | `AGENTS.md` deployment table kept in sync |
| DR / backup | DevOps lead | Semi-annual | DB migration, storage change | Restore test log with timestamp | Neon/Railway-specific procedures |
| Chaos / dependency failure | Backend lead | Annual | Trust engine or Discord hardening push | Game-day report (simulated Stake API fail, etc.) | Manual scripted failures |
| Test coverage gaps (money paths) | Backend lead | Quarterly | Coverage drop on touched packages | Vitest coverage delta + “must test” list for vault/auth | `pnpm test`; block merges on critical paths if policy adopted |
| Schema / migration safety | Backend lead | Per migration | Any `packages/database` migration | Roll-forward/back notes in PR | Peer review checklist |

---

## Tier D — UX, accessibility, inclusion (quarterly for public surfaces)

| Audit type | Owner (DRI) | Cadence | Trigger | Deliverable | Automation / support |
|------------|-------------|---------|---------|-------------|------------------------|
| WCAG / accessibility (crisis + money flows) | Frontend lead | Quarterly | Touch Grass, LockVault, onboarding, login | Pa11y or axe report + fixed issues | `pnpm a11y:audit` / landing scripts in root `package.json` |
| Crisis UX copy | Product + frontend | Annual | Tone overhaul | Review checklist: helplines visible, no shame-on-loss framing | Manual |
| Internationalization | Frontend lead | On demand | New locales, new helpline regions | Locale matrix + wrong-number audit | Manual |

---

## Tier E — AI, trust, brand (quarterly / on change)

| Audit type | Owner (DRI) | Cadence | Trigger | Deliverable | Automation / support |
|------------|-------------|---------|---------|-------------|------------------------|
| AI / model governance (`/ai`, prompts) | Backend + product | Quarterly | New model, new prompt templates | Prompt injection test cases + retention policy | Manual red-team |
| Trust score fairness | Trust / product + eng | Semi-annual | Scoring formula change | Explainability appendix + appeal path | `trust-rollup` / engine owners |
| Brand law & claim accuracy | Any PR author + reviewer | Every PR | N/A | Headers, footer, no emoji policy, **custody claim accuracy** | `.github/agents/brand-law-enforcer.yml` |

---

## Tier F — business continuity (annual)

| Audit type | Owner (DRI) | Cadence | Trigger | Deliverable | Automation / support |
|------------|-------------|---------|---------|-------------|------------------------|
| Vendor / subprocessors | Ops / founder | Annual | New vendor with data access | Subprocessor register update | Legal templates |
| Open source license compliance | DevOps or backend | Annual | New bundled deps in shipped apps | NOTICE file / license table | Manual or FOSSA-class tool if adopted |

---

## Tier G — abuse and edge ethics (on feature + annual snapshot)

| Audit type | Owner (DRI) | Cadence | Trigger | Deliverable | Automation / support |
|------------|-------------|---------|---------|-------------|------------------------|
| Guardian / coercion scenarios | Product + backend | On guardian feature change | New social lock flows | Threat model: forced lock, forced guardian | Pair with ethics doc |
| Child safety / UGC (if expanded) | Product + legal | Before launch | Any chat log product | Policy + moderation SLO | N/A until scope exists |

---

## Delegation mechanics (how work actually gets assigned)

1. **Quarterly calendar owner:** DevOps lead maintains a calendar invite series “Audit Tier A+B review” with links to this matrix.
2. **PR template:** Add checkbox “Tier A trigger?” linking owners when auth/vault/payment paths change.
3. **Artifacts:** Create `docs/audits/artifacts/.gitkeep` if you want the folder tracked empty, or first run creates dated subdirs (prefer not empty commits; optional).
4. **Agent runners:** Use GitHub Copilot agents named in `AGENTS.md` as **draft generators**; human DRI signs the artifact.

---

## Already completed (reference only)

| Audit | Artifact |
|-------|----------|
| Ethics / mission alignment | `docs/ethics/mission-alignment-audit-2026-05-12.md` |

---

## Gaps to close (meta)

- Wire **explicit GitHub Issues** or **Linear** templates per row (out of scope for this doc-only change).
- Add **CI job** that fails if `docs/audits/artifacts/` is missing for release tags (optional policy).
