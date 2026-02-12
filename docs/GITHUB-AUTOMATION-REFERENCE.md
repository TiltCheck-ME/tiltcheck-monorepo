# Automation Quick Reference

Quick reference for all automation features in the TiltCheck monorepo.

## 🤖 Active Automations

| Automation | Trigger | What It Does | Status |
|------------|---------|--------------|--------|
| **Dependabot** | Weekly (Mon 3-6 AM UTC) | Creates PRs for dependency updates | ✅ Active |
| **CodeQL** | Push, PR, Daily 2 AM UTC | Scans code for security vulnerabilities | ✅ Active |
| **Security Audit** | Daily 12 AM UTC | Runs pnpm audit for vulnerabilities | ✅ Active |
| **Stale Bot** | Daily 1 AM UTC | Marks inactive issues/PRs as stale | ✅ Active |
| **Auto-label** | On PR open/update | Adds labels based on changed files | ✅ Active |
| **Health Check** | Every 6 hours | Monitors production services | ⚠️ Needs endpoints |
| **CI Pipeline** | Push, PR | Builds, tests, lints code | ✅ Active |
| **Deployment** | Push to main | Deploys to production | ✅ Active |
| **Cache Rotate** | Weekly (Mon 3 AM UTC) | Refreshes Docker build cache | ✅ Active |

## 📋 Templates

| Template | Location | Purpose |
|----------|----------|---------|
| Bug Report | `.github/ISSUE_TEMPLATE/bug_report.yml` | Report bugs with security checklist |
| Feature Request | `.github/ISSUE_TEMPLATE/feature_request.yml` | Request new features |
| Security Issue | `.github/ISSUE_TEMPLATE/security_vulnerability.yml` | Report security issues |
| Pull Request | `.github/PULL_REQUEST_TEMPLATE.md` | Standardize PR submissions |

## 🏷️ Automatic Labels

Auto-applied labels based on changed files:

| Label | Triggered By |
|-------|--------------|
| `discord-bot` | Changes in `apps/discord-bot/` |
| `security` | Changes to security files |
| `documentation` | Changes to `*.md` or `docs/` |
| `testing` | Changes to test files |
| `dependencies` | Changes to `package.json`, lockfiles |
| `ci/cd` | Changes to `.github/workflows/` |
| `docker` | Changes to Dockerfiles, docker-compose |
| `size/*` | Based on PR line changes (XS/S/M/L/XL) |

Module-specific labels: `justthetip`, `suslink`, `collectclock`, `freespinscan`, `qualifyfirst`, `trust-engines`, `dashboard`, `landing`

## 🔐 Security Features

### Branch Protection
- ✅ Requires pull requests
- ✅ Required status checks: `components-a11y`, `landing-a11y`, `Analyze Code`
- ✅ Requires linear history
- ✅ Requires signed commits
- ✅ Prevents deletion

### Security Scanning
- **CodeQL:** JavaScript/TypeScript analysis
- **Dependabot:** Automated security updates
- **pnpm audit:** Daily vulnerability checks
- **CODEOWNERS:** Automatic review requests

## 🚀 Workflows at a Glance

### On Every Push to Main
- ✅ CI (build, test, lint)
- ✅ Health check (full)
- ✅ CodeQL scan
- ✅ Deploy bot & dashboard

### On Every Pull Request
- ✅ CI (build, test, lint)
- ✅ Health check (full)
- ✅ CodeQL scan
- ✅ Auto-labeling
- ✅ Components & landing a11y

### Daily Scheduled
- 🌅 12 AM UTC: Security audit
- 🌅 1 AM UTC: Stale bot
- 🌅 2 AM UTC: CodeQL scan
- 🌅 6 AM UTC: Analyzer services

### Weekly Scheduled
- 📅 Monday 3 AM UTC: Cache rotation, Dependabot checks

### Every 6 Hours
- 🔄 Deployment health verification

## 📞 Quick Actions

### Manually Trigger Workflows
```bash
# Via GitHub CLI
gh workflow run codeql.yml
gh workflow run security-audit.yml
gh workflow run deployment-health.yml
```

Or use the Actions tab → Select workflow → "Run workflow"

### Check Dependabot Status
```bash
gh api repos/:owner/:repo/dependabot/alerts
```

Or visit: Settings → Security → Dependabot alerts

### View CodeQL Alerts
Visit: Security tab → Code scanning alerts

## 🎯 Common Scenarios

### "I want to update dependencies"
- **Automated:** Dependabot creates PRs weekly
- **Manual:** `pnpm update` + commit

### "I found a security issue"
- **Critical:** Email jme@tiltcheck.me
- **Low severity:** Use security issue template

### "How do I know if CI passes?"
- Check the ✅ or ❌ next to your commit/PR
- Required checks must pass before merge

### "A workflow is failing"
- Go to Actions tab
- Click the failed workflow
- Review logs for error details
- Fix the issue and push again

### "I want to customize automation"
Edit these files:
- Dependabot: `.github/dependabot.yml`
- Labeler: `.github/labeler.yml`
- Stale bot: `.github/workflows/stale.yml`
- Workflows: `.github/workflows/*.yml`

## 🔧 Configuration Files

| File | Purpose |
|------|---------|
| `.github/dependabot.yml` | Dependency update configuration |
| `.github/CODEOWNERS` | Code review assignments |
| `.github/labeler.yml` | Auto-labeling rules |
| `.github/workflows/*.yml` | CI/CD workflows |
| `branch-protection-ruleset.json` | Branch protection rules |

## 📊 Monitoring

### Where to Check Status
- **Actions:** Actions tab
- **Security:** Security tab
- **Dependabot:** Insights → Dependency graph
- **Branch Protection:** Settings → Rules → Rulesets

### Key Metrics
- Workflow success rate: Actions tab
- Security alerts: Security tab
- Open Dependabot PRs: Pull requests
- Stale issues: Issues with `stale` label

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| Workflow not running | Check Actions are enabled in Settings |
| CodeQL failing | Review logs, check build succeeds |
| Dependabot not creating PRs | Check Dependabot tab for errors |
| Auto-merge not working | Enable in Settings → Pull Requests |
| Label not applied | Check `.github/labeler.yml` matches your changes |

## 📚 Documentation

- **Full Setup Guide:** `AUTOMATION-SETUP.md`
- **Security Policy:** `SECURITY.md`
- **Contributing:** `CONTRIBUTING.md`
- **Repository Docs:** `docs/`

## 🎲 TiltCheck-Specific

### Required Checks Before Merge
1. ✅ `components-a11y` - Component accessibility audit
2. ✅ `landing-a11y` - Landing page accessibility
3. ✅ `Analyze Code` - CodeQL security scan

### Non-Custodial Principle
All security checks ensure:
- No private key storage
- No custodial wallet functionality
- Input validation on addresses
- Safe dependency usage

### Module Independence
Workflows are structured to:
- Test each module independently
- Maintain loose coupling
- Allow parallel development
- Support incremental rollout

---

**For detailed setup instructions, see `AUTOMATION-SETUP.md`**

**For security concerns, see `SECURITY.md`**
