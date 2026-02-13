# User Action Items Checklist

This document lists all the steps you need to complete to fully enable the automation suite.

## ✅ What's Already Working

After merging this PR, these features are **immediately active** with no setup required:

- ✅ Dependabot checking for updates (weekly)
- ✅ Issue templates available
- ✅ PR template appears automatically
- ✅ Auto-labeling on all PRs
- ✅ Stale bot running daily
- ✅ CODEOWNERS requesting reviews
- ✅ Security audit running daily
- ✅ Deployment health monitoring (placeholder checks)
- ✅ Automation validation

## ⚠️ Required Setup Steps

Complete these steps to enable full functionality:

### Step 1: Enable CodeQL Security Scanning (Required)

**Why:** CodeQL scans code for security vulnerabilities and is now a required check before merging to main.

**How to do it:**

1. Go to your repository: https://github.com/jmenichole/tiltcheck-monorepo
2. Click **Settings** (in the top navigation)
3. In the left sidebar, click **Code security and analysis**
4. Find the **Code scanning** section
5. Click **Set up** → **Advanced**
6. GitHub will show that the workflow is already configured (`.github/workflows/codeql.yml`)
7. The workflow will automatically start scanning

**Verification:**
- After setup, CodeQL will run on the next push or PR
- Check the **Actions** tab to see it running
- Check the **Security** tab to see scanning results

**Time required:** 2-3 minutes

---

### Step 2: Update Branch Protection to Require CodeQL (Required)

**Why:** This ensures CodeQL must pass before any code can be merged to main.

**How to do it:**

1. Go to your repository: https://github.com/jmenichole/tiltcheck-monorepo
2. Click **Settings**
3. In the left sidebar, click **Rules** → **Rulesets**
4. Find "Protect main branch" and click **Edit**
5. Scroll to the **Require status checks to pass** section
6. In the status checks list, add a new check:
   - Click **Add check**
   - Type: `Analyze Code`
   - Click to add it
7. Ensure these three checks are required:
   - ✅ `components-a11y`
   - ✅ `landing-a11y`
   - ✅ `Analyze Code` (the new one)
8. Click **Save changes** at the bottom

**Alternative method:** The file `branch-protection-ruleset.json` has been updated with the new check. You can reference it when configuring manually.

**Verification:**
- Try creating a PR - it should show "Analyze Code" as a required check
- PRs cannot merge until this check passes

**Time required:** 3-5 minutes

---

## 📋 Recommended Optional Steps

These steps enhance automation but are not required:

### Step 3: Enable Dependabot Auto-merge (Recommended)

**Why:** Allows safe dependency updates (patch/minor versions) to merge automatically after CI passes, saving you time.

**How to do it:**

1. Go to **Settings** → **Pull Requests**
2. Scroll to **Pull Requests**
3. Check the box for **"Allow auto-merge"**
4. Click **Save**

**Behavior:**
- Patch updates (1.0.0 → 1.0.1): Auto-approved and auto-merged
- Minor updates (1.0.0 → 1.1.0): Auto-approved and auto-merged
- Major updates (1.0.0 → 2.0.0): Commented, requires manual review

**Safety:**
- Auto-merge only happens if all required checks pass
- You can still manually review any PR before it merges
- Major versions always require manual review

**Time required:** 1 minute

---

### Step 4: Configure Production Health Checks (Optional - When Ready)

**Why:** Enables real production monitoring with actual health checks instead of placeholders.

**When to do this:** After you have production deployments with health endpoints

**How to do it:**

1. Set up health endpoints in your production services:
   - Discord bot: Add a `/health` endpoint
   - Dashboard: Add a `/health` endpoint
   - Trust rollup: Add a `/health` endpoint

2. Add secrets in GitHub:
   - Go to **Settings** → **Secrets and variables** → **Actions**
   - Click **New repository secret**
   - Add these secrets:
     - `BOT_HEALTH_URL`: e.g., `https://your-bot.example.com`
     - `DASHBOARD_URL`: e.g., `https://dashboard.example.com`
     - `ROLLUP_HEALTH_URL`: e.g., `https://rollup.example.com`

3. Update `.github/workflows/deployment-health.yml`:
   - Replace placeholder health checks with actual curl commands
   - Example:
     ```yaml
     - name: Check Discord Bot Health
       run: curl -f ${{ secrets.BOT_HEALTH_URL }}/health || exit 1
     ```

**Time required:** 10-15 minutes (depends on implementing health endpoints)

---

## 📊 Verification Checklist

After completing the required steps, verify everything is working:

### CodeQL Verification
- [ ] Go to **Security** tab → **Code scanning**
- [ ] Confirm you see "CodeQL" scanning configured
- [ ] Check that scans are running (or scheduled)

### Branch Protection Verification
- [ ] Go to **Settings** → **Rules** → **Rulesets**
- [ ] Open "Protect main branch" ruleset
- [ ] Confirm "Analyze Code" is in required checks list
- [ ] Confirm all three checks are required: components-a11y, landing-a11y, Analyze Code

### Dependabot Verification
- [ ] Go to **Insights** → **Dependency graph** → **Dependabot**
- [ ] Confirm update checks are scheduled
- [ ] You should see "Last checked: X time ago" or "Next check: X time from now"

### Automation Verification
- [ ] Create a test issue - confirm templates appear
- [ ] Create a test PR - confirm template appears
- [ ] Check **Actions** tab - confirm workflows are running
- [ ] Check PR labels - confirm auto-labeling works

---

## 🆘 Troubleshooting

### "I don't see the CodeQL setup option"

**Solution:** 
- Ensure you have admin access to the repository
- CodeQL is available on all public repositories and private repositories with GitHub Advanced Security
- This is a public repository, so it should be available

### "The branch protection rule isn't saving"

**Solution:**
- Ensure you clicked "Save changes" at the bottom
- Ensure the check name is exactly "Analyze Code" (case-sensitive)
- Try refreshing the page and checking again

### "Dependabot isn't creating PRs"

**Solution:**
- Dependabot runs on a weekly schedule (Mondays 3-6 AM UTC)
- Check the Dependabot tab for any errors
- The first run happens after the first scheduled time after setup

### "Workflows aren't running"

**Solution:**
1. Go to **Settings** → **Actions** → **General**
2. Ensure "Allow all actions and reusable workflows" is selected
3. Ensure workflow permissions allow read/write (or appropriate permissions)

---

## 📖 Additional Documentation

- **AUTOMATION-SETUP.md** - Complete detailed setup guide
- **AUTOMATION-REFERENCE.md** - Quick reference for all automations
- **SECURITY.md** - Security policy and vulnerability reporting
- **CONTRIBUTING.md** - Contribution guidelines

---

## 🎯 Quick Start Path

**Minimum time required:** ~5-10 minutes for required steps

1. ✅ Merge this PR (1 minute)
2. ⚠️ Enable CodeQL scanning (2-3 minutes) - **Step 1 above**
3. ⚠️ Add CodeQL to branch protection (3-5 minutes) - **Step 2 above**
4. 📊 Verify everything works (2-3 minutes) - **Use verification checklist above**
5. ✅ Done! 🎉

**With optional features:** ~15-25 minutes

1-4. Same as above
5. 📋 Enable auto-merge (1 minute) - **Step 3 above**
6. 🔧 Configure health checks if ready (10-15 minutes) - **Step 4 above**
7. ✅ Done! 🎉

---

## 💡 Tips

- **Start with required steps:** Get core security features running first
- **Add optional features later:** Enable auto-merge and health checks when you're ready
- **Monitor the Security tab:** This is where all security alerts will appear
- **Review Dependabot PRs:** Even with auto-merge, you can review before they merge
- **Customize as needed:** All config files can be modified to fit your workflow

---

## 🎲 Need Help?

- **Documentation issues:** Open an issue with `documentation` label
- **Automation not working:** Open an issue with `ci/cd` label
- **Security concerns:** Email jme@tiltcheck.me

---

**After setup, all automations will work automatically to keep your repository secure, reliable, and well-maintained!** 🚀
