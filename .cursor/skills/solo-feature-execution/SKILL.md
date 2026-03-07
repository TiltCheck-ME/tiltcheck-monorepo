---
name: solo-feature-execution
description: Executes small to medium feature changes with a scoped loop: discover context, propose minimal edits, implement, run targeted validation, and summarize outcomes. Use when adding or updating features, fixing bugs, or refactoring with clear requirements.
---

# Solo Feature Execution

## Workflow

1. Define scope in one sentence and list out-of-scope items.
2. Discover only the files needed for the change.
3. Propose minimal edits before implementation.
4. Implement in small steps, preserving existing behavior unless requested.
5. Run targeted validation (tests/lint/build only for touched surfaces).
6. Summarize changed files, risks, and follow-up actions.

## Guardrails

- Prefer smallest viable diff.
- Preserve existing unrelated changes in a dirty worktree.
- Avoid introducing new dependencies unless necessary.
- Add tests for behavior changes when feasible.

## Output Format

- Scope and assumptions
- Files changed
- Validation run and results
- Remaining risks or next steps
