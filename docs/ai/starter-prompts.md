# Starter Prompt Pack

Use these as drop-in prompts to get consistent results with the new rules, skills, and subagent routing.

## 1) Scoped Feature Implementation

`Use solo-feature-execution. Implement [feature] in the smallest safe diff. Return: scope assumptions, exact files to edit, edits made, targeted validation commands/results, and residual risks.`

## 2) Bug Fix With Minimal Risk

`Use solo-feature-execution. Fix [bug] with minimum behavioral change. Return: likely root cause, minimal patch plan, final diff summary, and tests proving the fix.`

## 3) Findings-First Code Review

`Use solo-code-review. Review changes in [path or commit/range]. Return findings first ordered by severity, then open questions/assumptions, then test gaps.`

## 4) Auth/API Hardening Check

`Use solo-code-review and focus on auth/API surfaces in apps/api. Return only correctness/security regressions, exploit paths, and missing tests.`

## 5) Architecture Mapping (Broad Discovery)

`Use an explore subagent (medium thoroughness). Map [feature/system]. Return strict sections: key files, entry points, data flow steps, and top 3 risky change points with why.`

## 6) Bug Triage (Discovery + Commands)

`First use explore subagent to locate likely root causes for [bug]. Then use shell subagent for targeted validation commands. Return strict sections: root-cause candidates, repro steps, command outputs summary, and lowest-risk fix path.`

## 7) Release Readiness (Service Scope)

`Use release-migration-ops and shell subagent. Run readiness checks for [service/area] with pnpm defaults. Return strict sections: commands run, pass/fail matrix, blockers, rollback considerations, and next safest command sequence.`

## 8) Migration Milestone Safety Pass

`Use release-migration-ops. For milestone [id], verify docs/migration updates, cost guardrails, rollback notes, and deploy sequencing. Return gaps and exact file/script updates needed.`

## 9) PR Narrative Draft

`Use pr-hygiene-assistant. Draft a PR description from current branch changes with sections: problem, why this approach, scope, risk/mitigation, and test/verification checklist.`

## 10) Post-change Verification Loop

`After edits, run the minimal validation set for touched files only. Return strict sections: commands run, results, failures (if any), and residual risk before merge.`

## Quick Routing Reminder

- Narrow task (1-3 files): direct tools
- Broad unknowns: explore subagent
- Command-heavy validation/deploy: shell subagent
