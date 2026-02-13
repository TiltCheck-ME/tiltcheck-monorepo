# GitHub Pages 404 Error - Resolution Guide

## Issue Summary

The tiltcheck.me domain was returning 404 errors despite having proper content deployed to the gh-pages branch.

## Root Cause

The GitHub Pages deployment workflow (`.github/workflows/pages.yml`) had not run since December 8, 2025. While the gh-pages branch contained all necessary files (index.html, CNAME, .nojekyll), the deployment was stale and the site was not accessible.

## Solution

To fix the 404 error, we triggered a new GitHub Pages deployment by:

1. **Modified the pages workflow file** - Added a comment to `.github/workflows/pages.yml` to trigger a new deployment
2. **Workflow will run on merge** - Once this PR is merged to main, the workflow will automatically:
   - Copy files from `services/landing/public/` to the deployment directory
   - Copy documentation from `docs/tiltcheck/` to `out/docs-md/`
   - Deploy to the gh-pages branch
   - Serve the site at tiltcheck.me

## Verification Steps

After merging this PR to main:

1. **Check workflow status**
   - Go to Actions tab in GitHub
   - Look for "Deploy GitHub Pages" workflow
   - Verify it completes successfully

2. **Test the site**
   - Visit https://tiltcheck.me
   - Verify the landing page loads
   - Check that navigation works
   - Test a few key pages:
     - https://tiltcheck.me/about.html
     - https://tiltcheck.me/contact.html
     - https://tiltcheck.me/faq.html

3. **Verify DNS**
   - Ensure CNAME file is present in gh-pages branch
   - Confirm it contains: `tiltcheck.me`

## GitHub Pages Configuration

The site is configured with:
- **Source**: Deploy from gh-pages branch
- **Custom domain**: tiltcheck.me
- **CNAME file**: Present in services/landing/public/CNAME
- **Jekyll**: Disabled (.nojekyll file present)

## Workflow Triggers

The pages workflow runs on:
- **Push to main branch** - Automatic deployment
- **Manual trigger** - Can be triggered via workflow_dispatch

## Troubleshooting

If 404 errors persist after deployment:

### Check GitHub Pages Settings
1. Go to repository Settings
2. Navigate to Pages section
3. Verify:
   - Source: Deploy from branch → gh-pages
   - Custom domain: tiltcheck.me
   - HTTPS enabled

### Check DNS Configuration
The domain tiltcheck.me must have proper DNS records pointing to GitHub Pages:
```
A records:
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153

Or CNAME record:
jmenichole.github.io
```

### Check Deployment Status
```bash
# View recent deployments
git log gh-pages -5 --oneline

# Check latest deployment content
git show gh-pages:index.html | head -20

# Verify CNAME
git show gh-pages:CNAME
```

### Manual Workflow Trigger
If needed, trigger the workflow manually:
1. Go to Actions tab
2. Click "Deploy GitHub Pages"
3. Click "Run workflow"
4. Select main branch
5. Click "Run workflow"

## Prevention

To prevent future 404 issues:

1. **Monitor deployments** - Check Actions tab periodically
2. **Test after changes** - Visit site after pushing to main
3. **Keep CNAME updated** - Ensure CNAME file remains in place
4. **Verify workflow** - Ensure pages.yml workflow is enabled

## Related Files

- `.github/workflows/pages.yml` - Deployment workflow
- `services/landing/public/CNAME` - Domain configuration
- `services/landing/public/.nojekyll` - Disable Jekyll processing
- `services/landing/public/index.html` - Landing page

## Additional Notes

- The gh-pages branch is auto-managed by the workflow
- Do not manually edit the gh-pages branch
- All content changes should be made in services/landing/public/
- The workflow uses rsync to copy files, preserving structure

## Timeline

- **Dec 8, 2025**: Last successful deployment before issue
- **Dec 14, 2025**: Issue identified and fix implemented
- **Next deployment**: Will occur when PR is merged to main
