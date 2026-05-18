---
name: solo-code-review
description: Reviews code changes with findings-first output focused on correctness, security, regression risk, and test gaps. Use when reviewing diffs, commits, pull requests, or when the user asks for a code review.
---

# Solo Code Review

## Review Priorities

1. Correctness and behavioral regressions
2. Security and data handling risks
3. Reliability and edge-case handling
4. Performance and maintainability concerns
5. Missing or weak test coverage

## Process

1. Read full change set, not only latest commit.
2. Identify concrete findings with severity and impact.
3. Reference exact files/symbols tied to each issue.
4. Note residual risk even when no bugs are found.

## Response Format

- Findings first, ordered by severity
- Open questions and assumptions
- Brief change summary last
