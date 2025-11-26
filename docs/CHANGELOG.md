# TiltCheck — Changelog

All notable changes to this repository will be documented here.

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



