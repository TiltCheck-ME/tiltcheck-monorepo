---
name: issue-remediation
description: Identifies and fixes bugs, failures, security issues, regressions, and validation gaps with minimal-risk patches. Use when the user asks to fix errors, broken behavior, missed edge cases, test failures, or security problems.
---

# Issue Remediation

Use this skill to move from "something is broken" to "fixed and verified" with small, safe diffs.

## When To Apply

Apply when requests include terms like:
- bug, broken, failing, error, regression
- security issue, vulnerability, xss, auth risk
- test failure, lint failure, typecheck failure
- gaps, edge cases, incomplete implementation

## Operating Principles

- Fix root cause, not symptoms.
- Keep scope tight and reversible.
- Prefer minimal-risk changes over broad refactors.
- Do not trust claims without verification evidence.
- Never expose secrets or private runtime values.

## Workflow

### 1) Reproduce and scope

1. Capture exact failure signal (error, failing test, bad behavior).
2. Identify impacted files and likely blast radius.
3. Confirm whether this is correctness, security, regression, or test-gap work.

### 2) Diagnose

1. Find the earliest meaningful failure point.
2. Form 1-3 concrete hypotheses.
3. Validate hypotheses with focused checks/logs/code inspection.

### 3) Implement minimal patch

1. Patch only necessary files.
2. Preserve existing behavior outside the bug path.
3. For risky surfaces (auth/payments/trust/external APIs), include:
   - threat/risk notes
   - validation/sanitization notes
   - rollback note if behavior regresses

### 4) Verify

Run the smallest high-signal checks for touched areas:
- targeted tests for changed paths
- lint/typecheck/build only if relevant
- focused runtime check for user-facing behavior

If a check fails, iterate fix -> verify until stable.

### 5) Report

Return concise sections:
1. Root cause
2. Files changed
3. What was verified and passed
4. Residual risks / test gaps
5. Next safest action

## Output Template

Use this format:

```markdown
## Findings
- [severity] [issue] in `path`: impact + why

## Fixes Applied
- `path`: short description of root-cause fix

## Verification
- `command`: pass/fail + key result

## Residual Risk
- Remaining edge case, unknown, or deferred test

## Next Step
- Smallest safe follow-up action
```

## Security-Focused Checks (When Relevant)

- Input validation and output encoding are explicit.
- Auth/session/token flows fail closed.
- No wildcard origins or permissive trust defaults.
- No secret leakage in logs, responses, or committed files.

