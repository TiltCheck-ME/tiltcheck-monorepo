# Linear Workflow (Solo Ops)

<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-18 -->

This setup gives you one command to keep your migration tasks in Linear without managing tasks manually.

**Agent cohesion:** see [AGENT-COHESION.md](./AGENT-COHESION.md) — Open items owns landing/SEO code PRs; research ops owns research briefs + Linear mirrors (including `linear-tasks-landing-audit.json`).

## 1) Set environment variables

Add these to your local `.env` (or your shell profile):

- `LINEAR_API_KEY` - personal API key from Linear settings
- `LINEAR_TEAM_KEY` - short team key (for example `ENG`)
- `LINEAR_PROJECT_ID` (optional) - target project for created issues

Reference template values in `.env.example`.

## 2) Edit your task source

Update one of:

- `docs/ops/linear-tasks.json` — migration / general
- `docs/ops/linear-tasks-landing-audit.json` — landing/SEO GitHub issue mirror (`LAND-*`)
- Research briefs later emit sidecars merged via `pnpm ops:research:merge-tasks` (see research-ops plan)

Each task needs:

- `key` (unique)
- `title`
- `description`
- `priority` (0-4)

## 3) Dry run first

```powershell
node scripts/linear-sync.mjs --dry-run
```

Dry run validates env + task file and shows what would be created.

## 4) Create issues

```powershell
node scripts/linear-sync.mjs
```

Behavior:

- Creates a new issue when no matching marker exists.
- Skips issue creation when it finds an existing issue for that task key/title.
- Adds marker in description: `[tc-task:<key>]` to avoid duplicates.

## 5) Use daily guide command

```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/daily-ops.ps1 -SyncLinear
```

Optional flags:

- `-LinearDryRun` (default: on)

To create real Linear issues in the daily script:

```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/daily-ops.ps1 -SyncLinear -LinearDryRun:$false
```

## 6) Research ops employee

Research ops does not freestyle this loop. Run the brief, merge at most 5 new keys, then dry-run or sync Linear:

```bash
pnpm run ops:research:run
pnpm run ops:research:merge-tasks --sidecar docs/research/YYYY-MM-DD-competitor-matrix.tasks.json
pnpm ops:linear:dry
pnpm ops:linear:sync
```

Notes:

- `ops:research:merge-tasks` dedupes against `docs/ops/linear-tasks.json` by `key`.
- Due recurring templates come from `docs/ops/recurring-tasks.json`.
- `docs/ops/recurring-state.json` only updates `lastQueuedAt` for recurring tasks that were actually queued.
- `.github/workflows/research-ops.yml` runs this loop on Monday and Thursday at 14:00 UTC and also supports manual `workflow_dispatch` with a `slug` input.
- In GitHub Actions, gate optional Linear sync with an env flag step such as `HAS_LINEAR=true|false`; do not use `if: ${{ secrets.LINEAR_API_KEY != '' }}` because that secret comparison is brittle across org setups.
- Workflow secrets for real sync: `LINEAR_API_KEY`, `LINEAR_TEAM_KEY`, optional `LINEAR_PROJECT_ID`. Optional research shaping secrets: `RESEARCH_LLM_API_KEY`, `RESEARCH_LLM_BASE_URL`, `RESEARCH_LLM_MODEL`.

## Notes

- Keep one active branch and one active milestone slice.
- Update `docs/ops/linear-tasks.json` before session end so tomorrow starts clear.

Made for Degens. By Degens.
