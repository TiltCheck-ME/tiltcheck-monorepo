# MR-Triggered README/Docs Agent - Hackathon Guide

## 1) Hackathon project description

This project is an **autonomous documentation maintenance agent** for GitLab merge requests.

It solves a common SDLC bottleneck: code changes land, but README and supporting docs become stale.  
Instead of relying on manual follow-up, the agent reacts to MR events, maps changed files to owned documentation sections, and updates those sections automatically.

Why this fits the GitLab AI Hackathon scope:

- It is **event-driven** (MR pipeline trigger), not prompt-only chat.
- It takes **workflow actions** (updates docs, commits, pushes).
- It supports **guardrails** (marker-owned sections only, deterministic behavior first).
- It emits a **machine-readable report** for auditability (`artifacts/docs-agent-report.json`).

---

## 2) Core behavior

The docs agent script is:

- `scripts/devx-duo-docs-agent.mjs`

Its policy config is:

- `scripts/duo-docs-agent.config.json`

Prompt template for optional LLM summary:

- `scripts/prompts/docs-summary.md`

### Update model

1. Detect changed files from MR diff / CLI args.
2. Match file paths to rules in `duo-docs-agent.config.json`.
3. Update only sections wrapped in marker pairs:
   - `<!-- docs-agent:start:... -->`
   - `<!-- docs-agent:end:... -->`
4. Optionally add short LLM summary bullets (if enabled via env vars).
5. Emit JSON report with what changed and why.

When deleted code files are detected, the agent now also emits:

- deleted file counts
- mapped documentation follow-up suggestions
- optional auto-MR trigger context for push pipelines

---

## 3) GitLab CI setup instructions

The CI job is already defined in `.gitlab-ci.yml` as `devx_duo_docs_agent`.

### Required CI/CD variable

- `DOCS_AGENT_PUSH_TOKEN` - token with permission to push to MR source branch.

### Optional CI/CD variables

- `DOCS_AGENT_DRY_RUN=1` - stops before commit/push.
- `DOCS_AGENT_GIT_EMAIL`
- `DOCS_AGENT_GIT_NAME`
- `DOCS_AGENT_ENABLE_LLM=true`
- `DOCS_AGENT_LLM_API_KEY`
- `DOCS_AGENT_LLM_API_URL` (optional override)
- `DOCS_AGENT_LLM_MODEL` (optional override)
- `DOCS_AGENT_AUTO_OPEN_MR_ON_DELETION=1` (enable push-mode auto MR creation)
- `DOCS_AGENT_API_TOKEN` (or `GITLAB_API_TOKEN`) to call MR API in push mode

### Trigger behavior

The job runs when either is true:

- `CI_PIPELINE_SOURCE == "merge_request_event"`
- `CI_PIPELINE_SOURCE == "push"` and `DOCS_AGENT_AUTO_OPEN_MR_ON_DELETION == "1"`
- `RUN_DOCS_AGENT == "1"`

---

## 4) Local quick-start

From repo root:

```bash
# Non-destructive check mode
node scripts/devx-duo-docs-agent.mjs --check --config scripts/duo-docs-agent.config.json --changed-file apps/web/src/main.ts

# Apply mode (writes marker-owned sections + report)
node scripts/devx-duo-docs-agent.mjs --apply --config scripts/duo-docs-agent.config.json --changed-file apps/web/src/main.ts
```

Expected exit codes:

- `0` = no updates required (or apply completed successfully)
- `2` = check mode found updates needed
- `1` = execution/config/runtime failure

---

## 5) Verified checks run in this repo

I validated behavior in **check mode** (non-destructive):

1. Simulated app change:
   - Command:
     - `node scripts/devx-duo-docs-agent.mjs --check --config scripts/duo-docs-agent.config.json --changed-file apps/web/src/main.ts`
   - Expected:
     - matches `apps-impact` rule
     - proposes updates to:
       - `README.md#mr-code-impact`
       - `docs/hackathon/gitlab-duo-agent-mvp.md#docs-agent-latest-impact`
     - exits with code `2`
   - Observed:
     - matched expected behavior.

2. Simulated unmatched change:
   - Command:
     - `node scripts/devx-duo-docs-agent.mjs --check --config scripts/duo-docs-agent.config.json --changed-file README.md`
   - Expected:
     - no rule matches
     - no updates
     - exits with code `0`
   - Observed:
     - matched expected behavior.

3. Simulated deletion + suggestion scenario:
   - Command:
     - `node scripts/devx-duo-docs-agent.mjs --check --config scripts/duo-docs-agent.config.json --changed-file apps/web/src/main.ts --deleted-file apps/web/src/legacy-widget.ts`
   - Expected:
     - non-zero check result (`2`) for docs updates
     - report/preview includes deletion follow-up suggestions
   - Observed:
     - matched expected behavior.

---

## 6) Manual end-to-end test checklist (MR pipeline)

Use this if you want full GitLab validation including commit/push:

1. Ensure marker blocks exist in target docs.
2. Set `DOCS_AGENT_PUSH_TOKEN` in GitLab CI/CD variables.
3. Open an MR that changes files under `apps/`, `packages/`, `modules/`, or `services/`.
4. Run pipeline with `DOCS_AGENT_DRY_RUN=1` first.
   - Confirm job generates expected diff and exits safely before push.
5. Remove dry run and rerun.
   - Confirm bot commit lands on MR source branch.
   - Confirm `artifacts/docs-agent-report.json` is present.
6. Re-run pipeline without additional code changes.
   - Confirm idempotence (no additional docs delta).

### Push-mode auto MR path (optional)

1. Set `DOCS_AGENT_AUTO_OPEN_MR_ON_DELETION=1`.
2. Ensure API token exists (`DOCS_AGENT_API_TOKEN` or `GITLAB_API_TOKEN`).
3. Push a branch commit that deletes code under configured prefixes (`apps/`, `packages/`, `modules/`, `services/`).
4. Confirm pipeline updates docs and creates an MR if one does not already exist.

---

## 7) Demo-friendly talking points

- “We don’t ask reviewers to remember docs cleanup; the agent does it.”
- “Deterministic markers prevent broad or unsafe edits.”
- “LLM summaries are optional and bounded; deterministic updates still work without AI tokens.”
- “Every run leaves an audit artifact for trust and debugging.”
