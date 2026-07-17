# Branch Protection & Required Checks

This repo enforces a lightweight branch protection ruleset on `main` to prevent accidental breakage and keep the UX tight. Below is what each rule does and why it exists in TiltCheck.

## Ruleset Overview

- required_status_checks
  - contexts: `components-a11y`, `landing-a11y`
  - Why: These two checks catch the most likely user-facing regressions.
    - `components-a11y`: Builds and audits our shared web components (bundle, contrast, Pa11y + Lighthouse). Prevents regressions in the building blocks used across views.
    - `landing-a11y`: Audits `services/landing` pages with Pa11y + Lighthouse (a11y-only). Ensures the marketing site remains accessible as copy and styles change.
- pull_request_required
  - Why: No direct pushes to `main`. Guarantees review surface and CI runs on proposed changes.
- deletion
  - Why: Prevents accidental deletion of `main`.
- required_linear_history
  - Why: Enforces a linear history (rebase/squash). Keeps blame and bisect simple; avoids noisy merge commits.
- required_signatures
  - Why: Signed commits improve provenance and basic supply-chain hygiene.
- strict_required_status_checks_policy: false
  - Why: Avoids forced “update branch” churn on busy days. When the repo stabilizes, consider enabling this to require checks on the latest base-merged commit.

## Check Contexts and Where They Come From

These contexts come from GitHub Actions job names in `.github/workflows/ci.yml`:

- `components-a11y`
  - Runs `pnpm audit:all` (component bundle, contrast checks, Pa11y + Lighthouse for components).
  - Uploads `dist/components/` artifacts for quick inspection.
- `landing-a11y`
  - Runs `pnpm a11y:audit:landing` (Pa11y for `index.html` and `about.html`, Lighthouse a11y JSON).
  - Uploads `dist/landing-lighthouse-accessibility.json`.

If you rename a job, update the `context` values in `branch-protection-ruleset.json` to match.

## Updating or Importing the Ruleset

- File: `branch-protection-ruleset.json`
- Apply via GitHub UI or API. If you change job names or add checks, update this file and re-apply the ruleset.

That’s it—tight, visible checks on the parts users touch first, without over-complicating CI.
