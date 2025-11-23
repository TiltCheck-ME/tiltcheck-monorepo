# GitHub Automation Setup Guide

This guide provides step-by-step instructions to enable and configure all the automations, workflows, and security features for the TiltCheck monorepo.

## Overview

The following automations have been implemented:

1. **Dependabot** - Automated dependency updates
2. **CodeQL** - Security code scanning
3. **CODEOWNERS** - Automatic code review assignments
4. **Issue Templates** - Standardized issue reporting
5. **PR Template** - Consistent pull request format
6. **Stale Bot** - Automatic cleanup of inactive issues/PRs
7. **Auto-labeling** - Automatic PR labeling based on changes
8. **Deployment Health** - Production monitoring
9. **Dependabot Auto-merge** - Automatic merging of safe dependency updates

## Quick Start

Most automations are **already active** and require no additional setup! The GitHub Actions workflows will run automatically on the next relevant trigger.

## Required Setup Steps

### 1. Update Branch Protection Rules (Required)

The enhanced branch protection ruleset includes a new CodeQL security check.

**Steps to apply:**

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Rules** → **Rulesets**
3. Find the "Protect main branch" ruleset
4. Click **Edit**
5. In the "Status checks" section, ensure these are required:
   - `components-a11y`
   - `landing-a11y`
   - `Analyze Code` (new - CodeQL check)
6. Click **Save changes**

**Alternative: Import from JSON**

You can import the updated ruleset from `branch-protection-ruleset.json`:

```bash
# The file has been updated with the new CodeQL check
cat branch-protection-ruleset.json
```

Then manually apply these settings in the GitHub UI (GitHub doesn't support automatic ruleset imports via API yet).

### 2. Enable CodeQL Scanning (Recommended)

CodeQL is now configured but needs to be enabled in repository settings:

1. Go to **Settings** → **Code security and analysis**
2. Under **Code scanning**, click **Set up** → **Advanced**
3. The workflow `.github/workflows/codeql.yml` is already configured
4. CodeQL will run:
   - On every push to `main`
   - On every pull request
   - Daily at 2 AM UTC
   - Can be triggered manually

**Note:** CodeQL alerts will appear in the **Security** tab.

### 3. Configure Dependabot (Already Active)

Dependabot is configured in `.github/dependabot.yml` and will:

- Check for updates weekly (Mondays)
- Create PRs for dependency updates
- Group related dependencies together
- Auto-label PRs with `dependencies`

**Configuration includes:**
- GitHub Actions updates
- npm/pnpm packages (root and workspaces)
- Docker base images

**To verify it's working:**
1. Go to **Insights** → **Dependency graph** → **Dependabot**
2. You should see scheduled update checks

### 4. Review CODEOWNERS Configuration

The `.github/CODEOWNERS` file automatically requests reviews from `@jmenichole` for:
- Security-sensitive files
- Infrastructure changes
- Discord bot changes
- Trust engine modifications
- Wallet management code

**To customize:**
Edit `.github/CODEOWNERS` to add additional reviewers:

```
# Example: Add a team as reviewer
/apps/discord-bot/ @jmenichole @your-team
```

## Optional Configuration

### 5. Dependabot Auto-merge Settings

The auto-merge workflow (`.github/workflows/dependabot-auto-merge.yml`) will:
- Auto-approve patch and minor updates
- Enable auto-merge for safe updates
- Comment on major updates (manual review required)

**To enable auto-merge:**
1. Go to **Settings** → **General**
2. Scroll to **Pull Requests**
3. Enable **"Allow auto-merge"**

**Security note:** Only patch/minor updates are auto-merged. Major updates always require manual review.

### 6. Configure Secrets for Deployment Health Checks

The deployment health workflow needs endpoints to check. Update `.github/workflows/deployment-health.yml` with your production URLs:

```yaml
- name: Check Discord Bot Health
  run: |
    curl -f ${{ secrets.BOT_HEALTH_URL }}/health || exit 1
```

**Required secrets:**
- `BOT_HEALTH_URL` - Discord bot health endpoint
- `DASHBOARD_URL` - Dashboard URL
- `ROLLUP_HEALTH_URL` - Trust rollup service endpoint

**To add secrets:**
1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add each secret

### 7. Customize Stale Bot Behavior

Edit `.github/workflows/stale.yml` to customize:

```yaml
days-before-stale: 60    # Change to your preference
days-before-close: 14    # Change to your preference
exempt-issue-labels: 'security,pinned,roadmap'  # Add more labels
```

## Automation Features Reference

### Dependabot Configuration
**File:** `.github/dependabot.yml`
- **Schedule:** Weekly (Mondays, 3-6 AM UTC)
- **PR Limit:** 10 for npm, 5 for GitHub Actions, 3 for Docker
- **Grouping:** Dependencies grouped by category
- **Labels:** Auto-labeled with `dependencies`

### CodeQL Security Scanning
**File:** `.github/workflows/codeql.yml`
- **Languages:** JavaScript/TypeScript
- **Triggers:** Push to main, PRs, daily schedule, manual
- **Queries:** Security and quality checks
- **Results:** Visible in Security tab

### Issue Templates
**Location:** `.github/ISSUE_TEMPLATE/`
- `bug_report.yml` - Bug reports with security checklist
- `feature_request.yml` - Feature requests aligned with TiltCheck principles
- `security_vulnerability.yml` - Security issue reporting
- `config.yml` - Template configuration

### PR Template
**File:** `.github/PULL_REQUEST_TEMPLATE.md`
- Comprehensive checklist for changes
- Security verification
- Testing confirmation
- Documentation updates
- Module tracking

### Auto-labeling
**Files:** `.github/workflows/auto-label.yml`, `.github/labeler.yml`
- **Path-based:** Labels by changed files
- **Size-based:** XS/S/M/L/XL based on changes
- **Dependabot:** Auto-labels dependency PRs
- **Categories:** discord-bot, security, testing, documentation, etc.

### Stale Bot
**File:** `.github/workflows/stale.yml`
- **Stale after:** 60 days of inactivity
- **Closed after:** 14 days of being stale
- **Exemptions:** Security, pinned, roadmap issues
- **Messages:** Friendly, degen-appropriate

### Deployment Health
**File:** `.github/workflows/deployment-health.yml`
- **Schedule:** Every 6 hours
- **Checks:** Bot, dashboard, trust rollup
- **Alerts:** Creates issues on failure
- **Status:** Needs endpoint implementation (see step 6)

## Verification Checklist

After setup, verify everything is working:

- [ ] Push a commit to main and verify CodeQL runs
- [ ] Create a test PR and verify auto-labeling works
- [ ] Check that issue templates appear when creating an issue
- [ ] Verify PR template appears when creating a PR
- [ ] Check Dependabot tab shows scheduled checks
- [ ] Review CODEOWNERS is requesting reviews
- [ ] Verify branch protection includes all required checks
- [ ] Test manual workflow triggers work

## Monitoring and Maintenance

### Daily/Weekly Tasks
- **Automated:** Dependabot creates update PRs
- **Automated:** CodeQL scans run daily
- **Automated:** Security audit runs daily
- **Automated:** Stale bot runs daily

### Manual Review Required
- Major dependency updates from Dependabot
- CodeQL security alerts in Security tab
- High/critical vulnerabilities from security audit
- Production health check failures

### GitHub UI Locations

**Code Scanning Results:**
- Security → Code scanning alerts

**Dependabot:**
- Security → Dependabot alerts
- Insights → Dependency graph → Dependabot

**Actions:**
- Actions tab (view all workflow runs)

**Branch Protection:**
- Settings → Rules → Rulesets

## Troubleshooting

### Workflows Not Running

1. Check **Actions** tab is enabled:
   - Settings → Actions → General
   - Enable "Allow all actions and reusable workflows"

2. Verify workflow file syntax:
   ```bash
   # Install act (optional - for local testing)
   # https://github.com/nektos/act
   act -l  # List workflows
   ```

### CodeQL Fails

- Ensure dependencies install correctly
- Check build succeeds
- Review CodeQL logs in Actions tab

### Dependabot Not Creating PRs

1. Check Dependabot tab for errors
2. Verify `dependabot.yml` syntax
3. Ensure directories specified exist

### Auto-merge Not Working

1. Verify "Allow auto-merge" is enabled in Settings
2. Check all required status checks pass
3. Ensure workflow has correct permissions

## Security Best Practices

✅ **Enabled by default:**
- CodeQL security scanning
- Dependabot security updates
- Security audit workflow
- Required code reviews via CODEOWNERS
- Branch protection on main

⚠️ **Requires vigilance:**
- Review all Dependabot PRs before merging
- Monitor Security tab regularly
- Investigate CodeQL alerts promptly
- Keep secrets secure and rotated

🔒 **Security contacts:**
- Critical vulnerabilities: jmenichole.security@proton.me
- General security: Use security issue template

## Cost Considerations

All automations use GitHub's free tier:
- **CodeQL:** Free for public repositories
- **Dependabot:** Free for all repositories
- **GitHub Actions:** 2,000 minutes/month free (private repos)
- **Storage:** 500 MB free for artifacts

**Estimated monthly usage:**
- CodeQL: ~30 runs × 5 mins = 150 minutes
- Dependabot: ~10 PRs × 2 mins = 20 minutes
- Other workflows: ~100 minutes
- **Total:** ~270 minutes/month (well within free tier)

## Next Steps

1. ✅ Complete required setup steps (branch protection, CodeQL)
2. ✅ Configure optional features (auto-merge, health checks)
3. ✅ Monitor the Security tab for any alerts
4. ✅ Review and merge Dependabot PRs as they arrive
5. ✅ Customize automation settings to your preferences

## Getting Help

- **Documentation Issues:** Open an issue with `documentation` label
- **Automation Not Working:** Open an issue with `ci/cd` label
- **Security Concerns:** Email jmenichole.security@proton.me

---

**TiltCheck Automation System**
Built for reliability, security, and peace of mind. 🎲
