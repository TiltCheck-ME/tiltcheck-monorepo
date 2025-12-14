# GitHub Pages Troubleshooting Guide

## Quick Diagnostics

If tiltcheck.me is showing 404 errors, run through this checklist:

### 1. Check GitHub Actions Status

```bash
# In GitHub UI:
# 1. Go to Actions tab
# 2. Look for "Deploy GitHub Pages" workflow
# 3. Check if latest run succeeded (green checkmark)
```

**Expected**: Latest workflow run should be green and recent

### 2. Verify gh-pages Branch

```bash
git fetch origin gh-pages:gh-pages
git log gh-pages -1 --oneline
git show gh-pages:index.html | head -10
```

**Expected**: Recent commit with index.html content visible

### 3. Check CNAME Configuration

```bash
git show gh-pages:CNAME
```

**Expected output**: `tiltcheck.me`

### 4. Verify Repository Settings

1. Go to Repository Settings
2. Navigate to Pages section
3. Check:
   - **Source**: Deploy from branch → gh-pages
   - **Branch**: gh-pages, / (root)
   - **Custom domain**: tiltcheck.me
   - **Enforce HTTPS**: ✓ Enabled

### 5. DNS Status

Check if DNS is properly configured:
```bash
dig tiltcheck.me +short
nslookup tiltcheck.me
```

**Expected**: Should return GitHub Pages IP addresses:
- 185.199.108.153
- 185.199.109.153
- 185.199.110.153
- 185.199.111.153

Or CNAME pointing to: `jmenichole.github.io`

## Common Issues and Fixes

### Issue 1: Workflow Not Running

**Symptoms**: No recent workflow runs in Actions tab

**Diagnosis**:
```bash
# Check if workflow file exists
cat .github/workflows/pages.yml

# Check if workflow is enabled
# Go to Actions tab → Select "Deploy GitHub Pages" → Check if disabled
```

**Fixes**:
1. Enable the workflow in GitHub UI if disabled
2. Push a small change to main branch to trigger it
3. Manually trigger via workflow_dispatch

### Issue 2: Workflow Fails

**Symptoms**: Red X in Actions tab

**Diagnosis**: Click on failed workflow run to see error logs

**Common errors**:
- **Permission denied**: Check workflow has `contents: write` permission
- **Missing files**: Verify `services/landing/public/` exists and has content
- **rsync error**: Check rsync command syntax in workflow

**Fixes**:
1. Update workflow permissions in `.github/workflows/pages.yml`
2. Verify source directory exists
3. Check workflow syntax

### Issue 3: DNS Not Resolving

**Symptoms**: Domain doesn't resolve or points to wrong IP

**Diagnosis**:
```bash
dig tiltcheck.me
whois tiltcheck.me
```

**Fixes**:
1. Update DNS records at your domain registrar
2. Add A records pointing to GitHub Pages IPs
3. Wait for DNS propagation (up to 24-48 hours)
4. Clear local DNS cache:
   - Mac: `sudo dscacheutil -flushcache`
   - Windows: `ipconfig /flushdns`
   - Linux: `sudo systemd-resolve --flush-caches`

### Issue 4: CNAME Missing or Wrong

**Symptoms**: Site works at jmenichole.github.io but not tiltcheck.me

**Diagnosis**:
```bash
git show gh-pages:CNAME
```

**Fixes**:
1. Ensure CNAME file exists in `services/landing/public/`
2. Verify it contains exactly: `tiltcheck.me` (no http://, no trailing slash)
3. Re-run deployment workflow

### Issue 5: Jekyll Processing Issues

**Symptoms**: Some files or directories not appearing

**Diagnosis**:
```bash
git show gh-pages:.nojekyll
```

**Fixes**:
1. Ensure `.nojekyll` file exists in `services/landing/public/`
2. File should be empty or contain a single newline
3. Re-run deployment workflow

### Issue 6: Stale Deployment

**Symptoms**: Old content showing, changes not visible

**Diagnosis**:
```bash
# Check last deployment time
git log gh-pages -1 --format="%ai %s"

# Compare with main branch
git log main -1 --format="%ai %s"
```

**Fixes**:
1. Trigger new deployment:
   ```bash
   # Option 1: Push to main
   git commit --allow-empty -m "Trigger pages deployment"
   git push origin main
   
   # Option 2: Manual trigger in GitHub UI
   # Actions → Deploy GitHub Pages → Run workflow
   ```

2. Clear browser cache:
   - Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
   - Clear cache in browser settings

## Manual Deployment

If automatic deployment fails, you can manually deploy:

```bash
# 1. Checkout main branch
git checkout main

# 2. Create out directory
mkdir -p out

# 3. Copy landing page files
rsync -av --delete services/landing/public/ out/

# 4. Copy documentation
mkdir -p out/docs-md
rsync -av docs/tiltcheck/ out/docs-md/

# 5. Ensure CNAME is present
if [ -f services/landing/public/CNAME ]; then 
  cp services/landing/public/CNAME out/CNAME
fi

# 6. Deploy to gh-pages
git checkout --orphan gh-pages-new
git rm -rf .
mv out/* .
rmdir out
git add .
git commit -m "Manual deployment $(date -u +%Y-%m-%d)"
git push -f origin gh-pages-new:gh-pages
git checkout main
git branch -D gh-pages-new
```

## Verification Checklist

After applying fixes:

- [ ] Workflow runs and completes successfully
- [ ] gh-pages branch updated with recent commit
- [ ] CNAME file present in gh-pages
- [ ] .nojekyll file present in gh-pages
- [ ] index.html loads at https://tiltcheck.me
- [ ] Other pages accessible (about, contact, etc.)
- [ ] DNS resolves correctly
- [ ] No mixed content warnings
- [ ] HTTPS works properly

## When to Escalate

Contact GitHub Support if:
- DNS is correct but site still shows 404 after 48 hours
- Workflow succeeds but deployment doesn't update
- Custom domain verification fails
- HTTPS certificate issues persist
- Multiple deployments fail with unclear errors

## Additional Resources

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Custom Domain Configuration](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)
- [Troubleshooting GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/troubleshooting-404-errors-for-github-pages-sites)
- [GitHub Pages Status](https://www.githubstatus.com/)

## Support Contacts

- **Repository Owner**: jmenichole
- **GitHub Support**: https://support.github.com/
- **Domain Registrar**: Check with your DNS provider

## Log Collection

When reporting issues, include:

```bash
# Workflow logs
# Download from Actions tab in GitHub

# DNS information
dig tiltcheck.me +trace > dns-trace.txt

# Repository status
git --no-pager log gh-pages -5 --oneline > gh-pages-log.txt
git --no-pager show gh-pages:CNAME > cname-content.txt
ls -la services/landing/public/ > public-files.txt

# Include these files when seeking help
```

---

**Last Updated**: December 14, 2025  
**Document Version**: 1.0
