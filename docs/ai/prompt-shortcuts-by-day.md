# Prompt Shortcuts By Day

Use this file when you want the fastest “what should I run now?” answer.

## Daily Dev

### Start Work

`Use solo-feature-execution. Implement [task] in the smallest safe diff. Return: assumptions, files to touch, planned validations, and first edit step.`

### Mid-task Check

`Map current impact of my changes in [area]. Return: affected files/surfaces, likely regressions, and what to validate next.`

### End of Coding Session

`After edits, run minimal validation for touched files only. Return strict sections: commands run, results, failures, residual risk.`

## Pre-PR

### Review Before Opening PR

`Use solo-code-review. Review current branch changes findings-first. Return severity-ordered issues, then open questions, then test gaps.`

### Draft PR Description

`Use pr-hygiene-assistant. Draft PR content with: problem, why this approach, scope, risk/mitigation, and test checklist.`

### Tighten Risk Notes

`Focus on auth/payments/trust/external API impacts in my branch. Return: threat notes, validation/sanitization notes, rollback notes.`

## Pre-Deploy

### Service Readiness

`Use release-migration-ops and shell subagent. Run readiness checks for [service] using pnpm defaults. Return: commands run, pass/fail matrix, blockers, rollback considerations, next safest command sequence.`

### Migration Milestone Readiness

`Use release-migration-ops. Validate milestone [id] for budget guardrails, rollout sequencing, docs updates, and rollback coverage. Return concrete gaps and required updates.`

### Final Go/No-Go

`Given current branch and checks, provide a go/no-go recommendation for [deploy scope]. Include top 3 risks and exact next action list.`

## Minimal Daily Loop (60 Seconds)

1. Start Work prompt
2. End of Coding Session prompt
3. Review Before Opening PR prompt

If deploying today, also run Service Readiness.
