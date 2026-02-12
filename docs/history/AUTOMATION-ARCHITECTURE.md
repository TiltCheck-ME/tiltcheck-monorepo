# TiltCheck Automation Architecture

This document provides a visual overview of the automation system.

## Automation Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        GitHub Repository                             │
│                    jmenichole/tiltcheck-monorepo                     │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │
         ┌────────────────────────┼────────────────────────┐
         │                        │                        │
         ▼                        ▼                        ▼
    ┌─────────┐            ┌──────────┐           ┌──────────┐
    │  Push   │            │    PR    │           │ Schedule │
    │  Event  │            │  Event   │           │  Event   │
    └─────────┘            └──────────┘           └──────────┘
         │                        │                        │
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Workflow Triggers                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  On Push to main:                                                   │
│  ├─ CI (build, test, lint)                                         │
│  ├─ CodeQL Security Scan                                           │
│  ├─ Health Check (full)                                            │
│  ├─ Deploy Bot                                                     │
│  ├─ Deploy Dashboard                                               │
│  └─ Automation Validation                                          │
│                                                                      │
│  On Pull Request:                                                   │
│  ├─ CI (build, test, lint)                                         │
│  ├─ CodeQL Security Scan                                           │
│  ├─ Components A11y ✓ (required)                                   │
│  ├─ Landing A11y ✓ (required)                                      │
│  ├─ Auto-labeling                                                  │
│  └─ Dependabot Auto-merge (if applicable)                          │
│                                                                      │
│  Daily Scheduled:                                                   │
│  ├─ 12 AM UTC: Security Audit (pnpm audit)                         │
│  ├─ 1 AM UTC: Stale Bot                                           │
│  ├─ 2 AM UTC: CodeQL Scan                                         │
│  └─ 6 AM UTC: Analyzer Services                                    │
│                                                                      │
│  Weekly Scheduled:                                                  │
│  ├─ Monday 3 AM UTC: Cache Rotation                                │
│  └─ Monday 3-6 AM UTC: Dependabot Updates                          │
│                                                                      │
│  Every 6 Hours:                                                     │
│  └─ Deployment Health Verification                                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │
         ┌────────────────────────┼────────────────────────┐
         │                        │                        │
         ▼                        ▼                        ▼
    ┌─────────┐            ┌──────────┐           ┌──────────┐
    │Security │            │   Auto   │           │  Status  │
    │  Alerts │            │  Actions │           │ Checks   │
    └─────────┘            └──────────┘           └──────────┘
         │                        │                        │
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          Outputs & Actions                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Security Tab:                                                      │
│  ├─ CodeQL Alerts                                                  │
│  ├─ Dependabot Alerts                                              │
│  └─ Secret Scanning (if enabled)                                   │
│                                                                      │
│  Automated Actions:                                                 │
│  ├─ Create Dependabot PRs                                          │
│  ├─ Add labels to PRs                                              │
│  ├─ Mark issues as stale                                           │
│  ├─ Auto-approve safe dependency updates                           │
│  ├─ Auto-merge safe dependency updates                             │
│  ├─ Request CODEOWNERS review                                      │
│  └─ Create issues on health check failure                          │
│                                                                      │
│  Required Checks (before merge):                                    │
│  ├─ components-a11y ✓                                              │
│  ├─ landing-a11y ✓                                                 │
│  └─ Analyze Code (CodeQL) ✓                                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Security Scanning Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Code Changes                                  │
└─────────────────────────────────────────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────┐
        │    Multiple Security Layers          │
        └──────────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
    ┌─────────┐      ┌─────────┐      ┌─────────┐
    │ CodeQL  │      │  pnpm   │      │Dependabot│
    │ Scanner │      │  audit  │      │ Alerts  │
    └─────────┘      └─────────┘      └─────────┘
         │                 │                 │
         │                 │                 │
         ▼                 ▼                 ▼
    ┌──────────────────────────────────────────┐
    │      Vulnerability Detection              │
    ├──────────────────────────────────────────┤
    │ • Code patterns                          │
    │ • Known CVEs                             │
    │ • Dependency issues                      │
    │ • Configuration problems                 │
    └──────────────────────────────────────────┘
                           │
                           ▼
              ┌────────────────────┐
              │  Alert & Report    │
              ├────────────────────┤
              │ High/Critical      │────► Block PR Merge
              │ Medium/Low         │────► Create Alert
              │ Informational      │────► Log for Review
              └────────────────────┘
                           │
                           ▼
              ┌────────────────────┐
              │   Human Review     │
              │   & Resolution     │
              └────────────────────┘
```

## Dependabot Workflow

```
┌─────────────────────────────────────────────────────────────────────┐
│                   Dependabot Configuration                           │
│                  (.github/dependabot.yml)                           │
└─────────────────────────────────────────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────┐
        │  Weekly Check (Mon 3-6 AM UTC)   │
        └──────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────┐
        │   Scan for Updates:              │
        │   • GitHub Actions               │
        │   • npm/pnpm packages            │
        │   • Docker base images           │
        └──────────────────────────────────┘
                           │
                           ▼
              ┌────────────────────┐
              │  Update Available? │
              └────────────────────┘
                     │         │
                 No  │         │  Yes
                     ▼         ▼
              ┌──────────┐  ┌────────────────┐
              │   Skip   │  │  Create PR     │
              └──────────┘  │  with Update   │
                            └────────────────┘
                                    │
                                    ▼
                        ┌───────────────────────┐
                        │   Auto-merge Check    │
                        └───────────────────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
              ▼                     ▼                     ▼
        ┌──────────┐          ┌──────────┐        ┌──────────┐
        │  Patch   │          │  Minor   │        │  Major   │
        │ (1.0.0→  │          │ (1.0.0→  │        │ (1.0.0→  │
        │  1.0.1)  │          │  1.1.0)  │        │  2.0.0)  │
        └──────────┘          └──────────┘        └──────────┘
              │                     │                     │
              ▼                     ▼                     ▼
        ┌──────────┐          ┌──────────┐        ┌──────────┐
        │Auto-     │          │Auto-     │        │ Comment  │
        │approve + │          │approve + │        │ Only     │
        │auto-merge│          │auto-merge│        │ (Manual) │
        └──────────┘          └──────────┘        └──────────┘
              │                     │                     │
              └─────────────────────┴─────────────────────┘
                                    │
                                    ▼
                        ┌───────────────────────┐
                        │   CI Must Pass        │
                        │   • Build             │
                        │   • Tests             │
                        │   • Lint              │
                        │   • CodeQL            │
                        │   • A11y              │
                        └───────────────────────┘
                                    │
                                    ▼
                        ┌───────────────────────┐
                        │   Merge to main       │
                        └───────────────────────┘
```

## Issue/PR Lifecycle

```
┌─────────────────────────────────────────────────────────────────────┐
│                    New Issue or PR Created                           │
└─────────────────────────────────────────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────┐
        │      Templates Applied               │
        │   • Bug report                       │
        │   • Feature request                  │
        │   • Security vulnerability           │
        │   • PR template                      │
        └──────────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────┐
        │      Auto-labeling (PRs)             │
        │   • Path-based labels                │
        │   • Size labels (XS/S/M/L/XL)        │
        │   • Module labels                    │
        └──────────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────┐
        │   CODEOWNERS Review Request (PRs)    │
        │   • Security files → @jmenichole     │
        │   • Wallet code → @jmenichole        │
        │   • Infrastructure → @jmenichole     │
        └──────────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────┐
        │        Activity Timeline             │
        │   • Comments                         │
        │   • Reviews                          │
        │   • Updates                          │
        └──────────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
         Active                    Inactive
              │                         │
              ▼                         ▼
      ┌──────────────┐        ┌────────────────┐
      │   Resolved   │        │  60 days pass  │
      │   & Closed   │        │  No activity   │
      └──────────────┘        └────────────────┘
                                      │
                                      ▼
                             ┌────────────────┐
                             │ Marked Stale   │
                             │ (stale label)  │
                             └────────────────┘
                                      │
                        ┌─────────────┴─────────────┐
                        │                           │
                   Activity                    14 days pass
                        │                           │
                        ▼                           ▼
              ┌─────────────────┐         ┌────────────────┐
              │ Remove stale    │         │ Auto-closed    │
              │ label & keep    │         │ with message   │
              │ open            │         │                │
              └─────────────────┘         └────────────────┘
```

## Permission Model

```
┌─────────────────────────────────────────────────────────────────────┐
│                       GITHUB_TOKEN Permissions                       │
│               (Principle of Least Privilege)                         │
└─────────────────────────────────────────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
    ┌─────────┐      ┌─────────┐      ┌─────────┐
    │  Read   │      │  Write  │      │  None   │
    └─────────┘      └─────────┘      └─────────┘
         │                 │                 │
         ▼                 ▼                 ▼
┌───────────────┐  ┌────────────────┐  ┌──────────┐
│ • contents    │  │ • issues       │  │ • admin  │
│ • pull-req    │  │ • pull-req     │  │ • deploy │
│ • security    │  │ • contents*    │  └──────────┘
└───────────────┘  └────────────────┘
                   * Only specific
                     workflows

Examples:
• CI workflow: contents:read
• Stale bot: issues:write, pull-requests:write
• CodeQL: contents:read, security-events:write
• Auto-label: contents:read, pull-requests:write
• Deployment health: contents:read, issues:write
```

## Cost & Resource Usage

```
┌─────────────────────────────────────────────────────────────────────┐
│                   GitHub Free Tier Allocation                        │
│                   2,000 minutes/month                                │
└─────────────────────────────────────────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
    ┌─────────┐      ┌─────────┐      ┌─────────┐
    │ CodeQL  │      │Dependabot│     │  Other  │
    │ ~150min │      │  ~20min  │     │ ~100min │
    └─────────┘      └─────────┘      └─────────┘
         │                 │                 │
         └─────────────────┴─────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │  Total: ~270 min/month │
              │  Remaining: ~1,730 min │
              │  Usage: 13.5%          │
              └────────────────────────┘

Storage Usage (500 MB free):
• Artifacts: ~100 MB/month (auto-cleanup after 30 days)
• Logs: ~50 MB/month
• Total: ~150 MB/month (30% usage)
```

---

## Architecture Principles

1. **Defense in Depth**: Multiple security layers (CodeQL, pnpm audit, Dependabot)
2. **Least Privilege**: Minimal permissions for all workflows
3. **Fail Secure**: Require checks to pass before merge
4. **Automation First**: Reduce manual tasks, increase reliability
5. **Cost Conscious**: Stay within free tier limits
6. **Non-Custodial**: Security checks prevent key storage in code
7. **Modular**: Each workflow is independent and reusable

---

For detailed configuration and setup, see:
- **AUTOMATION-SETUP.md** - Complete setup guide
- **AUTOMATION-REFERENCE.md** - Quick reference
- **USER-ACTION-ITEMS.md** - Step-by-step action items
