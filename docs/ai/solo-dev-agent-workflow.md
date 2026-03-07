# Solo Dev Agent Workflow

This guide defines a default decision flow for using rules, skills, and subagents in this repository.

## Core Mental Model

- **Rules** = always-on guardrails and constraints.
- **Skills** = reusable workflows for recurring tasks.
- **Subagents** = scale and parallelization for broad or command-heavy work.

Use this order by default: **rules -> skill -> subagent/tool choice -> validation -> summary**.

## Routing: Which Tooling to Use

### Use direct tools when the task is narrow

Choose direct tools for 1-3 files, exact symbol lookups, small code edits, or targeted follow-up.

Examples:

- "Update one API route handler"
- "Fix a lint error in one file"
- "Explain how this one function works"

### Use `explore` subagent when discovery is broad

Choose `explore` when you need architecture mapping, unknown file locations, or multiple candidate implementations.

Examples:

- "Where does auth state flow from API to extension?"
- "Map trust score calculations across modules"
- "Find all migration docs and rollout scripts involved in GCP cutover"

### Use `shell` subagent when execution is command-heavy

Choose `shell` when the task needs chained commands, build/test orchestration, or operational diagnostics.

Examples:

- "Run targeted tests and summarize failing surfaces"
- "Execute release readiness checks and report blockers"
- "Validate deployment scripts and environment assumptions"

## Quick Subagent Prompt Patterns

### Codebase Mapping (explore)

`Map the architecture for [feature]. Return strict sections: key files, entry points, data flow steps, and top 3 risky change points with why.`

### Bug Triage (explore + shell)

`Investigate [bug]. Return strict sections: likely root cause candidates, repro path, and minimal fix options ranked by risk.`

`Run targeted tests for [scope]. Return strict sections: failures, stack trace summary, and next command sequence.`

### Release Readiness Check (shell)

`Run relevant checks for [service/area] using pnpm defaults. Return strict sections: commands run, pass/fail matrix, blockers, and rollback considerations.`

### Post-change Verification Loop (shell)

`After edits, run minimal validation for touched files. Return strict sections: exact commands run, results, and residual risk.`

## Daily Solo Loop (Recommended)

1. Start with `solo-feature-execution` or `release-migration-ops` skill.
2. Pick direct tools or subagent path using routing above.
3. Keep diffs small and reversible.
4. Run targeted validation before finishing.
5. Use `pr-hygiene-assistant` to prepare review-ready summary.

## When to Avoid Subagents

- Single file edits with clear location
- Exact text/symbol searches
- Tiny changes where startup overhead is larger than the task

## Review Standard

For reviews, default to `solo-code-review` and findings-first output:

- severity-ordered issues
- explicit risk and impact
- test gaps and residual risk
