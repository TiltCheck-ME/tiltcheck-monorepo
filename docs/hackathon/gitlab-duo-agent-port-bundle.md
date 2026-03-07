# Duo Agent Port Bundle

Use this bundle to copy the MVP into your hackathon GitLab project.

## Copy these files

- `.gitlab-ci.yml`
- `scripts/devx-duo-agent.mjs`
- `scripts/duo-agent.config.json`
- `docs/hackathon/gitlab-duo-agent-mvp.md`

## Required substitutions after copy

Update `scripts/duo-agent.config.json`:

- Replace `tools/channel-watcher/citations.md` with your project's generated output file(s)
- Replace `tools/channel-watcher/reports_business.md` with your project's generated output file(s)
- Replace `tools/channel-watcher/reports_lore.md` with your project's generated output file(s)
- Keep or remove `.github/workflows/...` policy based on whether the hackathon repo should run GitHub Actions
- Keep or remove `data/degen-intel-events.jsonl` based on whether trust-ingest JSONL is used in that repo

## Required GitLab CI variables

- `GITLAB_PUSH_TOKEN` (push branch permission)
- `GITLAB_API_TOKEN` (create merge request permission)
- optional: `DUO_AGENT_GIT_EMAIL`
- optional: `DUO_AGENT_GIT_NAME`
- optional for testing: `DUO_AGENT_DRY_RUN=1`

## Smoke test after port

1. `node scripts/devx-duo-agent.mjs --check --config scripts/duo-agent.config.json`
2. `node scripts/devx-duo-agent.mjs --apply --config scripts/duo-agent.config.json`
3. `node scripts/devx-duo-agent.mjs --check --config scripts/duo-agent.config.json`
4. Trigger GitLab pipeline with `RUN_DUO_AGENT=1` and `DUO_AGENT_DRY_RUN=1`.
