# TiltCheck Jira Setup and Roadmap Bootstrapping

Use this guide to stand up a clean Jira project in `tiltcheck.atlassian.net` without MCP automation.

## 1) Create/verify project

- Create a Jira Software project with key `TILT` (company-managed preferred).
- Template: Scrum.
- Keep workflow simple:
  - `Backlog` -> `Ready` -> `In Progress` -> `In Review` -> `QA/Verify` -> `Done`
- Add issue types:
  - `Epic`, `Story`, `Task`, `Bug`, `Spike`, `Tech Debt`

## 2) Add components

Create these Components in project settings:

- `api-gateway`
- `web-landing`
- `trust-rollup`
- `discord-bot`
- `game-arena`
- `infra-ci`
- `docs`
- `cross-cutting`

## 3) Add labels policy (light governance)

Recommended labels:

- `capability-gap`
- `stubbed`
- `contract-mismatch`
- `prod-readiness`
- `security`
- `ux-copy`

Rule: keep labels from this list only for roadmap tickets.

## 4) Import the starter backlog

File: `docs/jira-import/tiltcheck-roadmap-seed.csv`

In Jira:

1. `Settings` -> `System` -> `External system import` -> `CSV`
2. Upload the CSV
3. Map fields:
   - `Summary` -> Summary
   - `Issue Type` -> Issue Type
   - `Description` -> Description
   - `Priority` -> Priority
   - `Labels` -> Labels
   - `Components` -> Components
   - `Epic Name` -> Epic Name (for epic rows)
   - `Epic Link` -> Epic Link (for non-epic rows; if available)
4. If `Epic Link` is not available in your Jira UI:
   - import epics first (filter Issue Type = Epic), then
   - bulk edit the remaining issues and set Parent/Epic manually.

## 5) Sprint plan

- Sprint 1 (Truth alignment): KPI endpoint, auth path contract, beta placeholders, capability matrix
- Sprint 2 (Monetization): payment provider decision + checkout implementation
- Sprint 3 (Platform plumbing): service forwarding contract + implementation
- Sprint 4 (Hardening): route naming cleanup, stale status/doc cleanup, regression tests

## 6) Definition of Done (recommended)

Each ticket should include:

- Code complete and merged
- Tests green in affected package(s)
- User-visible status matches actual behavior
- Docs/status updated if feature state changed
- No new placeholder/stub behavior unless clearly marked and ticketed

