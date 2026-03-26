# Verifier Subagents Quick Guide

Use these after implementation work is marked done.

## Which one to use

- `verifier-smoke`: Fast confidence check when the change is small, low-risk, or you need a quick pass before deeper validation.
- `verifier`: Full skeptical validation for risky, user-facing, auth/payment, or multi-file changes.

## Decision rule

- Start with `verifier-smoke` when you need speed.
- Escalate to `verifier` if smoke checks fail, the scope is broad, or the area is high risk.

## What each should report

- Verified and passing evidence
- Claimed work that is incomplete, broken, or unproven
- Specific follow-up fixes needed before merge

## Prompt examples

### Quick smoke check

`Use verifier-smoke. Validate this completed task: [task]. Run the minimum high-signal checks for touched files and report: verified/passing, unverified/failing claims, required follow-ups.`

### Full validation pass

`Use verifier. Validate this completed task end to end: [task]. Confirm implementation exists, run relevant tests/verification commands, probe edge cases, and report: verified/passing, incomplete or broken claims, and required fixes.`
