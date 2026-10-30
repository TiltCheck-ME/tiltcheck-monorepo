<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-30 -->

# TiltCheck — Changelog

All notable changes to this repository will be documented here.

Format follows `.github/CHANGELOG_TEMPLATE.md`. `[Unreleased]` is what is on the current branch / next cut. Older entries stay as historical snapshots.

## [Unreleased] — 2026-10-29

### Added

- Degen Lounge v0: one room on game-arena (`/lounge`), presence with game title only, mute/report/rate-limit. Chrome overlay talks to local arena. Typing still does not count as a bet.
- `/touch-grass` is the games hub (Live Trivia + Degens Against Decency). Crisis copy lives on the footer/legal only. Pro overlay iframes `?mode=pause` during the cover.

### Changed

- Homepage job is brakes only: DON'T FEED THE HOUSE → Cooldown, IS THIS CASINO SUS? → `/casinos` trust scores (RTP stays at `/intel/rtp`), extension as a text link. Dopamine line is back under the H1. AutoVault sits below the fold for Stake.us and nuts.gg. Degen Lounge is not on tiltcheck.me. GitHub Pages twin matches. Zip stays gated.
- Primary nav swaps Bonuses for Touch Grass (`/touch-grass`). Lounge plans stay off this site until the lounge is public. `/bonuses` still exists; it is just not a tab.
- Cooldown signs with any installed Solana Wallet Standard wallet except Exodus. Copy says Solana wallet, not Phantom or Solflare. Same lock, not a deposit. Opaque panel stays so glitter does not eat the letters.
- Public copy tells the truth about Core vs Pro: Core is a two-second spin lock; fullscreen Touch Grass (~2 min) is Pro only. Cooldown is first in the tool registry, dual-primary on home, and linked from tools, getting-started, dashboard Safety, and the extension popup.
- Home hero retort is harm reduction made for degens, by degens — tested tools, not a mom lecture. Chrome zip CTA is gated (`ZIP DROPS SOON™`) with a visible reason until the sideload is public.
- Public `tiltcheck.me` is GitHub Pages, not Railway. Pages twin (`scripts/pages-product-data.mjs` + `convert-markdown.js`) ships the gated zip / hero copy. Railway no longer builds or deploys the `web` image.
- Guest Chrome extension popup opens on Guards. Core runs without Discord. Sidebar is no longer sold as the primary interface.
- PR Playwright (`Validate Changed Packages (PR) / E2E Tests`) boots local Next.js on `127.0.0.1:3001` via `PLAYWRIGHT_WEB_LOCAL=1` instead of hitting live `tiltcheck.me` GitHub Pages.
- GitHub Pages builder emits `/login/index.html` so the live twin has a Discord login route instead of a Pages 404.

### Security

- Root `pnpm.overrides` take published HIGH advisory patches (axios, undici, brace-expansion, js-yaml, xmldom, engine.io, and related transitives). `@solana/pay` stays on 0.2.6.
- `pnpm audit:deps` fails only on high/critical findings that have a patched release. Advisories with no patch (`braces`, `extract-zip`, `node-forge`, `http-cache-semantics`) warn and do not fail the job.

### Fixed

- Discord login e2e no longer 404s in PR CI because `/login` is served from the PR's Next.js app, not GitHub Pages.

## [0.2.0] — 2026 Production Hardening & Audit Readiness

### Added

- **2026 Whitepaper:** `docs/whitepaper_2026.md` (Nuking the House Edge via the Degen Audit Layer).
- **Hardening Roadmap:** `docs/ROADMAP_2026.md` (Security, Governance, and Stabilization phases).
- **Strategic Milestones:** `docs/MILESTONES_2026.md` (MVP vs. Institutional RGaaS goals).
- **Surgical HUD Documentation:** "The Lie" vs. "The Truth" data stack specifications.

### Changed

- **Audit Alignment:** Updated system logic to address Zealynx (H-01, M-01) and internal audit (B1-B15) requirements.
- **Mathematical Philosophy:** Integrated "Gambler's Ruin" and "LockVault" mission logic into core documentation.

### Fixed

- **Lint Sanitization:** Resolved formatting and indentation issues across all 2026 documentation.

## [0.1.0] — Initial Commit

### Added

- Complete monorepo structure
- Full `/docs/tiltcheck/` documentation set
- Data models
- APIs
- Trust engines
- Module specs (JustTheTip, SusLink, CollectClock, FreeSpinScan, QualifyFirst)
- Tilt Engine
- Accountability Wallets
- DA&D card game
- Poker module (future optional)
- System diagrams
- Roadmap
- Custom Copilot Agent
- Developer README
- Initial repo scaffolding utilities

### Known TODO

- Implement Event Router
- Implement Discord bot core
- Add Cloudflare Workers deployment scripts
- Add testing framework

## [Future Versions]

Will be added automatically as development progresses.

---

### Actions Workflow (Internal)

```yaml
name: "Docs Sync"

on:
  push:
    paths:
      - "docs/**"
      - ".github/agents/**"
  pull_request:

jobs:
  validate-docs:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Validate Markdown Structure
        run: |
          echo "Checking for zero-length files..."
          find docs -type f -empty && exit 1 || echo "OK"

      - name: Markdown Lint
        uses: articulate/actions-markdownlint@v1
        with:
          files: "docs/**/*.md"
```
