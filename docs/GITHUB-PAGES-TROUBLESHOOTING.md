# GitHub Pages Troubleshooting Guide

<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-18 -->

## What GitHub Pages hosts now

Production marketing and docs live on **Railway** at `https://tiltcheck.me` (Next.js `apps/web`, including `/docs`).

GitHub Pages (`gh-pages` branch) is a **static product twin** of tiltcheck.me — same obsidian/teal landing composition, no app runtime:

| Path on Pages | Source |
|---------------|--------|
| `/` | Product landing clone (hero: `House always wins? FUCK THAT.`; CTAs → live `tiltcheck.me/extension` + `/casinos`) |
| `/docs/*.html` | Specs secondary surface from `node scripts/convert-markdown.js` |
| `/styles/base.css` | `scripts/pages-assets/styles/base.css` |
| `/docs-md/*.md` | Raw markdown from `docs/tiltcheck/` |

Asset and nav links are **relative** so project Pages at `https://tiltcheck-me.github.io/tiltcheck-monorepo/` resolve correctly (absolute `/styles/...` breaks under the repo base path). Specs are not in the first viewport — product home only.

Default URL: `https://tiltcheck-me.github.io/tiltcheck-monorepo/` (no custom domain on `gh-pages`).

Workflow: `.github/workflows/pages.yml` — triggers on `docs/tiltcheck/**`, `scripts/convert-markdown.js`, `scripts/pages-assets/**`.

Local build: `pnpm docs:pages`

## Quick Diagnostics

If the GitHub Pages specs site is stale or 404:

### 1. Check GitHub Actions Status

```bash
# In GitHub UI:
# 1. Go to Actions tab
# 2. Look for "Deploy GitHub Pages Specs" workflow
# 3. Check if latest run succeeded (green checkmark)
```

**Expected**: Latest workflow run should be green and recent

### 2. Verify gh-pages Branch

```bash
git fetch origin gh-pages
git log origin/gh-pages -1 --oneline
git show origin/gh-pages:docs/index.html | head -10
```

**Expected**: Recent commit with specs index HTML visible

### 3. Verify Repository Settings (common live-stale cause)

Workflow publishes to the **`gh-pages`** branch. If Pages is pointed at **`main` / (root)** instead, the share URL stays on an old/errored build and will not show the product landing.

1. Go to Repository Settings → Pages
2. Set:
   - **Source**: Deploy from a branch
   - **Branch**: `gh-pages` / `(root)` → Save
   - **Custom domain**: empty (production hostname is not Pages)
3. Wait ~1 minute, hard-refresh `https://tiltcheck-me.github.io/tiltcheck-monorepo/`
4. Confirm hero text: `House always wins? FUCK THAT.`

Check via API (read-only):

```bash
gh api repos/TiltCheck-ME/tiltcheck-monorepo/pages --jq '.source,.status,.html_url'
# expect: branch=gh-pages path=/ status=built|building
```

### 4. Production site (tiltcheck.me) issues

If `tiltcheck.me` is down, check **Railway** deploy (`.github/workflows/deploy-railway.yml`), not GitHub Pages.

## Common Issues and Fixes

### Issue 1: Workflow Not Running

**Symptoms**: No recent workflow runs in Actions tab

**Diagnosis**:
```bash
cat .github/workflows/pages.yml
```

**Fixes**:
1. Enable the workflow in GitHub UI if disabled
2. Push a change under `docs/tiltcheck/`
3. Manually trigger via workflow_dispatch

### Issue 2: Workflow Fails

**Symptoms**: Red X in Actions tab

**Common errors**:
- **Permission denied**: Workflow needs `contents: write`
- **Missing source**: Verify `docs/tiltcheck/` exists

**Fix**: Re-run after fixing the workflow log error.

### Issue 3: Specs out of date on Pages but correct on tiltcheck.me

**Cause**: `tiltcheck.me/docs` reads live markdown via Next.js; Pages mirrors only update when `pages.yml` runs.

**Fix**: Merge spec changes to `main` or manually trigger the Pages workflow.

## Manual local verification

```bash
pnpm docs:pages
npx http-server out -p 4173
# Open http://127.0.0.1:4173/docs/index.html
```

## Checklist before escalating

- [ ] `Deploy GitHub Pages Specs` workflow succeeded on latest `main`
- [ ] `origin/gh-pages` has recent commit
- [ ] `/docs/index.html` exists on `gh-pages`
- [ ] `.nojekyll` present on `gh-pages`
- [ ] No `CNAME` on `gh-pages` pointing at `tiltcheck.me` (conflicts with Railway)

## References

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Troubleshooting GitHub Pages 404s](https://docs.github.com/en/pages/getting-started-with-github-pages/troubleshooting-404-errors-for-github-pages-sites)
