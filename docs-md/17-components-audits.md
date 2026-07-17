# Components + A11y/Contrast Audits

This doc explains the TiltCheck component library and the automated audits wired into CI.

## Components
- Path: `services/dashboard/public/components/`
- Index: `components/index.html` (links to all demo fragments)
- Bundled output (for sharing): `dist/components/`

Current pages (examples):
- `trust-panel.html` – Micro trust dashboard with simulated signals
- `logo.html` – Accessible SVG logo lockup
- `transparency-hero.html` – Landing hero with guarantees
- `ecosystem.html` – Ecosystem hero + /imagine prompt cards
- `degen-trust-engine.html` – Neutral trust model with tilt/behavior/accountability

## Scripts
- `pnpm bundle:components` – Copies + minifies all component HTMLs to `dist/components`.
- `pnpm contrast` – Static color-pair WCAG AA check.
- `pnpm contrast:dom` – jsdom-based contrast audit parsing inline CSS from each component.
- `pnpm a11y:audit` – Bundles, runs DOM contrast, serves `dist/components`, runs Pa11y and Lighthouse (a11y-only).
- `pnpm test:components` – Minimal DOM snapshot + structure checks (update with `UPDATE_SNAPSHOTS=true`).
- `pnpm audit:all` – Convenience runner: test → bundle → contrast → dom-contrast → a11y.

Notes:
- Local runs will use your installed Chrome if found (macOS `/Applications/Google Chrome.app/...`). CI auto-handles Chromium as needed.
- Contrast failures exit non-zero and gate merges via required check (see below).

## CI Required Check
Workflow: `.github/workflows/ci.yml`
- Job: `Components A11y & Contrast` (job id: `components-a11y`)
- Branch protection: mark `components-a11y` as a required status check in GitHub settings.

Artifacts:
- Component bundle: `component-bundle` (artifact) with minified HTMLs
- Lighthouse reports: `dist/components/lighthouse-accessibility.json` and `dist/components/lighthouse-ecosystem-accessibility.json`

## Accessibility Standards
- Contrast targets: normal text ≥ 4.5:1; large text (headings, accents) ≥ 3.0:1.
- SVGs include `<title>`/`<desc>` when they convey meaning.
- Lists use appropriate list semantics (`role=list` / `role=listitem`) in card grids.

## Brand Notes
- Minimal, non-flashy neon: cyan (`#00d4aa`) and alt-blue (`#00a8ff`) on neutral dark surfaces.
- Non-custodial, flat-fee, safety-first messaging.
- No judgmental language; focus on transparency and accountability.
