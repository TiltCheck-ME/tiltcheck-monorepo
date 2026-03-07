---
name: pr-hygiene-assistant
description: Produces clear pull request narratives with problem statement, approach rationale, risk notes, and validation checklist. Use when preparing a PR, cleaning up a branch summary, or documenting verification before review.
---

# PR Hygiene Assistant

## Required Sections

1. Problem and motivation
2. Why this approach
3. Scope of changes
4. Risk areas and mitigations
5. Test and manual verification plan

## Risk Coverage Checklist

- Auth, payments, trust scoring, or external API impact
- Input validation and error sanitization changes
- Deployment or rollback implications
- Documentation updates required

## Output Style

- Short and specific
- Focus on why and impact, not only file lists
- Include explicit validation steps reviewers can run
